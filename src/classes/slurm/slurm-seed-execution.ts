import os from "os";
import fs from "fs-extra";
import { Md5 } from "ts-md5";
import child_process from "child_process";
import { setExecutions, incrementThreadModelSubmittedRuns, incrementThreadModelSuccessfulRuns, incrementThreadModelFailedRuns, updateExecutionStatusAndResults } from "../graphql/graphql_functions";
import { Component, ComponentSeed, ComponentArgument } from "./slurm-execution-types";
import { Container } from "dockerode";
import { DEVMODE } from "../../config/app";
import { SlurmExecutionPreferences, DataResource, DateRange, Execution } from "../mint/mint-types";

let SLURM_QUEUE = "development";

module.exports = async (job: any) => {
    function sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    } 
    
    let slurm: SlurmExecutionPreferences = job.data.prefs;
    let thread_model_id: string = job.data.thread_model_id;
    let modelid: string = job.data.model_id;
    let seeds: ComponentSeed[] = job.data.seeds;
    let modelname = modelid.replace(/.*\//, '');

    let error = null;
    let inputdir = slurm.datadir;
    let outputdir = slurm.datadir;

    // Get work directory
    let workdir = slurm.workdir;
    if(!workdir) 
        workdir = process.env.SCRATCH;
    if(!workdir)
        slurm.codedir + "/../run";

    // Create temporary directory
    let tmpprefix = slurm.workdir + "/" + modelname;
    let tempdir = fs.mkdtempSync(tmpprefix);

    // Create jobs for all the seeds
    let jobs = [];

    let numSubmission = 0;
    
    seeds.forEach((seed) => {
        let seedtempdir = fs.mkdtempSync(tempdir + "/temp");

        // Only increment submitted runs if this isn't a retry
        if(seed.execution.status != "FAILURE")
            numSubmission += 1;

        seed.execution.start_time = new Date();
        seed.execution.execution_engine = "slurm";

        let comp: Component = seed.component;

        // Copy component run directory to tempdir
        if (!fs.existsSync(seedtempdir + "/" + comp.rundir.replace(/.*\//, '')))
            fs.copySync(comp.rundir, seedtempdir);

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
                    let newifile = seedtempdir + "/" + ds.name;
                    if(!fs.existsSync(newifile)) {
                        fs.symlinkSync(ifile, newifile);
                        //fs.copyFileSync(ifile, newifile);
                    }
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

        /*
        let logstream = fs.createWriteStream(logstdout);
        logstream.write("current working directory: " + tempdir + "\n");
        logstream.write(command + " " + args.join(" ") + "\n");
        logstream.close();
        */

        // Check if this component requires a docker image via the model definition
        // - or via the older pegasus job properties file

        let softwareImage = comp.softwareImage;
        let statusCode = 0;
        if (softwareImage != null) {
            let argstr = command + " " + args.join(" ")
            let fullcmd = `cd ${seedtempdir} && singularity exec docker://${softwareImage} ${argstr}`;

            jobs.push({
                seed: seed,
                command: fullcmd,
                logfile: logstdout,
                jobdir: seedtempdir,
                results: results
            })
        }
    });

    let slurmfile = tempdir + "/slurm.sh";
    let jobsfile = tempdir + "/jobs.sh";
    
    let slurmfd = fs.createWriteStream(slurmfile);
    slurmfd.write("#!/bin/bash\n\n");
    slurmfd.write(`#SBATCH -o ${modelname}.%j.out\n`);
    slurmfd.write(`#SBATCH -e ${modelname}.%j.err\n`);
    // Queue Name needs to come from a config file
    slurmfd.write(`#SBATCH -p ${SLURM_QUEUE}\n`);
    slurmfd.write(`#SBATCH -J launcher\n`); 
    // This information need to come from the model            
    slurmfd.write("#SBATCH -N 1\n");
    slurmfd.write("#SBATCH -n 1\n");
    slurmfd.write("#SBATCH -t 00:10:00\n");

    slurmfd.write("\nmodule load tacc-singularity\n");
    slurmfd.write("module load launcher\n");
    slurmfd.write(`export LAUNCHER_PPN=${slurm.numcores}\n`);
    slurmfd.write(`export LAUNCHER_WORKDIR=${tempdir}\n`);
    slurmfd.write(`export LAUNCHER_JOB_FILE=${jobsfile}\n`);

    slurmfd.write(`\n$LAUNCHER_DIR/paramrun\n`);
    slurmfd.close();

    let jobsfd = fs.createWriteStream(jobsfile);
    jobs.forEach((job) => {
        jobsfd.write(`${job.command} >> ${job.logfile}\n`);
    })
    jobsfd.close();
    
    // Wait a second before calling sbatch, otherwise the above file appears empty sometimes
    await sleep(1000);
            
    // Call slurm batch command
    let jobId = null;
    let spawnResult = child_process.spawnSync("sbatch", [slurmfile], { cwd: tempdir });
    String(spawnResult.stdout).split("\n").forEach((spawnStr) => {
        let arr = spawnStr.match(/"Submitted batch job (\d+)"/);
        if(arr) {
            jobId = arr[1];
        }
    });

    if(!jobId) {
        return Promise.reject(new Error("Could not submit job: "+ String(spawnResult.stdout)));
    }

    incrementThreadModelSubmittedRuns(thread_model_id, numSubmission);
    
    // Poll and wait for the job to finish
    let jobDone = false;
    while (!jobDone) {
        let queueResult = child_process.spawnSync("squeue", ["-j", jobId]);
        let lines = String(queueResult.stdout).split("\n");
        if (lines.length > 1) {
            let arr = lines[1].match(/"^\s*(\d+)\s*"/);
            if(arr) {
                if(arr[1] == jobId) {
                    // Still ongoing
                    jobDone = false;
                }
            }
        }
        else {
            jobDone = true;
            break;
        }
        await sleep(30000); // Wait 30 seconds between checks
    }

    if(jobDone) {
        let numSuccessful = 0;
        let numFailed = 0;
        let successfulExecutions = [];

        jobs.forEach((job) => {
            let seed = job.seed;
            let results = job.results;
            let jobdir = job.jobdir;
            Object.values(results).map((result: DataResource) => {
                var tmpfile = jobdir + "/" + result.name;
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

            // Set the execution status
            seed.execution.status = "SUCCESS";    
            seed.execution.end_time = new Date();
            seed.execution.run_progress = 1;
            if(error) {
                seed.execution.status = "FAILURE";
                numFailed += 1;
            }
            else {
                numSuccessful += 1;
                successfulExecutions.push(seed.execution);
            }
        
            // Remove temporary job directory
            fs.remove(jobdir);
        
            // Update execution status and results in backend
            if(!DEVMODE) {
                updateExecutionStatusAndResults(seed.execution);
            }
        });
        // Return job execution or error
        if(numSuccessful > 0) {
            if(!DEVMODE)
                incrementThreadModelSuccessfulRuns(thread_model_id, numSuccessful);
            
        }
        if(numFailed > 0) {
            if(!DEVMODE)
                incrementThreadModelFailedRuns(thread_model_id, numFailed);
        }       
        return Promise.resolve(successfulExecutions);
    }
}