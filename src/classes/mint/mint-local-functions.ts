import { Pathway, Model, DataEnsembleMap, Scenario, MintPreferences, ExecutableEnsembleSummary, ExecutableEnsemble, Output } from "./mint-types";
import { getModelInputEnsembles, getModelInputConfigurations, deleteAllPathwayEnsembleIds, setPathwayEnsembleIds, getEnsembleHash, successfulEnsembleIds, getAllPathwayEnsembleIds, listEnsembles, updatePathwayEnsembles, updatePathway, setPathwayEnsembles, deletePathwayEnsembles, updatePathwayExecutionSummary } from "./firebase-functions";
import { runModelEnsemblesLocally, loadModelWCM, getModelCacheDirectory } from "../localex/local-execution-functions";

import fs from "fs-extra";
import archiver from "archiver";
import path from "path";
import Queue from "bull";
import { MONITOR_QUEUE_NAME, REDIS_URL } from "../../config/redis";
import { monitorThread } from "../localex/thread-execution-monitor";
import { DEVMODE } from "../../config/app";
let monitorQueue = new Queue(MONITOR_QUEUE_NAME, REDIS_URL);
monitorQueue.process((job) => monitorThread(job));

export const saveAndRunExecutableEnsemblesLocally = async (
    pathway: Pathway,
    scenario: Scenario,
    modelid: string,
    prefs: MintPreferences) => {

    for (let pmodelid in pathway.model_ensembles) {
        if (!modelid || (modelid == pmodelid)) {
            await saveAndRunExecutableEnsemblesForModelLocally(pmodelid, pathway, scenario, prefs);
            if (!DEVMODE) {
                monitorQueue.add({ scenario_id: scenario.id, pathway_id: pathway.id, model_id: modelid }, {
                    delay: 1000 * 30 // 30 seconds delay before monitoring for the first time
                });
            }
        }
    }
    console.log("Finished sending all ensembles for local execution. Adding Monitor");
}

export const saveAndRunExecutableEnsemblesForModelLocally = async (modelid: string,
    pathway: Pathway,
    scenario: Scenario,
    prefs: MintPreferences) => {
    if (!pathway.executable_ensemble_summary)
        pathway.executable_ensemble_summary = {};

    let model = pathway.models[modelid];

    let ensemble_details = getModelInputEnsembles(model, pathway);
    let dataEnsemble = ensemble_details[0] as DataEnsembleMap;
    let inputIds = ensemble_details[1] as string[];

    // This is the part that creates all different run configurations
    // - Cross product of all input collections
    // - TODO: Change to allow flexibility
    let configs = getModelInputConfigurations(dataEnsemble, inputIds);

    if (configs != null) {
        /*
            Pre-Run Setup
        */

        // Setup some book-keeping to help in searching for results
        let summary = {
            total_runs: configs.length,
            submitted_runs: 0,
            failed_runs: 0,
            successful_runs: 0,
            workflow_name: "", // No workflow. Local execution
            submitted_for_execution: true,
            submission_time: Date.now() - 20000 // Less 20 seconds to counter for clock skews
        } as ExecutableEnsembleSummary

        if (!DEVMODE)
            await updatePathwayExecutionSummary(scenario.id, pathway.id, modelid, summary);

        // Load the component model
        let component = await loadModelWCM(model.wcm_uri, model, prefs);

        // Delete existing pathway ensemble ids (*NOT DELETING GLOBAL ENSEMBLE DOCUMENTS .. Only clearing list of the pathway's ensemble ids)
        if (!DEVMODE)
            await deleteAllPathwayEnsembleIds(scenario.id, pathway.id, modelid);

        // Work in batches
        let batchSize = 500; // Deal with ensembles from firebase in this batch size
        let batchid = 0;

        // Create ensembles in batches
        for (let i = 0; i < configs.length; i += batchSize) {
            let bindings = configs.slice(i, i + batchSize);

            let ensembles: ExecutableEnsemble[] = [];
            let ensembleids: string[] = [];

            // Create ensembles for this batch
            bindings.map((binding) => {
                let inputBindings: any = {};
                for (let j = 0; j < inputIds.length; j++) {
                    inputBindings[inputIds[j]] = binding[j];
                }
                //console.log(inputBindings);
                let ensemble = {
                    modelid: modelid,
                    bindings: inputBindings,
                    execution_engine: "localex",
                    runid: null,
                    status: null,
                    results: {},
                    submission_time: Date.now(),
                    selected: true
                } as ExecutableEnsemble;
                ensemble.id = getEnsembleHash(ensemble);

                ensembleids.push(ensemble.id);
                ensembles.push(ensemble);
            })

            if (!DEVMODE)
                setPathwayEnsembleIds(scenario.id, pathway.id, model.id, batchid, ensembleids);

            // Check if any current ensembles already exist 
            // - Note: ensemble ids are uniquely defined by the model id and inputs
            let all_ensembles: ExecutableEnsemble[] = DEVMODE ? [] : await listEnsembles(ensembleids);
            let successful_ensemble_ids = all_ensembles
                .filter((e) => (e != null && e.status == "SUCCESS"))
                .map((e) => e.id);

            let ensembles_to_be_run = ensembles.filter((e) => successful_ensemble_ids.indexOf(e.id) < 0);

            // Clear out the pathway ensembles to be empty
            if (!DEVMODE)
                await setPathwayEnsembles(ensembles_to_be_run);

            summary.submitted_runs += ensembles.length;
            summary.successful_runs += successful_ensemble_ids.length;
            if (!DEVMODE)
                updatePathwayExecutionSummary(scenario.id, pathway.id, modelid, summary);

            // Run the model ensembles
            runModelEnsemblesLocally(pathway, component, ensembles_to_be_run, scenario.id, prefs);

            batchid++;

        }
    }
    console.log("Finished submitting all executions for model: " + modelid);
}

