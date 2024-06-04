import { getThread } from "../../../classes/graphql/graphql_functions";
import { Thread } from "../../../classes/mint/mint-types";
import { fetchMintConfig } from "../../../classes/mint/mint-functions";
import { KeycloakAdapter } from "../../../config/keycloak-adapter";
import { createResponse } from "./util";

const executionsKubernetesService = {
    async submitExecution(threadmodel: any) {
        const prefs = await fetchMintConfig();
        console.log("submitExecution", prefs.graphql.username, prefs.graphql.password);
        KeycloakAdapter.signIn(prefs.graphql.username, prefs.graphql.password);

        const thread: Thread = await getThread(threadmodel.thread_id); //.then((thread: Thread) => {
        if (thread) {
                return createResponse(
                    "success",
                    "Thread " + threadmodel.thread_id + " submitted for execution !"
                );
        } else {
            return createResponse("failure", "Thread " + threadmodel.thread_id + " not found !");
        }
    },
};

export default executionsKubernetesService;
