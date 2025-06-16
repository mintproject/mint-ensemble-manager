import { getExecution } from "@/classes/graphql/graphql_functions";
import { Execution } from "@/classes/mint/mint-types";
import { fetchWingsRunLog } from "@/classes/wings/wings-functions";
import { fetchLocalRunLog } from "@/classes/localex/local-execution-functions";
import { fetchMintConfig } from "@/classes/mint/mint-functions";
import { createResponse } from "./util";
import { getTokenFromAuthorizationHeader } from "@/utils/authUtils";
import { TapisExecutionService } from "@/classes/tapis/adapters/TapisExecutionService";
import { HttpError } from "@kubernetes/client-node/dist";
import { NotFoundError } from "@/classes/common/errors";

// ./api-v1/services/logsService.js
export interface LogsService {
    getAccessToken(authorizationHeader: string): string;
    fetchLog(execution_id: string, authorizationHeader: string): Promise<string>;
}

const logsService: LogsService = {
    getAccessToken(authorizationHeader: string): string {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new Error("Invalid authorization header");
        }
        return access_token;
    },
    async fetchLog(execution_id: string, authorizationHeader: string) {
        const prefs = await fetchMintConfig();
        const execution: Execution = await getExecution(execution_id);
        if (!execution) {
            throw new NotFoundError("Execution not found");
        }
        if (prefs.execution_engine == "wings") {
            const log = await fetchWingsRunLog(execution.runid, prefs);
            return log;
        } else if (prefs.execution_engine == "localex") {
            const log = fetchLocalRunLog(execution_id, prefs);
            return log;
        } else if (prefs.execution_engine == "tapis") {
            const access_token = this.getAccessToken(authorizationHeader);
            const tapisExecutionService = new TapisExecutionService(
                access_token,
                prefs.tapis.basePath
            );
            if (!execution.runid) {
                return createResponse(
                    "failure",
                    "Run ID is not set for this execution. Please try again later."
                );
            }
            await tapisExecutionService.getLog(execution.runid);
        }
    }
};

export default logsService;
