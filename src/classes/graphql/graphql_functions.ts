import {
    Execution,
    Execution_Result,
    Thread,
    Model,
    ModelIOBindings,
    DataResource,
    ProblemStatement,
    Task,
    ThreadModelMap,
    ProblemStatementInfo,
    ThreadInfo,
    DataMap,
    ModelEnsembleMap,
    IdMap,
    Region,
    BoundingBox,
    ModelOutput,
    ExecutionSummary
} from "@/classes/mint/mint-types";
import { ModelConfigurationSetup } from "@mintproject/modelcatalog_client";

import { GraphQL } from "../../config/graphql";

import getProblemStatementGQL from "./queries/problem-statement/get.graphql";
import getTaskGQL from "./queries/task/get.graphql";
import getThreadGQL from "./queries/thread/get.graphql";
import listProblemStatementsGQL from "./queries/problem-statement/list.graphql";

import newProblemStatementGQL from "./queries/problem-statement/new.graphql";
import newTaskGQL from "./queries/task/new.graphql";
import newThreadGQL from "./queries/thread/new.graphql";

import updateProblemStatementGQL from "./queries/problem-statement/update.graphql";
import updateTaskGQL from "./queries/task/update.graphql";
import updateThreadModelGQL from "./queries/thread/update-models.graphql";
import updateThreadDataGQL from "./queries/thread/update-datasets.graphql";
import updateThreadParametersGQL from "./queries/thread/update-parameters.graphql";
import updateThreadInfoGQL from "./queries/thread/update-info.graphql";

import getExecutionGQL from "./queries/execution/get.graphql";
import listSuccessfulIdsGQL from "./queries/execution/list-successful-ids.graphql";
import listExistingIdStatusGQL from "./queries/execution/list-existing-ids.graphql";
import getExecutionsGQL from "./queries/execution/list.graphql";
import setExecutionsGQL from "./queries/execution/new.graphql";
import updateExecutionStatusResultsGQL from "./queries/execution/update-status-results.graphql";
import updateExecutionStatusGQL from "./queries/execution/update-status.graphql";
import updateExecutionRunIdGQL from "./queries/execution/update-run-id.graphql";
import deleteExecutionsGQL from "./queries/execution/delete.graphql";

import getRegionDetailsGQL from "./queries/region/get.graphql";

import updateExecutionSummary from "./queries/execution/update-execution-summary.graphql";
import incFailedRunsGQL from "./queries/execution/increment-failed-runs.graphql";
import incSuccessfulRunsGQL from "./queries/execution/increment-successful-runs.graphql";
import incSubmittedRunsGQL from "./queries/execution/increment-submitted-runs.graphql";
import toggleThreadModelExecutionSummaryPublishingGQL from "./queries/execution/toggle-summary-publishing.graphql";
import incRegisteredRunsGQL from "./queries/execution/increment-registered-runs.graphql";
import incRegisteredRunsByExecutionIdGQL from "./queries/execution/increment-registered-runs-by-execution-id.graphql";

import listThreadModelExecutionIdsGQL from "./queries/execution/list-thread-model-executions.graphql";
import newThreadModelExecutionsGQL from "./queries/execution/new-thread-model-executions.graphql";
import deleteThreadModelExecutionsGQL from "./queries/execution/delete-thread-model-executions.graphql";

import getModelGQL from "./queries/model/get.graphql";
import deleteModelGQL from "./queries/model/delete.graphql";

import getModelOutputGQL from "./queries/model_output/get.graphql";
import getThreadModelGQL from "./queries/thread_model/get.graphql";
import incrementPublishedRunsGQL from "./queries/execution/increment-published-runs.graphql";
import {
    problemStatementFromGQL,
    taskFromGQL,
    threadFromGQL,
    executionFromGQL,
    executionToGQL,
    problemStatementToGQL,
    taskToGQL,
    threadInfoToGQL,
    problemStatementUpdateToGQL,
    taskUpdateToGQL,
    threadInfoUpdateToGQL,
    getCustomEvent,
    threadDataBindingsToGQL,
    threadParameterBindingsToGQL,
    executionResultsToGQL,
    regionFromGQL,
    eventToGQL,
    modelFromGQL
} from "./graphql_adapter";

