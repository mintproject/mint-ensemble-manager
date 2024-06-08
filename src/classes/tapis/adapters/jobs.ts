import { Apps, Jobs } from "@tapis/tapis-typescript";
import { ComponentArgument, ComponentSeed } from "../../../classes/localex/local-execution-types";
import { DataResource } from "../../../classes/mint/mint-types";

const createRequestJob = (
    app: Apps.TapisApp,
    seed: ComponentSeed,
    executionId: string
): Jobs.ReqSubmitJob => {
    const jobFileInputs = createJobFileInputsFromSeed(seed, app);
    const request: Jobs.ReqSubmitJob = {
        name: executionId,
        appId: app.id,
        appVersion: app.version,
        fileInputs: jobFileInputs
    };
    return request;
};

const createJobFileInputsFromSeed = (
    seed: ComponentSeed,
    app: Apps.TapisApp
): Array<Jobs.JobFileInput> => {
    const jobInputs = app.jobAttributes.fileInputs.flatMap((fileInput: Apps.AppFileInput) => {
        const componentInput = seed.component.inputs.find(
            (componentFileInput: ComponentArgument) => {
                return componentFileInput.role === fileInput.name;
            }
        );
        if (!componentInput) {
            throw new Error(`Component input not found for ${fileInput.name}`);
        }
        const datasets = seed.datasets[componentInput.id] || [];
        return datasets.map((dataset: DataResource) => {
            return {
                name: componentInput.role,
                sourceUrl: dataset.url
            } as Jobs.JobFileInput;
        });
    });
    return jobInputs;
};

export { createRequestJob, createJobFileInputsFromSeed };
