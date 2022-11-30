import { getThread } from "../../../classes/graphql/graphql_functions";
import { Thread } from "../../../classes/mint/mint-types";
import { saveAndRunExecutionsLocally, deleteExecutableCacheLocally } from "../../../classes/mint/mint-local-functions";
import { fetchMintConfig, getConfiguration } from "../../../classes/mint/mint-functions";

//let prefs = getConfiguration()
//KeycloakAdapter.signIn(prefs.graphql.username, prefs.graphql.password);

const createResponse = (result: string, message: string) => {
    return {
        result: result,
        message: message
    };
}

const executionsLocalService = {
    async submitExecution(threadmodel: any) {
        let mint_prefs = await fetchMintConfig();
        let thread: Thread = await getThread(threadmodel.thread_id); //.then((thread: Thread) => {
        if(thread) {
            saveAndRunExecutionsLocally(thread, threadmodel.model_id, mint_prefs);
            return createResponse("success",
                "Thread " + threadmodel.thread_id + " submitted for execution !");
        }
        else {
            return createResponse("failure", "Thread " + threadmodel.thread_id + " not found !");
        }
    },
    async deleteExecutionCache(threadmodel: any) {
        let mint_prefs = await fetchMintConfig();
        let thread: Thread = await getThread(threadmodel.thread_id); //.then((thread: Thread) => {
        if(thread) {
            deleteExecutableCacheLocally(thread, threadmodel.model_id, mint_prefs);
            return createResponse("success",
                "Thread " + threadmodel.thread_id + " execution cache deleted !");
        }
        else {
            return createResponse("failure", "Thread " + threadmodel.thread_id + " not found !");
        }
    }
};

export default executionsLocalService;