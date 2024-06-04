import {
    Thread,
    ProblemStatement,
    Task,
    Dataset,
    ExecutionSummary,
    Region,
    Dataslice,
    DataMap,
    IdMap,
    ProblemStatementEvent,
    TaskEvent,
    MintPreferences
} from "../../../classes/mint/mint-types";
import { fetchModelFromCatalog } from "../../../classes/mint/model-catalog-functions";
import { queryDatasetDetails } from "../../../classes/mint/data-catalog-functions";
import {
    addProblemStatement,
    addTask,
    addThread,
    getProblemStatement,
    getRegionDetails,
    getTask,
    getThread,
    getTotalConfigurations,
    setThreadData,
    setThreadModels,
    setThreadParameters
} from "../../../classes/graphql/graphql_functions";
import { getCreateEvent, uuidv4 } from "../../../classes/graphql/graphql_adapter";
import { fetchMintConfig } from "../../../classes/mint/mint-functions";
import { ModelConfigurationSetup } from "@mintproject/modelcatalog_client";
import { KeycloakAdapter } from "../../../config/keycloak-adapter";
import { createResponse } from "./util";
import { NewModelThread, ThreadResponse } from "../../../schema/openapi";

// ./api-v1/services/threadsService.js

function flatten(array) {
    if (array.length == 0) return array;
    else if (Array.isArray(array[0])) return flatten(array[0]).concat(flatten(array.slice(1)));
    else return [array[0]].concat(flatten(array.slice(1)));
}

const createProblemStatement = async (newModelThread: NewModelThread) => {
    const prob_desc = newModelThread.problem_statement;
    if (prob_desc.id) {
        return await getProblemStatement(prob_desc.id);
    }
    const prob: ProblemStatement = {
        name: prob_desc.name,
        regionid: prob_desc.regionid,
        dates: {
            start_date: new Date(prob_desc.time_period.from),
            end_date: new Date(prob_desc.time_period.to)
        },
        tasks: {},
        events: [getCreateEvent("Problem Statement from API") as ProblemStatementEvent],
        permissions: [{ read: true, write: true, execute: true, owner: false, userid: "*" }]
    };
    prob.id = await addProblemStatement(prob);
    return prob;
};

const createOrGetThread = async (modelThreadRequest: NewModelThread, task: Task) => {
    const threadRequest = modelThreadRequest.thread;
    const thread_name = threadRequest.name ? threadRequest.name : null;
    const thread_notes = "Added thread from API";

    const thread = {
        name: thread_name,
        task_id: task.id,
        dates: task.dates,
        driving_variables: task.driving_variables,
        response_variables: task.response_variables,
        model_ensembles: {},
        models: {},
        execution_summary: {},
        events: [getCreateEvent(thread_notes)],
        permissions: [{ read: true, write: true, execute: true, owner: false, userid: "*" }]
    } as Thread;

    // Store Thread (no data or models yet)
    thread.id = await addThread(task, thread);
    return thread;
};

const createOrGetTask = async (
    newModelThread: NewModelThread,
    problemStatement: ProblemStatement
) => {
    const taskRequest = newModelThread.task;
    const time_period = taskRequest.time_period
        ? taskRequest.time_period
        : newModelThread.problem_statement.time_period;
    if (taskRequest.id) return await getTask(taskRequest.id);
    const task: Task = {
        name: taskRequest.name,
        regionid: taskRequest.regionid,
        problem_statement_id: problemStatement.id,
        response_variables: [taskRequest.indicatorid],
        driving_variables: taskRequest.interventionid ? [taskRequest.interventionid] : [],
        dates: {
            start_date: new Date(time_period.from),
            end_date: new Date(time_period.to)
        },
        events: [getCreateEvent("Task from API") as TaskEvent],
        permissions: [{ read: true, write: true, execute: true, owner: false, userid: "*" }]
    };
    task.id = await addTask(problemStatement, task);
    return task;
};

