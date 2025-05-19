import { getExecution } from "../../../classes/graphql/graphql_functions";
import { Execution } from "../../../classes/mint/mint-types";
import { fetchWingsRunLog } from "../../../classes/wings/wings-functions";
import { fetchLocalRunLog } from "../../../classes/localex/local-execution-functions";
import { fetchMintConfig } from "../../../classes/mint/mint-functions";
import { KeycloakAdapter } from "../../../config/keycloak-adapter";
import { createResponse } from "./util";
import { getTokenFromAuthorizationHeader } from "@/utils/authUtils";
import { TapisExecutionService } from "@/classes/tapis/adapters/TapisExecutionService";

// ./api-v1/services/logsService.js

const logsService = {
    getAccessToken(authorizationHeader: string): string {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new Error("Invalid authorization header");
        }
        return access_token;
    },
    async fetchLog(execution_id: string, authorizationHeader: string) {
        try {
            const prefs = await fetchMintConfig();
            KeycloakAdapter.signIn(prefs.graphql.username, prefs.graphql.password);

            const ensemble: Execution = await getExecution(execution_id);
            if (!ensemble.execution_engine || ensemble.execution_engine == "wings") {
                const log = await fetchWingsRunLog(ensemble.runid, prefs);
                return log;
            } else if (ensemble.execution_engine == "localex") {
                const log = fetchLocalRunLog(execution_id, prefs);
                return log;
            } else if (ensemble.execution_engine == "tapis") {
                const access_token = this.getAccessToken(authorizationHeader);
                const tapisExecutionService = new TapisExecutionService(
                    access_token,
                    prefs.tapis.basePath
                );
                const response = await tapisExecutionService.getJobHistory(execution_id);
                let log = "";
                for (const result of response.result) {
                    log += `[${result.created} - ${result.event}] ${result.description}\n`;
                }
                return log;
            }
        } catch (error) {
            console.log(error);
            return createResponse("failure", error);
        }
    }
};

export default logsService;
