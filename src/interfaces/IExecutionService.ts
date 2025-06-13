import { Region } from "@/classes/mint/mint-types";

import { Model } from "@/classes/mint/mint-types";

import { Execution } from "@/classes/mint/mint-types";
import { TapisComponent } from "@/classes/tapis/typing";

export enum Status {
    FAILURE = "FAILURE",
    SUCCESS = "SUCCESS",
    RUNNING = "RUNNING",
    WAITING = "WAITING"
}
export interface ExecutionJob {
    id: string;
    status: Status;
    result?: any;
    error?: string;
}

/**
 * Interface defining the contract for execution service adapters
 */
export interface IExecutionService {
    submitExecutions(
        executions: Execution[],
        model: Model,
        region: Region,
        component: TapisComponent,
        threadId: string,
        threadModelId: string
    ): Promise<string[]>;
}