import { Md5 } from "ts-md5";
import { Execution_Result_Insert_Input } from "./graph_typing";
import { KeycloakAdapter } from "@/config/keycloak-adapter";
import { InternalServerError, UnauthorizedError } from "../common/errors";

function getTokenFromAuthorizationHeader(authorizationHeader: string): string | null {
    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
        return null;
    }
    return authorizationHeader.split(" ")[1];
}

export const getProblemStatement = async (
    problem_statement_id: string,
    access_token?: string
): Promise<ProblemStatement> => {
    const APOLLO_CLIENT = access_token
        ? GraphQL.instanceUsingAccessToken(access_token)
        : GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.query({
        query: getProblemStatementGQL,
        variables: {
            id: problem_statement_id
        }
    })
        .then((result) => {
            if (!result || (result.errors && result.errors.length > 0)) {
                console.log("ERROR");
                console.log(result);
            } else {
                const problem = result.data.problem_statement_by_pk;
                if (problem) {
                    return problemStatementFromGQL(problem);
                }
            }
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        });
};

export const getTask = async (taskid: string): Promise<Task> => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.query({
        query: getTaskGQL,
        variables: {
            id: taskid
        }
    })
        .then((result) => {
            if (!result || (result.errors && result.errors.length > 0)) {
                console.log("ERROR");
                console.log(result);
            } else {
                const task = result.data.task_by_pk;
                if (task) {
                    return taskFromGQL(task);
                }
            }
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        });
};

export const getThread = async (threadid: string): Promise<Thread> => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.query({
        query: getThreadGQL,
        fetchPolicy: "no-cache",
        variables: {
            id: threadid
        }
    })
        .then((result) => {
            if (!result || (result.errors && result.errors.length > 0)) {
                console.log("ERROR");
                console.log(result);
            } else {
                const thread = result.data.thread_by_pk;
                if (thread) {
                    return threadFromGQL(thread);
                }
            }
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        });
};

export const getThreadV2 = async (threadId: string): Promise<Thread> => {
    try {
        const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
        const response = await APOLLO_CLIENT.query({
            query: getThreadGQL,
            fetchPolicy: "no-cache",
            variables: {
                id: threadId
            }
        });

        if (!response || (response.errors && response.errors.length > 0)) {
            throw new Error(response.errors.join(", "));
        } else {
            const thread = response.data.thread_by_pk;
            if (thread) {
                return threadFromGQL(thread);
            }
        }
    } catch (error) {
        console.log(error);
        throw error;
    }
};

export const getModel = async (modelid: string): Promise<Model> => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.query({
        query: getModelGQL,
        fetchPolicy: "no-cache",
        variables: {
            id: modelid
        }
    })
        .then((result) => {
            if (!result || (result.errors && result.errors.length > 0)) {
                console.log("ERROR");
                console.log(result);
            } else {
                const model = result.data.model_by_pk;
                if (model) {
                    return modelFromGQL(model);
                }
            }
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        });
};

const MAX_CONFIGURATIONS = 1000000;
export const getTotalConfigurations = (
    model: ModelConfigurationSetup,
    bindings: ModelIOBindings,
    data: DataMap
) => {
    let totalconfigs = 1;
    model.hasInput.map((io) => {
        if (!io.hasFixedResource || io.hasFixedResource.length == 0) {
            // Expand a dataset to it's constituent resources
            // FIXME: Create a collection if the model input has dimensionality of 1
            if (bindings[io.id]) {
                let nexecution: any[] = [];
                bindings[io.id].map((dsid) => {
                    const ds = data[dsid];
                    let selected_resources = ds.resources.filter((res) => res.selected);
                    // Fix for older saved resources
                    if (!selected_resources || selected_resources.length == 0)
                        selected_resources = ds.resources;
                    nexecution = nexecution.concat(selected_resources);
                });
                totalconfigs *= nexecution.length;
            }
        } else {
            totalconfigs *= (io.hasFixedResource as any[]).length;
        }
    });

    // Add adjustable parameters to the input ids
    model.hasParameter.map((io) => {
        if (!io.hasFixedValue || io.hasFixedValue.length == 0)
            totalconfigs *= bindings[io.id]?.length ?? 1;
    });

    return totalconfigs;
};

