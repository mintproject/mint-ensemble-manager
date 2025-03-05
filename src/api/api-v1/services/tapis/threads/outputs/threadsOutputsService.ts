import { getConfiguration } from "@/classes/mint/mint-functions";
import {
    getThreadModelExecutionIds,
    incrementPublishedRuns,
    toggleThreadModelExecutionSummaryPublishing
} from "@/classes/graphql/graphql_functions";
import { TapisExecutionService } from "@/classes/tapis/adapters/TapisExecutionService";
import { getTokenFromAuthorizationHeader } from "@/utils/authUtils";

export interface ThreadsOutputsService {
    registerOutputs(threadId: string, authorization: string): void;
}

const threadsOutputsService: ThreadsOutputsService = {
    async registerOutputs(threadId: string, authorization: string): Promise<void> {
        const token = getTokenFromAuthorizationHeader(authorization);
        if (!token) {
            throw new Error("Unauthorized");
        }

        const prefs = getConfiguration();
        const tapisExecution = new TapisExecutionService(token, prefs.tapis.basePath);

        // Get all execution IDs for the thread
        const executionIds = await getThreadModelExecutionIds(threadId);

        toggleThreadModelExecutionSummaryPublishing(threadId, true);
        // Process each execution asynchronously without waiting
        for (const executionId of executionIds) {
            try {
                await tapisExecution.registerExecutionOutputs(executionId);
                await incrementPublishedRuns(threadId);
            } catch (error) {
                console.error(`Error registering outputs for execution ${executionId}:`, error);
            }
        }
        toggleThreadModelExecutionSummaryPublishing(threadId, false);
    }
};

export default threadsOutputsService;
