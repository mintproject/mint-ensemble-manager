import {
    deleteThreadModelExecutionIds,
    getExecutionHash,
    getModelInputBindings,
    getModelInputConfigurations,
    getRegionDetails,
    incrementThreadModelSubmittedRuns,
    incrementThreadModelSuccessfulRuns,
    listSuccessfulExecutionIds,
    setExecutions,
    setThreadModelExecutionIds,
    setThreadModelExecutionSummary
} from "../graphql/graphql_functions";
import { loadModelWCM } from "../localex/local-execution-functions";
import {
    Execution,
    ExecutionSummary,
    MintPreferences,
    Model,
    Region,
    Thread,
    ThreadModelMap
} from "../mint/mint-types";

export const saveAndRunExecutionsKubernetes = async (
    thread: Thread,
    modelid: string,
    prefs: MintPreferences
) => {
    for (const pmodelid in thread.model_ensembles) {
        if (!modelid || modelid == pmodelid) {
            return await saveAndRunExecutionsModel(pmodelid, thread, prefs);
        }
    }
    console.log("Finished sending all executions for local execution");
    return true;
};

const batchSize = 500; // Store executions in the database in batches
export const saveAndRunExecutionsModel = async (
    modelid: string,
    thread: Thread,
    prefs: MintPreferences
) => {
    try {
        if (!thread.execution_summary) thread.execution_summary = {};

        const model = thread.models[modelid];
        const thread_model_id = thread.model_ensembles[modelid].id;
        const thread_region = await getRegionDetails(thread.regionid);
        const execution_details = getModelInputBindings(model, thread, thread_region);
        const threadModel = execution_details[0] as ThreadModelMap;
        const inputIds = execution_details[1] as string[];

        // This is the part that creates all different run configurations
        // - Cross product of all input collections
        // - TODO: Change to allow flexibility
        const configs = getModelInputConfigurations(threadModel, inputIds);

        // const datadir = prefs.localex.datadir;

        // if (!fs.existsSync(datadir)) fs.mkdirsSync(datadir);
        if (configs !== null)
            await createExecutions(
                configs,
                thread_model_id,
                model,
                prefs,
                inputIds,
                modelid,
                thread,
                thread_region
            );
        return true;
    } catch (e) {
        console.log(e);
    }
    return false;
};

async function createExecutions(
    configs: any[][],
    thread_model_id: string,
    model: Model,
    prefs: MintPreferences,
    inputIds: string[],
    modelid: string,
    thread: Thread,
    thread_region: Region
) {
    // Create the thread model execution summary
    await createThreadModelExecutionSummary(configs, thread_model_id);
    // Delete existing thread execution ids
    await deleteThreadModelExecutionIds(thread_model_id);
    // Load the component model
    const component = await loadModelWCM(model.code_url, model, prefs);

    // Create executions in batches
    for (let i = 0; i < configs.length; i += batchSize) {
        const bindings = configs.slice(i, i + batchSize);

        // Create executions for this batch
        const executionsBatch: Execution[] = createExecutionsBatch(bindings, inputIds, modelid);
        const executionIdsBatch = executionsBatch.map((e) => e.id);

        // Fetch only successful executions
        const successful_execution_ids: string[] =
            await listSuccessfulExecutionIds(executionIdsBatch);
        const executions_to_be_run = executionsBatch.filter(
            (e) => successful_execution_ids.indexOf(e.id) < 0
        );

        // Create Executions and Thread Model Mappings to those executions
        await setExecutions(executions_to_be_run, thread_model_id);
        await setThreadModelExecutionIds(thread_model_id, executionIdsBatch);
        await updateSuccessfulExecutionOnThread(successful_execution_ids, thread_model_id);

        // // Queue the model executions
        // queueModelExecutionsLocally(
        //     thread,
        //     modelid,
        //     component,
        //     thread_region,
        //     executions_to_be_run,
        //     prefs
        // );
    }
    console.log("Finished submitting all executions for model: " + modelid);
}

async function updateSuccessfulExecutionOnThread(
    successful_execution_ids: string[],
    thread_model_id: string
) {
    const num_already_run = successful_execution_ids.length;
    if (num_already_run > 0) {
        await incrementThreadModelSubmittedRuns(thread_model_id, num_already_run);
        await incrementThreadModelSuccessfulRuns(thread_model_id, num_already_run);
    }
}

async function createThreadModelExecutionSummary(configs: any[][], thread_model_id: string) {
    const summary = {
        total_runs: configs.length,
        submitted_runs: 0,
        failed_runs: 0,
        successful_runs: 0,
        workflow_name: "", // No workflow. Local execution
        submitted_for_execution: true,
        submission_time: new Date()
    } as ExecutionSummary;
    await setThreadModelExecutionSummary(thread_model_id, summary);
}

function createExecutionsBatch(bindings: any[][], inputIds: string[], modelid: string) {
    const executions: Execution[] = [];
    bindings.map((binding) => {
        const inputBindings: any = {};
        for (let j = 0; j < inputIds.length; j++) {
            inputBindings[inputIds[j]] = binding[j];
        }
        const execution = createExecutionMetadata(modelid, inputBindings);
        executions.push(execution);
    });
    return executions;
}

function createExecutionMetadata(modelid: string, inputBindings: any) {
    const execution = {
        modelid: modelid,
        bindings: inputBindings,
        execution_engine: "localex",
        runid: null,
        status: null,
        results: {},
        start_time: new Date(),
        selected: true
    } as Execution;
    execution.id = getExecutionHash(execution);
    return execution;
}