const cartProd = (lists: any[]) => {
    let ps: any[] = [],
        acc: any[][] = [[]],
        i = lists.length;
    while (i--) {
        let subList = lists[i],
            j = subList.length;
        while (j--) {
            let x = subList[j],
                k = acc.length;
            while (k--) ps.push([x].concat(acc[k]));
        }
        acc = ps;
        ps = [];
    }
    return acc.reverse();
};

export const getModelInputConfigurations = (threadModel: ThreadModelMap, inputIds: string[]) => {
    const dataBindings = threadModel.bindings;
    const inputBindings: any[] = [];
    let totalproducts = 1;
    inputIds.map((inputid) => {
        inputBindings.push(dataBindings[inputid]);
        if (dataBindings[inputid]) totalproducts *= dataBindings[inputid].length;
    });
    if (totalproducts < MAX_CONFIGURATIONS) {
        return cartProd(inputBindings);
    } else {
        return null;
    }
};

export const getModelInputBindings = (model: Model, thread: Thread, region: Region) => {
    const me = thread.model_ensembles[model.id];
    const threadModel = {
        id: me.id,
        bindings: Object.assign({}, me.bindings)
    } as ThreadModelMap;
    const inputIds: any[] = [];

    model.input_files.map((io) => {
        inputIds.push(io.id);
        if (!io.value) {
            // Expand a dataset to it's constituent "selected" resources
            // FIXME: Create a collection if the model input has dimensionality of 1
            if (threadModel.bindings[io.id]) {
                let nexecution: any[] = [];
                threadModel.bindings[io.id].map((dsid) => {
                    const ds = thread.data[dsid];
                    let selected_resources = ds.resources.filter((res) => res.selected);
                    // Fix for older saved resources
                    if (selected_resources.length == 0) selected_resources = ds.resources;
                    nexecution = nexecution.concat(selected_resources);
                });
                threadModel.bindings[io.id] = nexecution;
            }
        } else {
            threadModel.bindings[io.id] = io.value.resources as any[];
        }
    });

    // Add adjustable parameters to the input ids
    model.input_parameters.map((io) => {
        inputIds.push(io.id);

        if (io.value) {
            // If this is a non-adjustable parameter, set the binding value to the fixed value
            threadModel.bindings[io.id] = [io.value];
        }

        // HACK: Add region id to __region_geojson (Not replacing )
        if (threadModel.bindings[io.id] && threadModel.bindings[io.id][0] == "__region_geojson") {
            threadModel.bindings[io.id] = ["__region_geojson:" + region.id];
        }
    });

    return [threadModel, inputIds];
};

export const deleteModel = async (model_id: string) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: deleteModelGQL,
        variables: {
            id: model_id
        }
    });
};

/*
    Executions
*/
export const getExecution = async (executionid: string): Promise<Execution> => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.query({
        query: getExecutionGQL,
        variables: {
            id: executionid
        }
    })
        .then((result) => {
            if (!result || (result.errors && result.errors.length > 0)) {
                console.log("ERROR");
                console.log(result);
            } else {
                const execution = result.data.execution_by_pk;
                if (execution) {
                    return executionFromGQL(execution);
                }
            }
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        });
};

// Get Executions
export const getExecutions = (executionids: string[]): Promise<Execution[]> => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.query({
        query: getExecutionsGQL,
        variables: {
            ids: executionids
        }
    })
        .then((result) => {
            if (!result || (result.errors && result.errors.length > 0)) {
                console.log("ERROR");
                console.log(result);
            } else {
                return result.data.execution.map((ex: any) => executionFromGQL(ex));
            }
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        });
};

export const getMatchingExecution = (
    executions: Execution[],
    execution: Execution,
    hashes: string[]
) => {
    const hash = getExecutionHash(execution);
    const index = hashes.indexOf(hash);
    if (index >= 0) {
        return executions[index];
    }
    return null;
};

