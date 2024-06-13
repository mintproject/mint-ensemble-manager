import { Jobs } from "@tapis/tapis-typescript";
import getJobOutputs from "../api/jobs/outputs";

const getJobOutputList = async (
    jobUuid: string,
    outputPath: string,
    basePath: string,
    token: string
): Promise<Jobs.RespGetJobOutputList> => {
    return await getJobOutputs(jobUuid, outputPath, basePath, token);
};

export { getJobOutputList };
