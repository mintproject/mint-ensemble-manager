import model from "./fixtures/model";
import bindings from "./fixtures/bindings";
import { getInputDatasets } from "../helpers";
test("get inputs datasets", () => {
    const registered_resources = {};
    const datasets = getInputDatasets(model, bindings, registered_resources);
    console.log(datasets);
});