export const getExecutionHash = (execution: Execution): string => {
    let str = execution.modelid;
    const varids = Object.keys(execution.bindings).sort();
    varids.map((varid) => {
        const binding = execution.bindings[varid];
        const bindingid =
            binding !== null && typeof binding === "object"
                ? (binding as DataResource).id
                : binding;
        str += varid + "=" + bindingid + "&";
    });
    return Md5.hashStr(str).toString();
};

// List Existing Execution Ids
export const listExistingExecutionIdStatus = (
    executionids: string[]
): Promise<Map<string, string>> => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.query({
        query: listExistingIdStatusGQL,
        variables: {
            ids: executionids
        }
    })
        .then((result) => {
            if (!result || (result.errors && result.errors.length > 0)) {
                console.log("ERROR");
                console.log(result);
            } else {
                const idstatus = {};
                result.data.execution.forEach((ex: any) => {
                    idstatus[ex["id"].replace(/-/g, "")] = ex["status"];
                });
            }
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        });
};

// List Successful Execution Ids
export const listSuccessfulExecutionIds = (executionids: string[]): Promise<string[]> => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.query({
        query: listSuccessfulIdsGQL,
        variables: {
            ids: executionids
        }
    })
        .then((result) => {
            if (!result || (result.errors && result.errors.length > 0)) {
                console.log("ERROR");
                console.log(result);
            } else {
                return result.data.execution.map((ex: any) => ex["id"].replace(/-/g, ""));
            }
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        });
};

// Update Executions
export const setExecutions = (executions: Execution[], thread_model_id: string) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    const exobjs = executions.map((ex) => executionToGQL(ex));
    const exids = executions.map((ex) => ex.id);
    return APOLLO_CLIENT.mutate({
        mutation: setExecutionsGQL,
        variables: {
            ids: exids,
            tmid: thread_model_id,
            executions: exobjs
        }
    }).catch((e) => {
        console.log("ERROR");
        console.log(e);
    });
};

// Update Execution status and results only
export const updateExecutionStatusAndResults = (execution: Execution) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: updateExecutionStatusResultsGQL,
        variables: {
            id: execution.id,
            end_time: execution.end_time,
            run_progress: execution.run_progress,
            status: execution.status,
            results: executionResultsToGQL(execution.results).map((exres: any) => {
                exres["execution_id"] = execution.id;
                return exres;
            })
        }
    });
};

// Update Execution status and results only
export const updateExecutionStatusAndResultsv2 = (execution: Execution) => {
    /*
    The following code is a modified version of the updateExecutionStatusAndResults function.
    The main difference is that it uses the typing from the `execution.results` (Execution_Result[])
    */
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    const resultsData: Execution_Result_Insert_Input[] = execution.results.map(
        (result: Execution_Result) => {
            const resource: Execution_Result_Insert_Input = {
                execution_id: execution.id,
                resource: {
                    data: {
                        id: result.resource.id,
                        name: result.resource.name,
                        url: result.resource.url
                    }
                },
                model_io_id: result.model_io?.id
            };
            return resource;
        }
    );

    const variables = {
        id: execution.id,
        end_time: new Date(),
        run_progress: execution.run_progress,
        status: execution.status,
        results: resultsData
    };
    console.log(JSON.stringify(variables, null, 2));
    console.log(updateExecutionStatusResultsGQL);

    return APOLLO_CLIENT.mutate({
        mutation: updateExecutionStatusResultsGQL,
        variables: variables
    });
};
// Update Execution status only
export const updateExecutionStatus = (execution: Execution) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: updateExecutionStatusGQL,
        variables: {
            id: execution.id,
            start_time: execution.start_time,
            run_progress: execution.run_progress,
            status: execution.status
        }
    });
};

// Delete Executions
export const deleteExecutions = (executionids: string[]) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: deleteExecutionsGQL,
        variables: {
            ids: executionids
        }
    });
};

