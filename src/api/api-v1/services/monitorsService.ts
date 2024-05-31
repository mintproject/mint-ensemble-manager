import { getThread } from "../../../classes/graphql/graphql_functions";
import { Thread } from "../../../classes/mint/mint-types";
import { monitorAllExecutions, fetchMintConfig } from "../../../classes/mint/mint-functions";
import { createResponse } from "./util";
import { ModelThread } from "../../../schema/openapi";
// ./api-v1/services/monitorsService.js

const monitorsService = {
    async submitMonitor(threadmodel: ModelThread) {
        const thread: Thread = await getThread(threadmodel.thread_id); //.then((thread: Thread) => {
        if (thread) {
            const mint_prefs = await fetchMintConfig();
            monitorAllExecutions(thread, threadmodel.model_id, mint_prefs);
            return createResponse(
                "success",
                "Thread " + threadmodel.thread_id + " submitted for monitoring !"
            );
        } else {
            return createResponse("failure", "Thread " + threadmodel.thread_id + " not found !");
        }
    },
    async fetchRunStatus(threadid: string) {
        const thread = await getThread(threadid);
        if (thread) return thread.execution_summary;
        else return createResponse("failure", "Thread not found");
    }
};

export default monitorsService;
