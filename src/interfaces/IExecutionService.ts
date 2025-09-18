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

export interface SubmissionResult {
    submittedExecutions: { execution: Execution; jobId: string }[];
    failedExecutions: { execution: Execution; error: Error }[];
}

export interface SchedulingParameters {
    coresPerNode?: number;
    memoryMB?: number;
    maxMinutes?: number;
    nodeCount?: number;
}

export const DEFAULT_SCHEDULING_PARAMETERS: SchedulingParameters = {
    coresPerNode: 1,
    memoryMB: 10000,
    maxMinutes: 60,
    nodeCount: 1
};

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
        threadModelId: string,
        schedulingParameters?: SchedulingParameters
    ): Promise<SubmissionResult>;
    verifyComponent(component: TapisComponent): void;
}