/*
    Thread Model Execution Mappings
*/
export const getThreadModelExecutionIds = async (thread_model_id: string): Promise<string[]> => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.query({
        query: listThreadModelExecutionIdsGQL,
        variables: {
            threadModelId: thread_model_id
        }
    })
        .then((result) => {
            if (!result || (result.errors && result.errors.length > 0)) {
                console.log("ERROR");
                console.log(result);
            } else {
                return result.data.thread_model_by_pk.executions.map((ex: any) => ex.execution_id);
            }
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        });
};

export const setThreadModelExecutionIds = (thread_model_id: string, executionids: string[]) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    const tmexids = executionids.map((exid) => {
        return {
            thread_model_id: thread_model_id,
            execution_id: exid
        };
    });
    return APOLLO_CLIENT.mutate({
        mutation: newThreadModelExecutionsGQL,
        variables: {
            threadModelExecutions: tmexids
        }
    });
};

export const deleteThreadModelExecutionIds = async (thread_model_id: string) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: deleteThreadModelExecutionsGQL,
        variables: {
            threadModelId: thread_model_id
        }
    });
};

/*
    Thread Model Execution Summaries
*/
export const setThreadModelExecutionSummary = (
    thread_model_id: string,
    summary: ExecutionSummary
) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: updateExecutionSummary,
        variables: {
            threadModelId: thread_model_id,
            summary: summary
        }
    });
};

export const toggleThreadModelExecutionSummaryPublishing = (
    thread_model_id: string,
    submitted_for_publishing: boolean
) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: toggleThreadModelExecutionSummaryPublishingGQL,
        variables: {
            threadModelId: thread_model_id,
            submitted_for_publishing: submitted_for_publishing
        }
    });
};

// Increment thread submitted runs
export const incrementThreadModelSubmittedRuns = (thread_model_id: string, num: number = 1) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: incSubmittedRunsGQL,
        variables: {
            threadModelId: thread_model_id,
            inc: num
        }
    });
};

// Increment thread successful runs
export const incrementThreadModelSuccessfulRuns = (thread_model_id: string, num: number = 1) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: incSuccessfulRunsGQL,
        variables: {
            threadModelId: thread_model_id,
            inc: num
        }
    });
};

// Increment thread failed runs
export const incrementThreadModelFailedRuns = (thread_model_id: string, num: number = 1) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: incFailedRunsGQL,
        variables: {
            threadModelId: thread_model_id,
            inc: num
        }
    });
};

// Increment thread outputs registered runs
export const incrementThreadModelRegisteredRuns = (thread_model_id: string, num: number = 1) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: incRegisteredRunsGQL,
        variables: {
            threadModelId: thread_model_id,
            inc: num
        }
    });
};

export const incrementThreadModelRegisteredRunsByExecutionId = (
    model_id: string,
    execution_id: string,
    num: number = 1
) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: incRegisteredRunsByExecutionIdGQL,
        variables: {
            modelId: model_id,
            executionId: execution_id,
            inc: num
        }
    });
};

/* Update Functions */
// Add ProblemStatement
export const addProblemStatement = (
    problem_statement: ProblemStatementInfo,
    access_token?: string
): Promise<string> => {
    const APOLLO_CLIENT = access_token
        ? GraphQL.instanceUsingAccessToken(access_token)
        : GraphQL.instance(KeycloakAdapter.getUser());
    const problemobj = problemStatementToGQL(problem_statement);
    return APOLLO_CLIENT.mutate({
        mutation: newProblemStatementGQL,
        variables: {
            object: problemobj
        }
    })
        .then((result) => {
            if (!result || (result.errors && result.errors.length > 0)) {
                console.log("ERROR");
                console.log(result);
            } else {
                return result.data.insert_problem_statement.returning[0].id;
            }
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        });
};

// Add Task
export const addTask = (problem_statement: ProblemStatementInfo, task: Task): Promise<string> => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    const taskobj = taskToGQL(task, problem_statement);
    return APOLLO_CLIENT.mutate({
        mutation: newTaskGQL,
        variables: {
            object: taskobj
        }
    })
        .then((result) => {
            if (!result || (result.errors && result.errors.length > 0)) {
                console.log("ERROR");
                console.log(result);
            } else {
                return result.data.insert_task.returning[0].id;
            }
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        });
};

