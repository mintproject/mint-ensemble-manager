import { getThread } from "../../../classes/graphql/graphql_functions";
import { Thread } from "../../../classes/mint/mint-types";
import { createResponse } from "./util";
import { ModelThread } from "../../../classes/api";
import { saveAndRunExecutionsKubernetes } from "../../../classes/kubernetes/prepare-execution";
import { fetchMintConfig } from "../../../classes/mint/mint-functions";

const executionsKubernetesService = {
    async submitExecution(threadmodel: ModelThread) {
        const thread: Thread = await getThread(threadmodel.thread_id); //.then((thread: Thread) => {
        if (thread) {
            const prefs = await fetchMintConfig();
            saveAndRunExecutionsKubernetes(thread, threadmodel.model_id, prefs);
            return createResponse(
                "success",
                "Thread " + threadmodel.thread_id + " submitted for execution !"
            );
        }
        return createResponse("failure", "Thread " + threadmodel.thread_id + " not found !");
    }
};

export default executionsKubernetesService;
