import Queue from "bull";
import { LOCAL_EXECUTION_QUEUE_NAME, SLURM_EXECUTION_QUEUE_NAME, REDIS_URL } from "../../../config/redis";

// ./api-v1/services/executionsLocalService.js

const createResponse = (result: string, message: string) => {
    return {
        result: result,
        message: message
    };
}

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

const executionQueueService = {
    async emptyExecutionQueue() {
        let localExecutionQueue = new Queue(LOCAL_EXECUTION_QUEUE_NAME, REDIS_URL);
        let slurmExecutionQueue = new Queue(SLURM_EXECUTION_QUEUE_NAME, REDIS_URL);
        cleanQueue(localExecutionQueue);
        cleanQueue(slurmExecutionQueue);
        return createResponse("success", "Queues emptied");
    },
    async getExecutionQueue(thread: any) {
        let localExecutionQueue = new Queue(LOCAL_EXECUTION_QUEUE_NAME, REDIS_URL);
        let slurmExecutionQueue = new Queue(SLURM_EXECUTION_QUEUE_NAME, REDIS_URL);        
        let localCount = await localExecutionQueue.getActiveCount();
        let slurmCount = await slurmExecutionQueue.getActiveCount();
        return createResponse("success", `Number of Active Jobs: ${localCount} Local, ${slurmCount} Slurm`);
    }
};

export default executionQueueService;