// Add Task
export const addTaskWithThread = (
    problem_statement: ProblemStatementInfo,
    task: Task,
    thread: ThreadInfo
): Promise<string[]> => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    const taskobj = taskToGQL(task, problem_statement);
    const threadobj = threadInfoToGQL(thread, task.id, task.regionid);
    taskobj["threads"] = {
        data: [threadobj]
    };
    return APOLLO_CLIENT.mutate({
        mutation: newTaskGQL,
        variables: {
            object: taskobj
        }
    })
        .then((result) => {
            if (!result || (result.errors && result.errors.length > 0)) {
                console.log("ERROR");
                console.log(result);
            } else {
                return [
                    result.data.insert_task.returning[0].id,
                    result.data.insert_task.returning[0].threads[0].id
                ];
            }
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        });
};

// Add Thread
export const addThread = (task: Task, thread: ThreadInfo): Promise<string> => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    const threadobj = threadInfoToGQL(thread, task.id, task.regionid);
    //console.log(threadobj);
    return APOLLO_CLIENT.mutate({
        mutation: newThreadGQL,
        variables: {
            object: threadobj
        }
    })
        .then((result) => {
            if (!result || (result.errors && result.errors.length > 0)) {
                console.log("ERROR");
                console.log(result);
            } else {
                return result.data.insert_thread.returning[0].id;
            }
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        });
};

// Update ProblemStatement
export const updateProblemStatement = (problem_statement: ProblemStatementInfo) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    const problemobj = problemStatementUpdateToGQL(problem_statement);
    return APOLLO_CLIENT.mutate({
        mutation: updateProblemStatementGQL,
        variables: {
            object: problemobj
        }
    });
};

// Update Task
export const updateTask = (task: Task) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    const taskobj = taskUpdateToGQL(task);
    return APOLLO_CLIENT.mutate({
        mutation: updateTaskGQL,
        variables: {
            object: taskobj
        }
    });
};

export const updateThreadInformation = (threadinfo: ThreadInfo) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    const threadobj = threadInfoUpdateToGQL(threadinfo);
    return APOLLO_CLIENT.mutate({
        mutation: updateThreadInfoGQL,
        variables: {
            object: threadobj
        }
    });
};

export const setThreadModels = (
    models: ModelConfigurationSetup[],
    notes: string,
    thread: Thread
) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    const threadmodelsobj = models.map((model) => {
        return {
            model_id: model.id,
            thread_id: thread.id
        };
    });
    const event = getCustomEvent("SELECT_MODELS", notes);
    const eventobj = eventToGQL(event);
    eventobj["thread_id"] = thread.id;
    return APOLLO_CLIENT.mutate({
        mutation: updateThreadModelGQL,
        variables: {
            threadId: thread.id,
            objects: threadmodelsobj,
            event: eventobj
        }
    });
};

export const setThreadData = (
    datasets: DataMap,
    model_ensembles: ModelEnsembleMap,
    notes: string,
    thread: Thread
) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    const bindings = threadDataBindingsToGQL(datasets, model_ensembles, thread);
    const event = getCustomEvent("SELECT_DATA", notes);
    const eventobj = eventToGQL(event);
    eventobj["thread_id"] = thread.id;

    return APOLLO_CLIENT.mutate({
        mutation: updateThreadDataGQL,
        variables: {
            threadId: thread.id,
            data: bindings.data,
            modelIO: bindings.model_io,
            event: eventobj
        }
    });
};

export const setThreadParameters = (
    model_ensembles: ModelEnsembleMap,
    execution_summary: IdMap<ExecutionSummary>,
    notes: string,
    thread: Thread
) => {
    const bindings = threadParameterBindingsToGQL(model_ensembles, thread);
    const event = getCustomEvent("SELECT_PARAMETERS", notes);
    const eventobj = eventToGQL(event);
    eventobj["thread_id"] = thread.id;
    const summaries = [];
    Object.keys(execution_summary).forEach((modelid) => {
        const summary = execution_summary[modelid];
        summary["thread_model_id"] = model_ensembles[modelid].id;
        summaries.push(summary);
    });
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: updateThreadParametersGQL,
        variables: {
            threadId: thread.id,
            summaries: summaries,
            modelParams: bindings,
            event: eventobj
        }
    });
};

