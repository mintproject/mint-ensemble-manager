import { Thread, ThreadInfo, Execution, ModelParameter } from "@/classes/mint/mint-types";
import {
    addThread,
    insertModel,
    getModel,
    getTask,
    getThread,
    setThreadModels,
    setThreadData,
    setThreadParameters
} from "@/classes/graphql/graphql_functions";
import { getTokenFromAuthorizationHeader } from "@/utils/authUtils";
import {
    UnauthorizedError,
    InternalServerError,
    NotFoundError,
    BadRequestError
} from "@/classes/common/errors";
import problemStatementsService from "./problemStatementsService";
import {
    convertApiUrlToW3Id,
    convertModelConfigurationW3IdToApiUrl,
    fetchModelConfiguration,
    fetchModelConfigurationSetup
} from "@/classes/mint/model-catalog-functions";
import {
    modelConfigurationSetupToGraphQL,
    modelConfigurationToGraphQL
} from "@/classes/mint/model-catalog-graphql-adapter";
import { Model_Insert_Input } from "@/classes/graphql/types";
import {
    AddDataRequest,
    AddParametersRequest,
    SetupModelConfigurationAndBindingsRequest
} from "../paths/problemStatements/tasks/subtasks";
import useModelsService from "./useModelsService";
import { IExecutionService, SubmissionResult } from "@/interfaces/IExecutionService";
import { TapisExecutionService } from "@/classes/tapis/adapters/TapisExecutionService";
import { getConfiguration } from "@/classes/mint/mint-functions";
import { MockExecutionService } from "@/classes/common/__tests__/mocks/MockExecutionService";
import { ExecutionCreation } from "@/classes/common/ExecutionCreation";
import { DatasetSpecification } from "@mintproject/modelcatalog_client/dist";
import {
    getThread as getThreadV2,
    checkVariableExistsById as checkVariableExistsByIdV2,
    checkRegionExistsById as checkRegionExistsByIdV2
} from "@/classes/graphql/graphql_functions_v2";

function getExecutionEngineService(
    executionEngine: string,
    authorizationHeader: string
): IExecutionService {
    const config = getConfiguration();
    const token = getTokenFromAuthorizationHeader(authorizationHeader);
    if (!token) {
        throw new UnauthorizedError("Invalid authorization header");
    }

    switch (executionEngine.toLowerCase()) {
        case "tapis":
            return new TapisExecutionService(token, config.tapis.basePath);
        case "localex":
            // For local execution, we can use a mock service for now
            // TODO: Implement proper local execution service
            return new MockExecutionService();
        case "wings":
            // TODO: Implement Wings execution service
            throw new Error("Wings execution engine not implemented yet");
        default:
            throw new Error(`Unsupported execution engine: ${executionEngine}`);
    }
}

export interface SubTasksService {
    getModelParameters(model_id: string, authorizationHeader: string): unknown;
    submitSubtask(
        subtaskId: string,
        model_id: string,
        authorizationHeader: string
    ): Promise<{ thread: Thread; executions: Execution[]; submissionResult: SubmissionResult }>;
    getSubtasksByTaskId(
        problemStatementId: string,
        taskId: string,
        authorizationHeader: string
    ): Promise<ThreadInfo[]>;
    getSubtaskById(
        problemStatementId: string,
        taskId: string,
        subtaskId: string,
        authorizationHeader: string
    ): Promise<ThreadInfo>;
    createSubtask(
        problemStatementId: string,
        taskId: string,
        subtask: ThreadInfo,
        authorizationHeader: string
    ): Promise<string>;
    addModels(subtaskId: string, modelIds: string[], authorizationHeader: string): Promise<Thread>;
    addData(subtaskId: string, data: AddDataRequest, authorizationHeader: string): Promise<Thread>;
    addParameters(
        subtaskId: string,
        parameters: AddParametersRequest,
        authorizationHeader: string
    ): Promise<Thread>;
    setupModelConfigurationAndBindings(
        subtaskId: string,
        request: SetupModelConfigurationAndBindingsRequest,
        authorizationHeader: string
    ): Promise<Thread>;
    getModelDataBindings(
        model_id: string,
        authorizationHeader: string
    ): Promise<DatasetSpecification[]>;
    getBlueprint(
        subtaskId: string,
        authorizationHeader: string,
        detailed?: boolean
    ): Promise<
        Array<{
            model_id: string;
            parameters: Array<{ id: string; value: string } | ModelParameter>;
            inputs: Array<{
                id: string;
                dataset: {
                    id: string;
                    resources: Array<{ id: string; url: string }>;
                };
            }>;
        }>
    >;
    checkVariableExistsByName(variableName: string, authorizationHeader: string): Promise<boolean>;
    checkRegionExistsById(regionId: string, authorizationHeader: string): Promise<boolean>;
}

