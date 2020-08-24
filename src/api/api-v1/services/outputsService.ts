// ./api-v1/services/outputsService.js
import { getEnsemblesCompress } from "../../../classes/mint/mint-local-functions";
import { EnsembleRequestDownload } from "../../../../src/classes/mint/mint-types";
const createResponse = (result: string, message: string) => {
    return {
        result: result,
        message: message
    };
}

const outputsService = {
    async compress(request : EnsembleRequestDownload) {
        getEnsemblesCompress(request);
        return createResponse("SUCCESS", "Compressing the files");

    },
};

export default outputsService;