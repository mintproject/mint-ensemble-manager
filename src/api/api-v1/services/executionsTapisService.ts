import { getThread } from "../../../classes/graphql/graphql_functions";
import { Thread } from "../../../classes/mint/mint-types";
import { ModelThread } from "../../../classes/api";
import { saveAndRunExecutionsTapis } from "../../../classes/tapis/prepare-execution";
import { fetchMintConfig } from "../../../classes/mint/mint-functions";
import { Response } from "express";

export interface ExecutionsTapisService {
    submitExecution(threadmodel: ModelThread, response: Response): Promise<Response>;
}

const executionsTapisService = {
    async submitExecution(threadmodel: ModelThread, response: Response) {
        const thread: Thread = await getThread(threadmodel.thread_id);
        if (thread) {
            const prefs = await fetchMintConfig();
            saveAndRunExecutionsTapis(thread, threadmodel.model_id, prefs);
            response
                .json({
                    result: "success",
                    message: "Thread " + threadmodel.thread_id + " submitted for execution !"
                })
                .status(202);
        }
        response
            .json({
                result: "failure",
                message: "Thread " + threadmodel.thread_id + " not found !"
            })
            .status(404);
    }
};

export default executionsTapisService;