const subTasksService: SubTasksService = {
    async getSubtasksByTaskId(
        problemStatementId: string,
        taskId: string,
        authorizationHeader: string
    ) {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new UnauthorizedError("Invalid authorization header");
        }

        const task = await getTask(taskId);
        if (!task) {
            throw new NotFoundError("Task not found");
        }

        if (task.problem_statement_id !== problemStatementId) {
            throw new NotFoundError("Task not found in the specified problem statement");
        }

        return Object.values(task.threads || {});
    },

    async getSubtaskById(
        problemStatementId: string,
        taskId: string,
        subtaskId: string,
        authorizationHeader: string
    ): Promise<ThreadInfo> {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new UnauthorizedError("Invalid authorization header");
        }

        const subtask = await getThreadV2(subtaskId, access_token);
        if (!subtask) {
            throw new NotFoundError("Subtask not found");
        }

        return {
            id: subtask.id,
            name: subtask.name,
            dates: {
                start_date: new Date(subtask.start_date),
                end_date: new Date(subtask.end_date)
            },
            task_id: subtask.task_id,
            driving_variables: subtask.driving_variable ? [subtask.driving_variable.id] : [],
            response_variables: subtask.response_variable ? [subtask.response_variable.id] : []
        };
    },

    async createSubtask(
        problemStatementId: string,
        taskId: string,
        subtask: ThreadInfo,
        authorizationHeader: string
    ) {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new UnauthorizedError("Invalid authorization header");
        }

        const problemStatement = await problemStatementsService.getProblemStatementById(
            problemStatementId,
            authorizationHeader
        );

        if (!problemStatement) {
            throw new NotFoundError("Problem statement not found");
        }

        const task = await getTask(taskId);
        if (!task) {
            throw new NotFoundError("Task not found");
        }

        if (task.problem_statement_id !== problemStatementId) {
            throw new NotFoundError("Task not found in the specified problem statement");
        }

        // Validate driving variables exist
        if (subtask.driving_variables && subtask.driving_variables.length > 0) {
            for (const variableName of subtask.driving_variables) {
                const exists = await checkVariableExistsByIdV2(variableName, access_token);
                if (!exists) {
                    throw new BadRequestError(`Driving variable '${variableName}' does not exist`);
                }
            }
        }

        // Validate response variables exist
        if (subtask.response_variables && subtask.response_variables.length > 0) {
            for (const variableName of subtask.response_variables) {
                const exists = await checkVariableExistsByIdV2(variableName, access_token);
                if (!exists) {
                    throw new BadRequestError(`Response variable '${variableName}' does not exist`);
                }
            }
        }

        // Validate region exists
        if (subtask.regionid) {
            const regionExists = await checkRegionExistsByIdV2(subtask.regionid, access_token);
            if (!regionExists) {
                throw new BadRequestError(`Region '${subtask.regionid}' does not exist`);
            }
        }

        subtask.events = [
            {
                event: "CREATE",
                timestamp: new Date(),
                userid: "system",
                notes: "Added subtask from API"
            }
        ];
        subtask.permissions = [
            { read: true, write: true, execute: true, owner: false, userid: "*" }
        ];
        const subtaskId = await addThread(task, subtask);
        if (!subtaskId) {
            throw new InternalServerError("Failed to create subtask");
        }
        return subtaskId; // Return the thread ID
    },

    async addModels(subtaskId: string, modelIds: string[], authorizationHeader: string) {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new UnauthorizedError("Invalid authorization header");
        }

        const subtask = await getThread(subtaskId);
        if (!subtask) {
            throw new NotFoundError("Subtask not found");
        }
        for (const modelId of modelIds) {
            const w3Id = convertApiUrlToW3Id(modelId);
            if (!(await getModel(w3Id))) {
                let modelConfigurationGraphQL: Model_Insert_Input;
                try {
                    const modelConfiguration = await fetchModelConfiguration(modelId);
                    modelConfigurationGraphQL = modelConfigurationToGraphQL(modelConfiguration);
                } catch (error) {
                    const modelConfigurationSetup = await fetchModelConfigurationSetup(modelId);
                    modelConfigurationGraphQL =
                        modelConfigurationSetupToGraphQL(modelConfigurationSetup);
                }
                await insertModel([modelConfigurationGraphQL]);
            }
            await setThreadModels([{ id: w3Id }], "Added models", subtask);
        }
        return await getThread(subtaskId);
    },

    async addData(subtaskId: string, data: AddDataRequest, authorizationHeader: string) {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new UnauthorizedError("Invalid authorization header");
        }
        const subtask = await getThread(subtaskId);
        if (!subtask) {
            throw new NotFoundError("Subtask not found");
        }
        const dataMap = await useModelsService.setInputBindings(data, subtask);
        await setThreadData(
            dataMap,
            subtask.model_ensembles,
            "Setting thread data via API",
            subtask
        );
        return subtask;
    },

    async addParameters(
        subtaskId: string,
        parameters: AddParametersRequest,
        authorizationHeader: string
    ) {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new UnauthorizedError("Invalid authorization header");
        }
        const subtask = await getThread(subtaskId);
        if (!subtask) {
            throw new NotFoundError("Subtask not found");
        }
        await useModelsService.setParameterBindings(parameters, subtask);
        await setThreadParameters(
            subtask.model_ensembles,
            subtask.execution_summary,
            "Setting thread parameters via API",
            subtask
        );
        return subtask;
    },

    async setupModelConfigurationAndBindings(
        subtaskId: string,
        request: SetupModelConfigurationAndBindingsRequest,
        authorizationHeader: string
    ) {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new UnauthorizedError("Invalid authorization header");
        }
        const subtask = await getThread(subtaskId);
        if (!subtask) {
            throw new NotFoundError("Subtask not found");
        }

        // Check if the model exists in the subtask, if not add it
        const modelW3Id = convertApiUrlToW3Id(request.model_id);
        const modelExists = subtask.model_ensembles && subtask.model_ensembles[modelW3Id];

        if (!modelExists) {
            // Add the model first
            await this.addModels(subtaskId, [request.model_id], authorizationHeader);
            // Refresh the subtask after adding the model
            const updatedSubtask = await getThread(subtaskId);
            if (!updatedSubtask) {
                throw new NotFoundError("Subtask not found after adding model");
            }
            // Update the subtask reference for the rest of the method
            Object.assign(subtask, updatedSubtask);
        }

        // Handle data if provided
        if (request.data && request.data.length > 0) {
            const dataRequest: AddDataRequest = {
                model_id: request.model_id,
                data: request.data
            };
            const dataMap = await useModelsService.setInputBindings(dataRequest, subtask);
            await setThreadData(
                dataMap,
                subtask.model_ensembles,
                "Setting thread data via API",
                subtask
            );
        }
        // Handle parameters if provided
        if (request.parameters && request.parameters.length > 0) {
            const parametersRequest: AddParametersRequest = {
                model_id: request.model_id,
                parameters: request.parameters
            };
            await useModelsService.setParameterBindings(parametersRequest, subtask);
            try {
                const result = await setThreadParameters(
                    subtask.model_ensembles,
                    subtask.execution_summary,
                    "Setting thread parameters via API",
                    subtask
                );
                console.log("Result of setting thread parameters:", result);
            } catch (error) {
                console.error("Error setting thread parameters:", error);
                throw new InternalServerError("Error setting thread parameters: " + error.message);
            }
        }

        return await getThread(subtaskId);
    },

    async getModelDataBindings(model_id: string, authorizationHeader: string) {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new UnauthorizedError("Invalid authorization header");
        }
        return await useModelsService.getDataBindingsByModelId(model_id);
    },

    async getModelParameters(model_id: string, authorizationHeader: string) {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new UnauthorizedError("Invalid authorization header");
        }
        return await useModelsService.getModelParametersByModelId(model_id);
    },

    async getBlueprint(subtaskId: string, authorizationHeader: string, detailed: boolean = false) {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new UnauthorizedError("Invalid authorization header");
        }

        const subtask = await getThread(subtaskId);
        if (!subtask) {
            throw new NotFoundError("Subtask not found");
        }

        const bindings: Array<{
            model_id: string;
            parameters: Array<{ id: string; value: string } | ModelParameter>;
            inputs: Array<{
                id: string;
                dataset: {
                    id: string;
                    resources: Array<{ id: string; url: string }>;
                };
            }>;
        }> = [];

        if (subtask.model_ensembles) {
            for (const modelId of Object.keys(subtask.model_ensembles)) {
                const model = await getModel(modelId);
                if (!model) {
                    throw new NotFoundError("Model not found");
                }

                try {
                    const formattedParameters: Array<
                        { id: string; value: string } | ModelParameter
                    > = [];

                    if (model.input_parameters && Array.isArray(model.input_parameters)) {
                        for (const param of model.input_parameters) {
                            if (param && param.id) {
                                if (detailed) {
                                    formattedParameters.push(param);
                                } else {
                                    const basicParam = {
                                        id: param.id,
                                        value: param.value || param.default || ""
                                    };
                                    formattedParameters.push(basicParam);
                                }
                            }
                        }
                    }

                    const formattedInputs: Array<{
                        id: string;
                        dataset: {
                            id: string;
                            resources: Array<{ id: string; url: string }>;
                        };
                    }> = [];

                    if (model.input_files && Array.isArray(model.input_files)) {
                        for (const input of model.input_files) {
                            if (input && input.id) {
                                formattedInputs.push({
                                    id: input.id,
                                    dataset: {
                                        id: "YOUR_DATASET_ID",
                                        resources: []
                                    }
                                });
                            }
                        }
                    }

                    const binding = {
                        model_id: await convertModelConfigurationW3IdToApiUrl(modelId),
                        parameters: formattedParameters,
                        inputs: formattedInputs
                    };
                    bindings.push(binding);
                } catch (error) {
                    console.warn(`Failed to get bindings for model ${modelId}:`, error);
                    bindings.push({
                        model_id: modelId,
                        parameters: [],
                        inputs: []
                    });
                }
            }
        }

        return bindings;
    },

    async submitSubtask(subtaskId: string, model_id: string, authorizationHeader: string) {
        const w3id = convertApiUrlToW3Id(model_id);
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new UnauthorizedError("Invalid authorization header");
        }
        const subtask = await getThread(subtaskId);
        if (!subtask) {
            throw new NotFoundError("Subtask not found");
        }
        const executionService = new TapisExecutionService(
            access_token,
            getConfiguration().tapis.basePath
        );
        const executionCreation = new ExecutionCreation(
            subtask,
            w3id,
            executionService,
            access_token
        );
        await executionCreation.prepareExecutions();

        // Collect all executions

        let submissionResult: SubmissionResult = { submittedExecutions: [], failedExecutions: [] };

        if (executionCreation.executionToBeRun.length > 0) {
            submissionResult = await executionService.submitExecutions(
                executionCreation.executionToBeRun,
                executionCreation.model,
                executionCreation.threadRegion,
                executionCreation.component,
                subtask.id,
                subtask.model_ensembles[w3id].id
            );
            if (submissionResult.failedExecutions.length > 0) {
                console.warn(
                    "Some executions failed to submit:",
                    submissionResult.failedExecutions
                );
            }
            console.log(
                "Successfully submitted executions:",
                submissionResult.submittedExecutions.length
            );
        } else {
            console.log("No executions to run");
        }

        const updatedThread = await getThread(subtaskId);
        return {
            thread: updatedThread,
            executions: executionCreation.executionToBeRun,
            submissionResult
        };
    },

    async checkVariableExistsByName(
        variableName: string,
        authorizationHeader: string
    ): Promise<boolean> {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new UnauthorizedError("Invalid authorization header");
        }

        return await checkVariableExistsByIdV2(variableName, access_token);
    },

    async checkRegionExistsById(regionId: string, authorizationHeader: string): Promise<boolean> {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new UnauthorizedError("Invalid authorization header");
        }

        return await checkRegionExistsByIdV2(regionId, access_token);
    }
};

export default subTasksService;
