import { getThread, getProblemStatement } from "../../../classes/graphql/graphql_functions";
import { Thread, ProblemStatement } from "../../../classes/mint/mint-types";
import { saveAndRunExecutionsSlurm, deleteExecutableCacheSlurm } from "../../../classes/mint/mint-slurm-functions";
import { fetchMintConfig } from "../../../classes/mint/mint-functions";

// ./api-v1/services/executionsSlurmService.js

const createResponse = (result: string, message: string) => {
    return {
        result: result,
        message: message
    };
}

const executionsSlurmService = {
    async submitExecution(threadmodel: any) {
        let thread: Thread = await getThread(threadmodel.thread_id); //.then((thread: Thread) => {
        if(thread) {
            let mint_prefs = await fetchMintConfig();
            saveAndRunExecutionsSlurm(thread, threadmodel.model_id, mint_prefs);
            return createResponse("success",
                "Thread " + threadmodel.thread_id + " submitted for execution !");
        }
        else {
            return createResponse("failure", "Thread " + threadmodel.thread_id + " not found !");
        }
    },
    async deleteExecutionCache(threadmodel: any) {
        let thread: Thread = await getThread(threadmodel.thread_id); //.then((thread: Thread) => {
        if(thread) {
            let mint_prefs = await fetchMintConfig();
            deleteExecutableCacheSlurm(thread, threadmodel.model_id, mint_prefs);
            return createResponse("success",
                "Thread " + threadmodel.thread_id + " execution cache deleted !");
        }
        else {
            return createResponse("failure", "Thread " + threadmodel.thread_id + " not found !");
        }
    }
};

export default executionsSlurmService;