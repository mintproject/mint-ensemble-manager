import { Component, ComponentSeed } from "../localex/local-execution-types";
import { Thread, Execution, Model } from "../mint/mint-types";
import { Region } from "../mint/mint-types";
import { getConfiguration } from "../mint/mint-functions";
import { getInputsParameters, getInputDatasets } from "./helpers";
import login from "./api/authenticator/login";
import { createJobRequest } from "./adapters/jobs";
import detail from "./api/apps/detail";
import submit from "./api/jobs/submit";
import { Jobs } from "@tapis/tapis-typescript";

const prefs = getConfiguration();
const username = prefs.tapis.username;
const password = process.env.TAPIS_PASSWORD;
const basePath = prefs.tapis.basePath;

// Create Jobs (Seeds) and Queue them
export const queueModelExecutions = async (
    thread: Thread,
    modelid: string,
    component: Component,
    region: Region,
    executions: Execution[]
): Promise<Jobs.RespSubmitJob[]> => {
    const model = thread.models[modelid];
    const seeds = createSeedsExecution(executions, model, region, component);
    const tapisAppId = "modflow-2005";
    const tapisAppVersion = "0.0.6";
    const token = await getTapisToken();
    const { result: app } = await getTapisApp(tapisAppId, tapisAppVersion, token);
    const jobs = seeds.map((seed) => createJobRequest(app, seed, model));
    return await Promise.all(jobs.map(async (job) => await submitTapisJob(job, token)));
};

async function submitTapisJob(request: Jobs.ReqSubmitJob, token) {
    console.log("Submitting job: ", request);
    const response = await submit(request, basePath, token.access_token);
    return response;
}

async function getTapisApp(tapisAppId: string, tapisAppVersion: string, token) {
    return await detail(
        { appId: tapisAppId, appVersion: tapisAppVersion },
        basePath,
        token.access_token
    );
}

async function getTapisToken() {
    const { result } = await login(username, password, basePath);
    const token = result.access_token;
    return token;
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
