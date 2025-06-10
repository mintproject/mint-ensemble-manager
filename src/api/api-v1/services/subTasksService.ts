import { ThreadInfo } from "@/classes/mint/mint-types";
import { addTaskWithThread, getTask } from "@/classes/graphql/graphql_functions";
import { getTokenFromAuthorizationHeader } from "@/utils/authUtils";
import { UnauthorizedError, InternalServerError, NotFoundError } from "@/classes/common/errors";
import problemStatementsService from "./problemStatementsService";

export interface SubTasksService {
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

        const subtask = task.threads?.[subtaskId];
        if (!subtask) {
            throw new NotFoundError("Subtask not found");
        }

        return subtask;
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

        try {
            const ids = await addTaskWithThread(problemStatement, task, subtask);
            if (!ids || ids.length < 2) {
                throw new InternalServerError("Failed to create subtask");
            }
            return ids[1]; // Return the thread ID
        } catch (error) {
            console.error("Error creating subtask:", error);
            throw new InternalServerError("Error creating subtask: " + error.message);
        }
    }
};

export default subTasksService;
