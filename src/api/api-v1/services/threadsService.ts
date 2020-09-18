import { getThread, fetchMintConfig, addThread, setThreadModels } from "../../../classes/graphql/graphql_functions";
import { Thread, Task, ThreadInfo } from "../../../classes/mint/mint-types";
import { saveAndRunExecutions } from "../../../classes/mint/mint-functions";
import Queue from "bull";
// ./api-v1/services/executionsService.js
import { REDIS_URL, REPEATED_THREAD_QUEUE } from "../../../config/redis";
import { FetchResult } from "apollo-boost";

let repeatedThreadQueue = new Queue(REPEATED_THREAD_QUEUE, REDIS_URL);

const cleanQueue = (queue: Queue.Queue) => {
    queue.empty();
    queue.clean(0, 'delayed');
    queue.clean(0, 'wait');
    queue.clean(0, 'active');
    queue.clean(0, 'completed');
    queue.clean(0, 'failed');

    let multi = queue.multi();
    multi.del(queue.toKey('repeat'));
    multi.exec();
}


//cleanQueue(repeatedThreadQueue)


repeatedThreadQueue.process(function (job) {
    return createRepeated(job.data.thread_id)
});



const createResponse = (result: string, message: string) => {
    return {
        result: result,
        message: message
    };
}

const createRepeated =  async(thread_id: string) : Promise<any> => {
    let thread: Thread = await getThread(thread_id);
    if (thread) {
        let now = Date()
        let new_thread_info = {
            name: now + "_clone",
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
        for (let modelid in thread.models) {
            models.push(thread.models[modelid]);
        }
        let response = setThreadModels(models, "This is thread has been generated automatically", new_thread)
        return response
    }
    else {
        return createResponse("failure", "Thread " + thread_id + " not found !");
    }
}

const threadService = {
    async createRepeatedThread(threadmodel: any) {
        let now = new Date()
        let start_date: Date = now;
        let end_date: Date = new Date("2020-12-12");
        let every: number = 60 * 1000;
        repeatedThreadQueue.add({thread_id: threadmodel.thread_id }, {repeat: {
          every: every,
          startDate: start_date,
          endDate: end_date,
        }});
        return createResponse("ok", every / 1000 + " seconds")
    }
};

export default threadService;