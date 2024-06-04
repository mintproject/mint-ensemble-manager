import { getThread } from "../../../classes/graphql/graphql_functions";
import { Thread} from "../../../classes/mint/mint-types";
import { ModelThread } from "../../../schema/openapi";


const submitExecution = async (request: ModelThread) => {
        // const prefs = await fetchMintConfig();
        const thread: Thread = await getThread(request.thread_id); //.then((thread: Thread) => {
        console.log(thread)
    }

export {submitExecution};
