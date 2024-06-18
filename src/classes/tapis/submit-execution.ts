import { Thread, Execution, Model } from "../mint/mint-types";
import { Region } from "../mint/mint-types";
import { getInputsParameters, getInputDatasets } from "./helpers";
import { createJobRequest } from "./adapters/jobs";
import submit from "./api/jobs/submit";
import { Jobs } from "@tapis/tapis-typescript";
import subscribe from "./api/jobs/subscribe";
import { TapisComponent, TapisComponentSeed } from "./typing";
import { getTapisToken } from "./authenticator";
import { getTapisApp } from "./apps";
import { getConfiguration } from "../mint/mint-functions";

const prefs = getConfiguration();
const basePath = prefs.tapis.basePath;

// Create Jobs (Seeds) and Queue them
export const queueModelExecutions = async (
    thread: Thread,
    modelid: string,
    component: TapisComponent,
    region: Region,
    executions: Execution[]
): Promise<Jobs.RespSubmitJob[]> => {
    const model = thread.models[modelid];
    if (model === undefined) {
        throw new Error(`Model ${modelid} not found in thread`);
    }
    const seeds = createSeedsExecution(executions, model, region, component);
    const { token, basePath } = await getTapisToken();
    const { result: app } = await getTapisApp(
        component.id,
        component.version,
        token.access_token,
        basePath
    );

    const jobs = seeds.map((seed) => createJobRequest(app, seed, model));
    return await Promise.all(
        jobs.map(async (job) => {
            const jobSubmission = await submitTapisJob(job, token);
            await subscribeTapisJob(jobSubmission.result.uuid, token);
            return jobSubmission;
        })
    );
};

const generateWebHookUrl = (jobUuid: string) => {
    return `${prefs.ensemble_manager_api}/tapis/jobs/${jobUuid}`;
};

async function subscribeTapisJob(jobUuid: string, token) {
    const notifDeliveryTarget: Jobs.NotifDeliveryTarget = {
        deliveryMethod: Jobs.NotifDeliveryTargetDeliveryMethodEnum.Webhook,
        deliveryAddress: generateWebHookUrl(jobUuid)
    };

    const request: Jobs.ReqSubscribe = {
        description: "Test subscription",
        enabled: true,
        eventCategoryFilter: Jobs.ReqSubscribeEventCategoryFilterEnum.JobNewStatus,
        deliveryTargets: [notifDeliveryTarget]
        // ttlminutes: 60,
    };
    const response = await subscribe(request, basePath, jobUuid, token.access_token);
    return response;
}

async function submitTapisJob(request: Jobs.ReqSubmitJob, token) {
    const response = await submit(request, basePath, token.access_token);
    return response;
}

function createSeedsExecution(
    executions: Execution[],
    model: Model,
    region: Region,
    component: TapisComponent
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
        } as TapisComponentSeed;
    });
}
