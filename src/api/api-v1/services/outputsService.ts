// ./api-v1/services/outputsService.js
import { getEnsemblesCompress } from "../../../classes/mint/mint-local-functions";
const createResponse = (result: string, message: string) => {
    return {
        result: result,
        message: message
    };
}

const outputsService = {
    async compress(ensembleids: string[], threadId: string, email: string) {
        getEnsemblesCompress(ensembleids, threadId, email);
        return createResponse("SUCCESS", "Compressing the files");

    },
};

export default outputsService;