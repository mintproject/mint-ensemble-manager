import {
    Component,
    ComponentSeed,
    ComponentDataBindings,
    ComponentParameterBindings,
    ComponentParameterTypes
} from "../localex/local-execution-types";
import {
    Thread,
    Execution,
    MintPreferences,
    ModelIO,
    DataResource,
    InputBindings,
    Model
} from "../mint/mint-types";
import Queue from "bull";
import { EXECUTION_QUEUE_NAME, REDIS_URL } from "../../config/redis";
import { Region } from "../mint/mint-types";
import fs from "fs-extra";
import request from "request";
import { getConfiguration } from "../mint/mint-functions";
import { getInputDatasets } from "./helpers";

const prefs = getConfiguration();
const executionQueueBull = new Queue(EXECUTION_QUEUE_NAME, REDIS_URL);
executionQueueBull.process(prefs.localex.parallelism, __dirname + "/executionKubernetes.js");

// Create Jobs (Seeds) and Queue them
export const queueModelExecutionsKubernetes = async (
    thread: Thread,
    modelid: string,
    component: Component,
    region: Region,
    executions: Execution[],
    prefs: MintPreferences
): Promise<Queue.Job<any>[]> => {
    const registered_resources: any = {};
    const model = thread.models[modelid];
    const thread_model_id = thread.model_ensembles[modelid].id;
    const seeds = createSeedsExecution(executions, model, registered_resources, region, component);
    await downloadInputsFile(registered_resources, prefs);
    return submitSeedToExecution(seeds, prefs, thread, thread_model_id);
};

function submitSeedToExecution(
    seeds: ComponentSeed[],
    prefs: MintPreferences,
    thread: Thread,
    thread_model_id: string
) {
    const numseeds = seeds.length;
    const priority =
        numseeds < 10 ? 1 : numseeds < 50 ? 2 : numseeds < 200 ? 3 : numseeds < 500 ? 4 : 5;

    return Promise.all(
        seeds.map((seed) =>
            executionQueueBull.add(
                {
                    seed: seed,
                    prefs: prefs.localex,
                    thread_id: thread.id,
                    thread_model_id: thread_model_id
                },
                {
                    priority: priority
                }
            )
        )
    );
}

async function downloadInputsFile(registered_resources: any, prefs: MintPreferences) {
    const downloadInputPromises = [];
    for (const resid in registered_resources) {
        const args = registered_resources[resid];
        const inputpath = prefs.localex.datadir + "/" + args[0];
        const inputurl = args[2];
        if (!fs.existsSync(inputpath))
            downloadInputPromises.push(_downloadFile(inputurl, inputpath));
    }

    // Download all datasets
    if (downloadInputPromises.length > 0) await Promise.all(downloadInputPromises);
}

function createSeedsExecution(
    executions: Execution[],
    model: Model,
    registered_resources: any,
    region: Region,
    component: Component
) {
    return executions.map((execution) => {
        const bindings = execution.bindings;
        const datasets = getInputDatasets(model, bindings, registered_resources);
        const { parameters, parameterTypes } = getInputParameters(model, bindings, region);
        return {
            component: component,
            execution: execution,
            datasets: datasets,
            parameters: parameters,
            paramtypes: parameterTypes
        } as ComponentSeed;
    });
}

function getInputParameters(model: Model, bindings: InputBindings, region: Region) {
    const parameters: ComponentParameterBindings = {};
    const parameterTypes: ComponentParameterTypes = {};
    model.input_parameters.map((ip) => {
        if (ip.value) {
            parameters[ip.id] = ip.value.toString();
        } else if (bindings[ip.id]) {
            const value = bindings[ip.id];
            parameters[ip.id] = value.toString();
        }
        // HACK: Replace region geojson
        if (parameters[ip.id].match(/__region_geojson:(.+)/)) {
            const region_geojson = _getRegionGeoJson(region);
            parameters[ip.id] = region_geojson;
        }

        parameterTypes[ip.id] = ip.type;
    });
    return { parameters, parameterTypes };
}

const _getRegionGeoJson = (region: Region) => {
    const geojson = { type: "FeatureCollection", features: [] };
    region.geometries.map((geom) => {
        const feature = { type: "Feature", geometry: geom };
        geojson["features"].push(feature);
    });
    return JSON.stringify(geojson);
};

const _downloadFile = (url: string, filepath: string): Promise<void> => {
    const file = fs.createWriteStream(filepath);
    return new Promise<void>((resolve, reject) => {
        request.get(url).on("response", (res) => {
            res.pipe(file);
            res.on("end", function () {
                resolve();
            });
        });
    });
};
