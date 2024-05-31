import { getThread } from "../../../classes/graphql/graphql_functions";
import { Thread} from "../../../classes/mint/mint-types";
import {
    saveAndRunExecutionsLocally,
    deleteExecutableCacheLocally
} from "../../../classes/mint/mint-local-functions";
import { fetchMintConfig } from "../../../classes/mint/mint-functions";
import { KeycloakAdapter } from "../../../config/keycloak-adapter";
import { createResponse } from "./util";
import { ModelThread } from "../../../schema/openapi";

const executionsLocalService = {
    async submitExecution(threadmodel: ModelThread) {
        const prefs = await fetchMintConfig();
        KeycloakAdapter.signIn(prefs.graphql.username, prefs.graphql.password);

        const thread: Thread = await getThread(threadmodel.thread_id); //.then((thread: Thread) => {
        if (thread) {
            const ok = await saveAndRunExecutionsLocally(thread, threadmodel.model_id, prefs);
            if (ok) {
                return createResponse(
                    "success",
                    "Thread " + threadmodel.thread_id + " submitted for execution !"
                );
            } else {
                return createResponse(
                    "failure",
                    "Thread " + threadmodel.thread_id + " had errors while submitting execution !"
                );
            }
        } else {
            return createResponse("failure", "Thread " + threadmodel.thread_id + " not found !");
        }
    },
    async deleteExecutionCache(threadmodel: ModelThread) {
        const mint_prefs = await fetchMintConfig();
        const thread: Thread = await getThread(threadmodel.thread_id); //.then((thread: Thread) => {
        if (thread) {
            deleteExecutableCacheLocally(thread, threadmodel.model_id, mint_prefs);
            return createResponse(
                "success",
                "Thread " + threadmodel.thread_id + " execution cache deleted !"
            );
        } else {
            return createResponse("failure", "Thread " + threadmodel.thread_id + " not found !");
        }
    }
};

export default executionsLocalService;
