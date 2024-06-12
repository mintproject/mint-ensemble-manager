import { Jobs } from "@tapis/tapis-typescript";
import { getExecution, updateExecutionStatus } from "../../../../classes/graphql/graphql_functions";
import { Execution } from "../../../../classes/mint/mint-types";

export interface JobsService {
    webhookJobStatusChange(webHookEvent: any, jobId: string): Promise<void>;
}

const jobsService = {
    async webhookJobStatusChange(webHookEvent: any, executionId: string) {
        const status = webHookEvent.event.data.newJobStatus;
        const execution: Execution = await getExecution(executionId);
        await updateJobStatusOnGraphQL(execution, status);
    }
};

const updateJobStatusOnGraphQL = async (
    execution: Execution,
    status: Jobs.JobListDTOStatusEnum
) => {
    execution.status = adapterTapisStatusToMintStatus(status);
    await updateExecutionStatus(execution);
};

const adapterTapisStatusToMintStatus = (status: Jobs.JobListDTOStatusEnum) => {
    switch (status) {
        case Jobs.JobListDTOStatusEnum.Pending:
            return "WAITING";
        case Jobs.JobListDTOStatusEnum.ProcessingInputs:
            return "RUNNING";
        case Jobs.JobListDTOStatusEnum.StagingInputs:
            return "RUNNING";
        case Jobs.JobListDTOStatusEnum.StagingJob:
            return "RUNNING";
        case Jobs.JobListDTOStatusEnum.SubmittingJob:
            return "WAITING";
        case Jobs.JobListDTOStatusEnum.Queued:
            return "WAITING";
        case Jobs.JobListDTOStatusEnum.Running:
            return "RUNNING";
        case Jobs.JobListDTOStatusEnum.Archiving:
            return "RUNNING";
        case Jobs.JobListDTOStatusEnum.Blocked:
            return "WAITING";
        case Jobs.JobListDTOStatusEnum.Paused:
            return "WAITING";
        case Jobs.JobListDTOStatusEnum.Finished:
            return "SUCCESS";
        case Jobs.JobListDTOStatusEnum.Cancelled:
            return "FAILURE";
        case Jobs.JobListDTOStatusEnum.Failed:
            return "FAILURE";
        default:
            return "WAITING";
    }
};

export default jobsService;
