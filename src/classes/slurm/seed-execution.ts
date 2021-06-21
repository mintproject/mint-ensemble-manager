import os from "os";
import fs from "fs-extra";
import { Md5 } from "ts-md5";
import child_process from "child_process";
import { setExecutions, incrementThreadModelSubmittedRuns, incrementThreadModelSuccessfulRuns, incrementThreadModelFailedRuns, updateExecutionStatusAndResults } from "../graphql/graphql_functions";
import { Component, ComponentSeed, ComponentArgument } from "./slurm-execution-types";
import { Container } from "dockerode";
import { DEVMODE } from "../../config/app";
import { SlurmExecutionPreferences, DataResource, DateRange } from "../mint/mint-types";

let SLURM_QUEUE = "development";

module.exports = async (job: any) => {
    function sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    } 
    
    // Run the model seed (model config + bindings)
    var seed: ComponentSeed = job.data.seed;
    var slurm: SlurmExecutionPreferences = job.data.prefs;
    var thread_model_id: string = job.data.thread_model_id;

    // Only increment submitted runs if this isn't a retry
    if(seed.execution.status != "FAILURE")
        incrementThreadModelSubmittedRuns(thread_model_id);

    seed.execution.start_time = new Date();

    let error = null;
    let comp : Component = seed.component;
    let inputdir = slurm.datadir;
    let outputdir = slurm.datadir;

    // Create temporary directory
    let ostmp = os.tmpdir();
    let tmpprefix = ostmp + "/" + seed.execution.modelid.replace(/.*\//, '');
    let tempdir = fs.mkdtempSync(tmpprefix);

    try {
        // Copy component run directory to tempdir
        fs.copySync(comp.rundir, tempdir);

        // Set the execution engine used for this execution
        seed.execution.execution_engine = "slurm";

        // Data/Parameter arguments to the script (will be setup below)        
        let args: string[] = [];
        let plainargs: string[] = [];

        // Default invocation is via Bash
        let command = "bash";

        // The entry point of the component (run script)
        args.push("./run");

        // Set the Input file/parameter arguments for the command
        let time_period : DateRange = null;
        let spatial_coverage : any = null;
        comp.inputs.map((input: ComponentArgument) => {
            args.push(input.prefix);
            plainargs.push(input.prefix);
            if (input.isParam) {
                //let paramtype = seed.paramtypes[input.id];
                let paramvalue = seed.parameters[input.id];
                if (!paramvalue)
                    paramvalue = input.paramDefaultValue;
                args.push(paramvalue);
                plainargs.push(paramvalue);
            }
            else {
                let datasets = seed.datasets[input.id];
                datasets.map((ds: DataResource) => {
                    // Copy input files to tempdir
                    let ifile = inputdir + "/" + ds.name;
                    let newifile = tempdir + "/" + ds.name;
                    fs.symlinkSync(ifile, newifile);
                    //fs.copyFileSync(ifile, newifile);
                    args.push(ds.name)
                    plainargs.push(ds.name);

                    // Copy over spatio-temporal metadata from inputs
                    if(ds.time_period)
                        time_period = ds.time_period;
                    if(ds.spatial_coverage)
                        spatial_coverage = ds.spatial_coverage;
                });
            }
        })
        
        // Set the output file arguments for the command
        // Create the output file suffix based on a hash of inputs
        let opsuffix = "-" + Md5.hashAsciiStr(seed.execution.modelid + plainargs.join());
        let results: any = {};
        comp.outputs.map((output: ComponentArgument) => {
            args.push(output.prefix);
            let opid = output.id + opsuffix;
            let opfilename = output.role + opsuffix;
            if(output.format) {
                opfilename += "." + output.format;
            }
            let opfilepath = outputdir + "/" + opfilename;
            args.push(opfilename);
            let opfileurl = opfilepath.replace(slurm.datadir, slurm.dataurl);
            results[output.id] = {
                id: opid,
                name: opfilename,
                url: opfileurl,
                time_period: time_period ?? {},
                spatial_coverage: spatial_coverage
            } as DataResource
        });

        let logstdout = slurm.logdir + "/" + seed.execution.id + ".log";

        let logstream = fs.createWriteStream(logstdout);
        logstream.write("current working directory: " + tempdir + "\n");
        logstream.write(command + " " + args.join(" ") + "\n");
        logstream.close();

        // Check if this component requires a docker image via the model definition
        // - or via the older pegasus job properties file

        let softwareImage = comp.softwareImage;
        let statusCode = 0;
        if (softwareImage != null) {
            let argstr = command + " " + args.join(" ")

            let slurmfile = tempdir + "/" + seed.execution.id + ".sh";
            let slurmfd = fs.createWriteStream(slurmfile);
            slurmfd.write("#!/bin/bash\n\n");
            slurmfd.write(`#SBATCH -o ${logstdout}\n`);

            // Queue Name needs to come from a config file
            slurmfd.write(`#SBATCH -p ${SLURM_QUEUE}\n`);
            slurmfd.write(`#SBATCH -J mint-${seed.execution.id}\n`);            

            // This information need to come from the model            
            slurmfd.write("#SBATCH -N 1\n");
            slurmfd.write("#SBATCH -n 1\n");
            slurmfd.write("#SBATCH -t 00:10:00\n");

            slurmfd.write("\nmodule load tacc-singularity\n");
            slurmfd.write(`\nsingularity exec docker://${softwareImage} ${argstr}\n`);
            slurmfd.close();
            
            // Call slurm batch command
            let jobId = null;
            let spawnResult = child_process.spawnSync("sbatch", [slurmfile]);
            for(let spawnStr in spawnResult.stdout.split("\n")) {
                let arr = spawnStr.match(/"Submitted batch job (\d+)"/);
                if(arr) {
                    jobId = arr[1];
                }
            }

            if(jobId) {
                // Poll and Check for job finishing
                let jobDone = false;
                while (!jobDone) {
                    let queueResult = child_process.spawnSync("squeue", ["-j", jobId]);
                    let lines = queueResult.stdout.split("\n");
                    if (lines.length > 1) {
                        let arr = lines[1].match(/"^\s*(\d+)\s*"/);
                        if(arr) {
                            if(arr[1] == jobId) {
                                // Still ongoing
                                jobDone = false;
                                continue;
                            }
                        }
                    }
                    else {
                        jobDone = true;
                        break;
                    }
                    sleep(10000);
                }
                
            }
        }

        // Check for Errors
        if(statusCode != 0) {
            error = "Execution returned with non-zero status code";
        }
        else {
            // Check results (output files)
            // - Copy output files from tempdir to output dir
            // - Mark an error if any output file is missing
            Object.values(results).map((result: DataResource) => {
                var tmpfile = tempdir + "/" + result.name;
                if (fs.existsSync(tmpfile)) {
                    let opfilepath = outputdir + "/" + result.name;
                    fs.copyFileSync(tmpfile, opfilepath);
                }
                else {
                    //console.log(`${tmpfile} not found!`)
                    error = `${tmpfile} not found!`;
                }
            });
            // Set the results
            seed.execution.results = results;
        }
    }
    catch(e) {
        error = e + "";
    }

    // Set the execution status
    seed.execution.status = "SUCCESS";    
    seed.execution.end_time = new Date();
    seed.execution.run_progress = 1;
    if(error) {
        seed.execution.status = "FAILURE";
    }

    // Remove temporary directory
    fs.remove(tempdir);

    // Update execution status and results in backend
    if(!DEVMODE) {
        updateExecutionStatusAndResults(seed.execution);
    }

    // Return job execution or error
    if(seed.execution.status == "SUCCESS") {
        if(!DEVMODE)
            incrementThreadModelSuccessfulRuns(thread_model_id);
        return Promise.resolve(seed.execution);
    }
    else {
        if(!DEVMODE)
            incrementThreadModelFailedRuns(thread_model_id);
        return Promise.reject(new Error(error));
    }

}