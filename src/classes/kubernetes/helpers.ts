import { ComponentDataBindings } from "../localex/local-execution-types";
import { DataResource } from "../mint/mint-types";
import { ModelIO } from "../mint/mint-types";
import { InputBindings } from "../mint/mint-types";
import { Model } from "../mint/mint-types";

export function getInputDatasets(model: Model, bindings: InputBindings, registered_resources: any) {
    const datasets: ComponentDataBindings = {};
    model.input_files.map((input_file: ModelIO) => {
        const resources = obtainResources(bindings, input_file);
        if (resources.length > 0) {
            const type = input_file.type.replace(/^.*#/, "");
            const newresources: any = {};
            resources.map((res) => {
                const { resourceId, resourceName } = generateResourceIdAndName(res);
                newresources[resourceId] = {
                    id: resourceId,
                    url: res.url,
                    name: resourceName,
                    time_period: res.time_period,
                    spatial_coverage: res.spatial_coverage
                } as DataResource;
                registered_resources[resourceId] = [resourceName, type, res.url];
            });
            datasets[input_file.id] = resources.map((res) => newresources[res.id]);
        }
    });
    return datasets;
}

function generateResourceIdAndName(res: DataResource) {
    let resourceId = res.id;
    let resourceName = res.name;
    if (res.url) {
        resourceName = res.url.replace(/^.*(#|\/)/, "");
        resourceName = resourceName.replace(/^([0-9])/, "_$1");
        if (!resourceId) resourceId = resourceName;
    }
    return { resourceId, resourceName };
}

function obtainResources(bindings: InputBindings, input_file: ModelIO) {
    if (bindings[input_file.id]) {
        // We have a dataset binding from the user for it
        return [bindings[input_file.id] as DataResource];
    } else if (input_file.value) {
        // There is a hardcoded value in the model itself
        return input_file.value.resources;
    }
    return [];
}
