import { Jobs } from "@tapis/tapis-typescript";
import getJobOutputs from "../api/jobs/outputs";

const getJobOutputList = async (
    jobUuid: string,
    outputPath: string | undefined,
    basePath: string,
    token: string
): Promise<Jobs.RespGetJobOutputList> => {
    const realOutputPath = outputPath || "/";
    return await getJobOutputs(jobUuid, realOutputPath, basePath, token);
};

export { getJobOutputList };
