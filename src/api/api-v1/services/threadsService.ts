import { getThread, fetchMintConfig, addThread, setThreadModels } from "../../../classes/graphql/graphql_functions";
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
            let now = Date()
            let new_thread_info = {
                name:  now + "_clone",
                task_id: thread.task_id,
                dates: {
                    start_date: thread.dates.start_date,
                    end_date: new Date()
                },
                driving_variables: thread.driving_variables,
                response_variables: thread.response_variables,
            } as ThreadInfo;
            //Create a new Thread
            let new_thread_id: string = await addThread(thread.task_id, thread.regionid, new_thread_info);
            let new_thread: Thread = await getThread(new_thread_id)
            let models = [];
            for(let modelid in thread.models) {
                models.push(thread.models[modelid]);
            }
            let response = setThreadModels(models, "This is thread has been generated automatically", new_thread)
            return response
        }
        else {
            return createResponse("failure", "Thread " + threadmodel.thread_id + " not found !");
        }
    }
};

export default threadService;