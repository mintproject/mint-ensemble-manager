import { Component, ComponentSeed } from "../localex/local-execution-types";
import { Thread, Execution, MintPreferences, Model } from "../mint/mint-types";
import Queue from "bull";
import { EXECUTION_QUEUE_NAME, REDIS_URL } from "../../config/redis";
import { Region } from "../mint/mint-types";
import { getConfiguration } from "../mint/mint-functions";
import {
    getInputsParameters,
    getInputDatasets,
    getResourcesFromSeeds,
    downloadInputsFile
} from "./helpers";

const prefs = getConfiguration();
const executionQueueBull = new Queue(EXECUTION_QUEUE_NAME, REDIS_URL);
executionQueueBull.process(prefs.localex.parallelism, __dirname + "/executionTapis.js");

// Create Jobs (Seeds) and Queue them
export const queueModelExecutions = async (
    thread: Thread,
    modelid: string,
    component: Component,
    region: Region,
    executions: Execution[],
    prefs: MintPreferences
): Promise<Queue.Job<any>[]> => {
    const model = thread.models[modelid];
    const thread_model_id = thread.model_ensembles[modelid].id;
    const seeds = createSeedsExecution(executions, model, region, component);
    const resources = getResourcesFromSeeds(seeds);
    await downloadInputsFile(resources, prefs);
    return submitSeedToExecutionEngine(seeds, prefs, thread, thread_model_id);
};

function submitSeedToExecutionEngine(
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

function createSeedsExecution(
    executions: Execution[],
    model: Model,
    region: Region,
    component: Component
) {
    return executions.map((execution) => {
        const bindings = execution.bindings;
        const datasets = getInputDatasets(model, bindings);
        const { parameters, parameterTypes } = getInputsParameters(model, bindings, region);
        return {
            component: component,
            execution: execution,
            datasets: datasets,
            parameters: parameters,
            paramtypes: parameterTypes
        } as ComponentSeed;
    });
}