// Get details about a particular region/subregion
export const getRegionDetails = (regionid: string) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return new Promise<Region>((resolve, reject) => {
        APOLLO_CLIENT.query({
            query: getRegionDetailsGQL,
            variables: {
                id: regionid
            }
        })
            .then((result) => {
                if (!result || (result.errors && result.errors.length > 0)) {
                    console.log("ERROR");
                    console.log(result);
                    reject();
                } else {
                    const region = regionFromGQL(result.data.region_by_pk);
                    region.bounding_box = _calculateBoundingBox(region.geometries);
                    resolve(region);
                }
            })
            .catch((e) => {
                console.log("ERROR");
                console.log(e);
                return null;
            });
    });
};

export const getModelOutputsByModelId = async (modelId: string): Promise<ModelOutput[]> => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.query({
        query: getModelOutputGQL,
        variables: {
            id: modelId
        }
    })
        .then((result) => {
            if (!result || (result.errors && result.errors.length > 0)) {
                console.log("ERROR");
                console.log(result);
            } else {
                const model = result.data.model_by_pk;
                if (model) {
                    return model.outputs;
                }
            }
            return null;
        })
        .catch((e) => {
            console.log("ERROR");
            console.log(e);
            return null;
        });
};

const _calculateBoundingBox = (geometries: any[]) => {
    let xmin = 99999,
        ymin = 99999,
        xmax = -99999,
        ymax = -99999;
    geometries.forEach((geometry) => {
        let coords_list = geometry.coordinates;
        if (geometry.type == "MultiPolygon") {
            coords_list = coords_list.flat(1);
        }

        coords_list.map((coords: any) => {
            coords.map((c: any) => {
                if (c[0] < xmin) xmin = c[0];
                if (c[1] < ymin) ymin = c[1];
                if (c[0] > xmax) xmax = c[0];
                if (c[1] > ymax) ymax = c[1];
            });
        });
    });

    return {
        xmin: xmin - 0.01,
        ymin: ymin - 0.01,
        xmax: xmax + 0.01,
        ymax: ymax + 0.01
    } as BoundingBox;
};

export const getThreadModelByThreadIdExecutionId = async (
    threadId: string,
    executionId: string
) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    try {
        const response = await APOLLO_CLIENT.query({
            query: getThreadModelGQL,
            variables: {
                threadId: threadId,
                executionId: executionId
            }
        });

        if (!response || (response.errors && response.errors.length > 0)) {
            console.log(response);
        } else {
            return response.data.thread_model;
        }
    } catch (error) {
        console.log("ERROR");
        console.log(error);
        return null;
    }
};

export const incrementPublishedRuns = (threadModelId: string, num: number = 1) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: incrementPublishedRunsGQL,
        variables: {
            threadModelId: threadModelId,
            inc: num
        }
    });
};

export const updateExecutionRunId = (executionId: string, runId: string) => {
    const APOLLO_CLIENT = GraphQL.instance(KeycloakAdapter.getUser());
    return APOLLO_CLIENT.mutate({
        mutation: updateExecutionRunIdGQL,
        variables: { id: executionId, run_id: runId }
    });
};

export const getProblemStatements = async (
    authorizationHeader: string
): Promise<ProblemStatement[]> => {
    const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
    if (!access_token) {
        throw new UnauthorizedError("Invalid authorization header");
    }

    const APOLLO_CLIENT = GraphQL.instanceUsingAccessToken(access_token);
    try {
        const result = await APOLLO_CLIENT.query({
            query: listProblemStatementsGQL,
            fetchPolicy: "no-cache"
        });

        if (!result || (result.errors && result.errors.length > 0)) {
            console.log("ERROR");
            console.log(result);
            return [];
        }

        const problems = result.data.problem_statement;
        if (problems) {
            return problems.map((problem) => problemStatementFromGQL(problem));
        }
        return [];
    } catch (e) {
        console.log(e);
        throw new InternalServerError("Error getting problem statements " + e.message);
    }
};
