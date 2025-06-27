import { TapisExecutionService } from "@/classes/tapis/adapters/TapisExecutionService";
import { getTokenFromAuthorizationHeader } from "@/utils/authUtils";
import { getConfiguration } from "@/classes/mint/mint-functions";
import { Execution_Result } from "@/classes/mint/mint-types";

export interface ExecutionOutputsService {
    registerOutputs(
        executionId: string,
        authorization: string,
        datasetId?: string
    ): Promise<Execution_Result[]>;
}

const executionOutputsService: ExecutionOutputsService = {
    async registerOutputs(
        executionId: string,
        authorization: string,
        datasetId?: string
    ): Promise<Execution_Result[]> {
        const token = getTokenFromAuthorizationHeader(authorization);
        if (!token) {
            throw new Error("Unauthorized");
        }

        const prefs = getConfiguration();
        const tapisExecution = new TapisExecutionService(token, prefs.tapis.basePath);
        return await tapisExecution.registerExecutionOutputs(executionId, datasetId);
    }
};

export default executionOutputsService;