export const deleteExecutableCacheLocally = async (
    pathway: Pathway,
    scenario: Scenario,
    modelid: string,
    prefs: MintPreferences) => {

    for (let pmodelid in pathway.model_ensembles) {
        if (!modelid || (modelid == pmodelid))
            await deleteExecutableCacheForModelLocally(pmodelid, pathway, scenario, prefs);
    }
    console.log("Finished deleting all execution cache for local execution");

    //monitorAllEnsembles(pathway, scenario, prefs);
}

export const deleteModelInputCacheLocally = (
    pathway: Pathway,
    modelid: string,
    prefs: MintPreferences) => {

    // Delete the selected datasets
    for (let dsid in pathway.datasets) {
        let ds = pathway.datasets[dsid];
        ds.resources.map((res) => {
            let file = prefs.localex.datadir + "/" + res.name;
            if (fs.existsSync(file)) {
                fs.remove(file)
            }
        })
    }

    // Also delete any model setup hardcoded input datasets
    let model = pathway.models[modelid];
    model.input_files.map((io) => {
        if (io.value) {
            // There is a hardcoded value in the model itself
            let resources = io.value.resources;
            if (resources.length > 0) {
                let type = io.type.replace(/^.*#/, '');
                resources.map((res) => {
                    if (res.url) {
                        let filename = res.url.replace(/^.*(#|\/)/, '');
                        filename = filename.replace(/^([0-9])/, '_$1');
                        let file = prefs.localex.datadir + "/" + filename;
                        if (fs.existsSync(file)) {
                            fs.remove(file)
                        }
                    }
                })
            }
        }
    });

}

export const deleteExecutableCacheForModelLocally = async (modelid: string,
    pathway: Pathway,
    scenario: Scenario,
    prefs: MintPreferences) => {

    let model = pathway.models[modelid];
    let all_ensemble_ids = await getAllPathwayEnsembleIds(scenario.id, pathway.id, modelid);

    // Delete existing pathway ensemble ids (*NOT DELETING GLOBAL ENSEMBLE DOCUMENTS .. Only clearing list of the pathway's ensemble ids)
    deleteAllPathwayEnsembleIds(scenario.id, pathway.id, modelid);

    // Work in batches
    let batchSize = 500; // Deal with ensembles from firebase in this batch size

    // Process ensembles in batches
    for (let i = 0; i < all_ensemble_ids.length; i += batchSize) {
        let ensembleids = all_ensemble_ids.slice(i, i + batchSize);

        // Delete the actual ensemble documents
        deletePathwayEnsembles(ensembleids);
    }

    // Delete cached model directory and zip file
    let modeldir = getModelCacheDirectory(model.wcm_uri, prefs);
    if (modeldir != null) {
        fs.remove(modeldir);
        fs.remove(modeldir + ".zip");
    }

    deleteModelInputCacheLocally(pathway, modelid, prefs);

    // Remove all executable information and update the pathway
    let summary = pathway.executable_ensemble_summary[modelid];
    summary.successful_runs = 0;
    summary.failed_runs = 0;
    summary.submitted_runs = 0;
    summary.submission_time = 0;
    summary.submitted_for_execution = false;

    await updatePathwayExecutionSummary(scenario.id, pathway.id, modelid, summary);
}

export const compress_ensemble_files = async (ensembleids: string[]) => {
    let all_ensembles = await listEnsembles(ensembleids);
    const results = all_ensembles.map(ensemble => {
        return ensemble.results
    })
    console.dir(results);
}

export const hernanTeQuiero = (outputPaths: string[], zipFileName: string) : boolean => {
    return true
}
// export const compressFiles = (outputPaths: string[], zipFileName: string) : Promise<void> => {
//     const compressDirectory = "/tmp/"
//     var output = fs.createWriteStream(compressDirectory + zipFileName);
//     var archive = archiver('zip', {
//         zlib: { level: 9 } // Sets the compression level.
//     });

//     archive.pipe(output);
//     output.on('close', function () {
//         console.log(archive.pointer() + ' total bytes');
//         console.log('archiver has been finalized and the output file descriptor has closed.');
//     });

//     output.on('end', function () {
//         console.log('Data has been drained');
//     });

//     archive.on('warning', function (err) {
//         if (err.code === 'ENOENT') {
//             // log warning
//         } else {
//             // throw error
//             throw err;
//         }
//     });

//     outputPaths.map(outputPath => {
//         archive.append(fs.createReadStream(outputPath), { name: path.basename(outputPath) });
//     })
//     return archive.finalize();
// }



/*
[
  {
    'calibration-output': {
      id: 'calibration-output',
      location: '/data/storage/mint/data-catalog/production/local-execution/calibration-output-a57b3e939d44f633f9bc2cc52e68ba50',
      name: 'calibration-output-a57b3e939d44f633f9bc2cc52e68ba50',
      url: 'https://data.mint.isi.edu/files/local-execution/calibration-output-a57b3e939d44f633f9bc2cc52e68ba50'
    },
    'economic-land-use': {
      name: 'economic-land-use-a57b3e939d44f633f9bc2cc52e68ba50',
      location: '/data/storage/mint/data-catalog/production/local-execution/economic-land-use-a57b3e939d44f633f9bc2cc52e68ba50',
      url: 'https://data.mint.isi.edu/files/local-execution/economic-land-use-a57b3e939d44f633f9bc2cc52e68ba50',
      id: 'economic-land-use'
    }
  },
  {
    cycles_soilProfile: {
      id: 'cycles_soilProfile',
      name: 'cycles_soilProfile-2c63648e703dabbed57542d40748a7fd',
      url: 'https://data.mint.isi.edu/files/local-execution/cycles_soilProfile-2c63648e703dabbed57542d40748a7fd',
      location: '/data/storage/mint/data-catalog/production/local-execution/cycles_soilProfile-2c63648e703dabbed57542d40748a7fd'
    },
    cycles_som: {
      location: '/data/storage/mint/data-catalog/production/local-execution/cycles_som-2c63648e703dabbed57542d40748a7fd',
      name: 'cycles_som-2c63648e703dabbed57542d40748a7fd',
      id: 'cycles_som',
      url: 'https://data.mint.isi.edu/files/local-execution/cycles_som-2c63648e703dabbed57542d40748a7fd'
    },
    cycles_nitrogen: {
      location: '/data/storage/mint/data-catalog/production/local-execution/cycles_nitrogen-2c63648e703dabbed57542d40748a7fd',
      url: 'https://data.mint.isi.edu/files/local-execution/cycles_nitrogen-2c63648e703dabbed57542d40748a7fd',
      id: 'cycles_nitrogen',
      name: 'cycles_nitrogen-2c63648e703dabbed57542d40748a7fd'
    },
    cycles_summary: {
      location: '/data/storage/mint/data-catalog/production/local-execution/cycles_summary-2c63648e703dabbed57542d40748a7fd',
      url: 'https://data.mint.isi.edu/files/local-execution/cycles_summary-2c63648e703dabbed57542d40748a7fd',
      id: 'cycles_summary',
      name: 'cycles_summary-2c63648e703dabbed57542d40748a7fd'
    },
    cycles_season: {
      id: 'cycles_season',
      name: 'cycles_season-2c63648e703dabbed57542d40748a7fd',
      url: 'https://data.mint.isi.edu/files/local-execution/cycles_season-2c63648e703dabbed57542d40748a7fd',
      location: '/data/storage/mint/data-catalog/production/local-execution/cycles_season-2c63648e703dabbed57542d40748a7fd'
    },
    cycles_water: {
      name: 'cycles_water-2c63648e703dabbed57542d40748a7fd',
      location: '/data/storage/mint/data-catalog/production/local-execution/cycles_water-2c63648e703dabbed57542d40748a7fd',
      url: 'https://data.mint.isi.edu/files/local-execution/cycles_water-2c63648e703dabbed57542d40748a7fd',
      id: 'cycles_water'
    },
    cycles_crop: {
      location: '/data/storage/mint/data-catalog/production/local-execution/cycles_crop-2c63648e703dabbed57542d40748a7fd',
      name: 'cycles_crop-2c63648e703dabbed57542d40748a7fd',
      url: 'https://data.mint.isi.edu/files/local-execution/cycles_crop-2c63648e703dabbed57542d40748a7fd',
      id: 'cycles_crop'
    },
    cycles_outputs: {
      location: '/data/storage/mint/data-catalog/production/local-execution/cycles_outputs-2c63648e703dabbed57542d40748a7fd',
      name: 'cycles_outputs-2c63648e703dabbed57542d40748a7fd',
      id: 'cycles_outputs',
      url: 'https://data.mint.isi.edu/files/local-execution/cycles_outputs-2c63648e703dabbed57542d40748a7fd'
    },
    cycles_weatherOutput: {
      location: '/data/storage/mint/data-catalog/production/local-execution/cycles_weatherOutput-2c63648e703dabbed57542d40748a7fd',
      id: 'cycles_weatherOutput',
      url: 'https://data.mint.isi.edu/files/local-execution/cycles_weatherOutput-2c63648e703dabbed57542d40748a7fd',
      name: 'cycles_weatherOutput-2c63648e703dabbed57542d40748a7fd'
    }
  }
]
*/