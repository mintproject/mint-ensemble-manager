import { Jobs } from "@tapis/tapis-typescript";
import { Execution } from "../mint/mint-types";
import { getExecution, updateExecutionStatus } from "../graphql/graphql_functions";
import { updateExecutionResultsFromJob } from "./jobs";

const handleExecutionEvent = async (event: any, executionId: string) => {
    const execution = await getExecution(executionId);
    const jobUuid = event.data.jobUuid;
    if (execution !== undefined) {
        const status = event.data.newJobStatus;
        await updateJobStatusOnGraphQL(execution, status);
        await updateExecutionResultsFromJob(jobUuid, execution.id, status);
    }
    return execution;
};

const updateJobStatusOnGraphQL = async (
    execution: Execution,
    status: Jobs.JobListDTOStatusEnum
) => {
    execution.status = adapterTapisStatusToMintStatus(status);
    execution.run_progress = 1;
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

export default handleExecutionEvent;
