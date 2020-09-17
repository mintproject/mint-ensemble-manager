import { getThread, fetchMintConfig, addThread } from "../../../classes/graphql/graphql_functions";
import { Thread, Task, ThreadInfo } from "../../../classes/mint/mint-types";
import { saveAndRunExecutions } from "../../../classes/mint/mint-functions";

// ./api-v1/services/executionsService.js

const createResponse = (result: string, message: string) => {
    return {
        result: result,
        message: message
    };
}

const threadService = {
    async createRepeatedThread(threadmodel: any) {
        let thread: Thread = await getThread(threadmodel.thread_id); //.then((thread: Thread) => {
        if(thread) {
            let new_thread = {
                name: thread.name + "_clone",
                task_id: thread.task_id,
                dates: {
                    start_date: thread.dates.start_date,
                    end_date: new Date()
                },
                driving_variables: thread.driving_variables,
                response_variables: thread.response_variables,
                models: thread.models,
                // datasets: thread,
                // model_ensembles: {},
                // execution_summary: {},
                // events: [getCreateEvent(thread_notes)]
            } as ThreadInfo;

            addThread(thread.task_id, thread.regionid, new_thread);


            //saveAndRunExecutions(thread, threadmodel.model_id, mint_prefs);
            return thread
        }
        else {
            return createResponse("failure", "Thread " + threadmodel.thread_id + " not found !");
        }
    }
};

export default threadService;