const queryAndSetDataThread = async (
    threadUpdated: Thread,
    model: ModelConfigurationSetup,
    threadRequest: ThreadResponse,
    region: Region,
    mint_prefs: MintPreferences
) => {
    const data: DataMap = {};
    const model_ensembles = threadUpdated.model_ensembles;

    // Fetch dataset details from the Data Catalog
    for (let i = 0; i < model.hasInput.length; i++) {
        const input_file = model.hasInput[i];
        if (!input_file.hasFixedResource || input_file.hasFixedResource.length == 0) {
            // Only bind model inputs that don't have a fixed value defined
            let datasetids = threadRequest.datasets[input_file.label[0]];
            if (datasetids) {
                model_ensembles[model.id].bindings[input_file.id] = [];

                if (!(datasetids instanceof Array)) datasetids = [datasetids];
                for (let j = 0; j < datasetids.length; j++) {
                    const dsid = datasetids[j];
                    const variables_arr = input_file.hasPresentation.map((pres) => {
                        if (pres.hasStandardVariable)
                            return pres.hasStandardVariable.map((sv) => sv.label);
                    });
                    let variables = flatten(variables_arr);
                    variables = variables.filter((v) => v);
                    const dataset: Dataset = await queryDatasetDetails(
                        model.id,
                        input_file.id,
                        variables,
                        dsid,
                        threadUpdated.dates,
                        region,
                        mint_prefs
                    );
                    const sliceid = uuidv4();
                    const dataslice = {
                        id: sliceid,
                        total_resources: dataset.resources.length,
                        selected_resources: dataset.resources.filter((res) => res.selected).length,
                        resources: dataset.resources,
                        time_period: threadUpdated.dates,
                        name: dataset.name,
                        dataset: dataset,
                        resources_loaded: dataset.resources_loaded
                    } as Dataslice;
                    data[sliceid] = dataslice;
                    model_ensembles[model.id].bindings[input_file.id].push(sliceid!);
                }
            }
        }
    }

    return await setThreadData(data, model_ensembles, "Setting thread data via API", threadUpdated);
};
const threadsService = {
    async createThread(modelThreadRequesst: NewModelThread) {
        const mint_prefs = await fetchMintConfig();
        //Request body
        const threadRequest = modelThreadRequesst.thread;
        KeycloakAdapter.signIn(mint_prefs.graphql.username, mint_prefs.graphql.password);
        // Create Problem Statement if needed
        const problemStatement = await createProblemStatement(modelThreadRequesst);
        // Create Task if needed
        const task = await createOrGetTask(modelThreadRequesst, problemStatement);
        // Create Thread
        const thread = await createOrGetThread(modelThreadRequesst, task);
        // Fetch region details
        const region: Region = await getRegionDetails(task.regionid);

        /*
        Set Thread Model
        */
        const model: ModelConfigurationSetup = await fetchModelFromCatalog(
            task.response_variables,
            [],
            modelThreadRequesst.thread.modelid,
            mint_prefs
        );
        await setThreadModels([model], "Added models", thread);

        const threadUpdated = await getThread(thread.id);
        /*
        Set Thread Data
        */
        const data: DataMap = {};
        const model_ensembles = thread.model_ensembles;

        queryAndSetDataThread(threadUpdated, model, threadRequest, region, mint_prefs);

        // Set Thread Parameters
        const execution_summary: IdMap<ExecutionSummary> = {};
        for (let i = 0; i < model.hasParameter.length; i++) {
            const input_parameter = model.hasParameter[i];
            if (!input_parameter.hasFixedValue || input_parameter.hasFixedValue.length == 0) {
                let value = threadRequest.parameters[input_parameter.label[0]];
                if (!value) value = input_parameter.hasDefaultValue[0];
                if (!(value instanceof Array)) value = [value];
                model_ensembles[model.id].bindings[input_parameter.id] = value;
            }
        }
        // Get total number of configs to run
        const totalconfigs = getTotalConfigurations(
            model,
            model_ensembles[model.id].bindings,
            data
        );
        execution_summary[model.id] = {
            total_runs: totalconfigs,
            submitted_runs: 0,
            failed_runs: 0,
            successful_runs: 0
        } as ExecutionSummary;

        await setThreadParameters(
            model_ensembles,
            execution_summary,
            "Setting thread parameters via API",
            thread
        );

        // Return details of newly created thread
        const modelthread = {
            problem_statement_id: problemStatement.id,
            task_id: task.id,
            thread_id: thread.id
        };
        return createResponse("success", JSON.stringify(modelthread));
    }
};

export default threadsService;
