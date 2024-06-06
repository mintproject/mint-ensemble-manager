import { Region } from "@mintproject/modelcatalog_client";
import {
    Component,
    ComponentSeed,
    ComponentDataBindings,
    ComponentParameterBindings,
    ComponentParameterTypes
} from "../localex/local-execution-types";
import { Thread, Execution, MintPreferences, ModelIO, DataResource } from "../mint/mint-types";
import Queue from "bull";
import { EXECUTION_QUEUE_NAME, REDIS_URL } from "../../config/redis";

const executionQueueBull = new Queue(EXECUTION_QUEUE_NAME, REDIS_URL);
// Create Jobs (Seeds) and Queue them
export const queueModelExecutionsLocally = async (
    thread: Thread,
    modelid: string,
    component: Component,
    region: Region,
    executions: Execution[],
    prefs: MintPreferences
): Promise<Queue.Job<any>[]> => {
    const seeds: ComponentSeed[] = [];
    const registered_resources: any = {};
    const downloadInputPromises = [];

    const model = thread.models[modelid];
    const thread_model_id = thread.model_ensembles[modelid].id;

    // Get all input dataset bindings and parameter bindings
    executions.map((execution) => {
        const bindings = execution.bindings;
        const datasets: ComponentDataBindings = {};
        const parameters: ComponentParameterBindings = {};
        const paramtypes: ComponentParameterTypes = {};

        // Get input datasets
        model.input_files.map((io: ModelIO) => {
            let resources: DataResource[] = [];
            let dsid = null;
            if (bindings[io.id]) {
                // We have a dataset binding from the user for it
                resources = [bindings[io.id] as DataResource];
            } else if (io.value) {
                // There is a hardcoded value in the model itself
                dsid = io.value.id;
                resources = io.value.resources;
            }
            if (resources.length > 0) {
                const type = io.type.replace(/^.*#/, "");
                const newresources: any = {};
                resources.map((res) => {
                    let resid = res.id;
                    let resname = res.name;
                    if (res.url) {
                        resname = res.url.replace(/^.*(#|\/)/, "");
                        resname = resname.replace(/^([0-9])/, "_$1");
                        if (!resid) resid = resname;
                    }
                    newresources[resid] = {
                        id: resid,
                        url: res.url,
                        name: resname,
                        time_period: res.time_period,
                        spatial_coverage: res.spatial_coverage
                    } as DataResource;
                    registered_resources[resid] = [resname, type, res.url];
                });
                datasets[io.id] = resources.map((res) => newresources[res.id]);
            }
        });

        // Get Input parameters
        model.input_parameters.map((ip) => {
            if (ip.value) {
                parameters[ip.id] = ip.value.toString();
            } else if (bindings[ip.id]) {
                const value = bindings[ip.id];
                parameters[ip.id] = value.toString();
            }
            // HACK: Replace region geojson
            if (parameters[ip.id].match(/__region_geojson:(.+)/)) {
                const region_geojson = _getRegionGeoJson(region);
                parameters[ip.id] = region_geojson;
            }

            paramtypes[ip.id] = ip.type;
        });

        seeds.push({
            component: component,
            execution: execution,
            datasets: datasets,
            parameters: parameters,
            paramtypes: paramtypes
        } as ComponentSeed);
    });

    // Add Download Job to Queue (if it doesn't already exist)
    for (const resid in registered_resources) {
        const args = registered_resources[resid];
        const inputpath = prefs.localex.datadir + "/" + args[0];
        const inputurl = args[2];
        if (!fs.existsSync(inputpath))
            downloadInputPromises.push(_downloadFile(inputurl, inputpath));
    }

    // Download all datasets
    if (downloadInputPromises.length > 0) await Promise.all(downloadInputPromises);

    // Once all Downloads are finished, Add all execution jobs (seeds) to queue
    const numseeds = seeds.length;
    const priority =
        numseeds < 10 ? 1 : numseeds < 50 ? 2 : numseeds < 200 ? 3 : numseeds < 500 ? 4 : 5;

    return Promise.all(
        seeds.map((seed) =>
            executionQueueBull.add(
                {
                    seed: seed,
                    prefs: prefs.localex,
                    thread_id: thread.id,
                    thread_model_id: thread_model_id
                },
                {
                    priority: priority
                    //jobId: seed.execution.id,
                    //removeOnComplete: true,
                    //attempts: 2
                }
            )
        )
    );
};
