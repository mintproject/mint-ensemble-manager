import { Thread, Execution, Model } from "../mint/mint-types";
import { Region } from "../mint/mint-types";
import { getConfiguration } from "../mint/mint-functions";
import { getInputsParameters, getInputDatasets } from "./helpers";
import login from "./api/authenticator/login";
import { createJobRequest } from "./adapters/jobs";
import detail from "./api/apps/detail";
import submit from "./api/jobs/submit";
import { Jobs } from "@tapis/tapis-typescript";
import subscribe from "./api/jobs/subscribe";
import { TapisComponent, TapisComponentSeed } from "./typing";

const prefs = getConfiguration();
const username = prefs.tapis.username;
const password = process.env.TAPIS_PASSWORD;
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
    const seeds = createSeedsExecution(executions, model, region, component);
    const token = await getTapisToken();
    const { result: app } = await getTapisApp(component.appId, component.appVersion, token);
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

async function getTapisApp(tapisAppId: string, tapisAppVersion: string, token) {
    return await detail(
        { appId: tapisAppId, appVersion: tapisAppVersion },
        basePath,
        token.access_token
    );
}

export async function getTapisToken() {
    console.log("Getting Tapis Token", username, basePath);
    const { result } = await login(username, password, basePath);
    const token = result.access_token;
    return { token, basePath };
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
