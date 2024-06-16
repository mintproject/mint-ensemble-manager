import { Jobs } from "@tapis/tapis-typescript";
import getJobOutputs from "../api/jobs/outputs";
import {
    getExecution,
    getModelOutputsByModelId,
    updateExecutionStatusAndResultsv2
} from "../../../classes/graphql/graphql_functions";
import { getTapisToken } from "../submit-execution";
import { Execution, Execution_Result, ModelOutput } from "../../../classes/mint/mint-types";
import { getMd5Hash } from "../../../classes/graphql/graphql_adapter";

const getJobOutputList = async (
    jobUuid: string,
    outputPath: string | undefined
): Promise<Jobs.RespGetJobOutputList> => {
    const { token, basePath } = await getTapisToken();
    const realOutputPath = outputPath || "";
    return await getJobOutputs(jobUuid, realOutputPath, basePath, token.access_token);
};

const updateExecutionResultsFromJob = async (
    jobUuid: string,
    executionId: string,
    status: Jobs.JobListDTOStatusEnum
) => {
    const execution = await getExecution(executionId);
    if (status === Jobs.JobListDTOStatusEnum.Finished) {
        execution.results = await getResults(jobUuid, execution);
        updateExecutionStatusAndResultsv2(execution);
    }
};

const matchTapisOutputsToMintOutputs = (
    files: Jobs.FileInfo[],
    mintOutputs: ModelOutput[]
): Execution_Result[] => {
    return files
        .flatMap((file) => {
            const modelOutput = mintOutputs.find((output: ModelOutput) => {
                if (output.model_io.name.toLowerCase() === file.name.toLowerCase()) {
                    return output;
                }
            });
            if (!modelOutput) return undefined;
            else {
                const executionResult: Execution_Result = {
                    resource: {
                        name: file.name,
                        url: file.url,
                        id: getMd5Hash(file.url)
                        // spatial_coverage: getSpatialCoverageGeometry(data["spatial_coverage"]),
                        // time_period: {}
                    },
                    model_io: modelOutput.model_io
                };
                return executionResult;
            }
        })
        .filter((result) => result !== undefined) as Execution_Result[];
};
async function getResults(jobUuid: string, execution: Execution) {
    const { result: files } = await getJobOutputList(jobUuid, "");
    const mintOutputs = await getModelOutputsByModelId(execution.modelid);
    const executionResults: Execution_Result[] = matchTapisOutputsToMintOutputs(files, mintOutputs);
    return executionResults;
}

export { updateExecutionResultsFromJob, matchTapisOutputsToMintOutputs };
