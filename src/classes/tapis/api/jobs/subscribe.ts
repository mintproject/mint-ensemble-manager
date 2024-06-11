import { Jobs } from "@tapis/tapis-typescript";
import apiGenerator from "../../utils/apiGenerator";
import errorDecoder from "../../utils/errorDecoder";

const suscribeJob = (
    request: Jobs.ReqSubscribe,
    basePath: string,
    jobUuid: string,
    jwt: string
): Promise<Jobs.RespResourceUrl> => {
    const api: Jobs.SubscriptionsApi = apiGenerator<Jobs.SubscriptionsApi>(
        Jobs,
        Jobs.JobsApi,
        basePath,
        jwt
    );
    return errorDecoder<Jobs.RespResourceUrl>(() =>
        api.subscribe({ jobUuid: jobUuid, reqSubscribe: request })
    );
};

export default suscribeJob;
