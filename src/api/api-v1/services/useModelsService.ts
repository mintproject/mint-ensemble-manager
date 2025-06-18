import { Dataslice, Thread } from "@/classes/mint/mint-types";
import { AddDataRequest, DataInput } from "../paths/problemStatements/tasks/subtasks";
import { uuidv4 } from "@/classes/graphql/graphql_adapter";
import {
    DatasetSpecification,
    ModelConfiguration,
    ModelConfigurationSetup
} from "@mintproject/modelcatalog_client/dist";
import { BadRequestError, NotFoundError } from "@/classes/common/errors";
import {
    convertApiUrlToW3Id,
    fetchCustomModelConfigurationOrSetup
} from "@/classes/mint/model-catalog-functions";

const createDataSlice = (dataInput: DataInput, thread: Thread) => {
    const sliceid = uuidv4();
    const dataslice = {
        id: sliceid,
        total_resources: dataInput.dataset.resources.length,
        selected_resources: dataInput.dataset.resources.length,
        resources: dataInput.dataset.resources,
        time_period: thread.dates,
        name: dataInput.dataset.id,
        resources_loaded: true,
        dataset: dataInput.dataset
    } as Dataslice;
    return dataslice;
};

const isInputUnbound = (input: DatasetSpecification) => {
    return !input.hasFixedResource || input.hasFixedResource.length == 0;
};

const matchInput = (input: DatasetSpecification, data: AddDataRequest) => {
    const dataInput = data.data.find((d) => d.id === input.id);
    if (!dataInput) {
        throw new BadRequestError(`Data input ${input.id} has not been provided`);
    }
    return dataInput;
};

const createBinding = (
    input: DatasetSpecification,
    data: AddDataRequest,
    thread: Thread
): Dataslice => {
    const dataInput = matchInput(input, data);
    return createDataSlice(dataInput, thread);
};

const validateThatAllInputsAreBound = (
    model: ModelConfiguration | ModelConfigurationSetup,
    thread: Thread
) => {
    const modelInputs = model.hasInput;
    const w3id = convertApiUrlToW3Id(model.id);
    for (const input of modelInputs) {
        if (thread.model_ensembles[w3id].bindings[input.id].length === 0) {
            throw new BadRequestError(`Input ${input.id} is not bound`);
        }
    }
};

const matchInputs = (
    model: ModelConfiguration | ModelConfigurationSetup,
    data: AddDataRequest,
    thread: Thread
) => {
    const modelInputs = model.hasInput;
    const w3id = convertApiUrlToW3Id(model.id);
    for (const input of modelInputs) {
        if (isInputUnbound(input)) {
            const dataslice = createBinding(input, data, thread);
            thread.model_ensembles[w3id].bindings[input.id].push(dataslice.id);
        }
    }
};

const matchModel = async (data: AddDataRequest, subtask: Thread) => {
    let match = false;
    for (const [modelW3Id, _] of Object.entries(subtask.model_ensembles)) {
        if (modelW3Id === convertApiUrlToW3Id(data.model_id)) {
            match = true;
            const model = await fetchCustomModelConfigurationOrSetup(data.model_id);
            if (!model) {
                throw new NotFoundError("Model not found");
            }
            matchInputs(model, data, subtask);
            validateThatAllInputsAreBound(model, subtask);
        }
    }
    if (!match) {
        throw new NotFoundError("Model not found");
    }
};
const useModelsService = {
    matchInputs,
    matchModel
};

export default useModelsService;
