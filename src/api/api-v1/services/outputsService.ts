// ./api-v1/services/outputsService.js
import { compress_ensemble_files } from "../../../classes/mint/mint-local-functions";
const createResponse = (result: string, message: string) => {
    return {
        result: result,
        message: message
    };
}

const outputsService = {
    async compress(ensembleids: string[]) {
        compress_ensemble_files(ensembleids);
        return createResponse("failure", "Problem not found !");

    },
};

export default outputsService;