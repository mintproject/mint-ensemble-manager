import {
    deleteThreadModelExecutionIds,
    getExecutionHash,
    getModelInputConfigurations,
    getRegionDetails,
    incrementThreadModelSubmittedRuns,
    incrementThreadModelSuccessfulRuns,
    listSuccessfulExecutionIds,
    setExecutions,
    setThreadModelExecutionIds,
    setThreadModelExecutionSummary
} from "../graphql/graphql_functions";
import {
    Execution,
    ExecutionSummary,
    Model,
    ModelIO,
    ModelParameter,
    Region,
    Thread,
    ThreadModelMap
} from "../mint/mint-types";
import { TapisComponent } from "../tapis/typing";

const MAX_CONFIGURATIONS = 1000000;
// Add interface for IO/Parameter details
interface ComponentIODetails {
    id: string;
    role: string;
    prefix: string;
    isParam: boolean;
    format?: string;
    type: string;
}

export class ExecutionCreation {
    private static readonly BATCH_SIZE = 500;
    public thread: Thread;
    public threadRegion: Region;
    public modelid: string;
    public executionToBeRun: Execution[];
    public model: Model;
    public component: TapisComponent;

    constructor(thread: Thread, modelid: string) {
        this.thread = thread;
        this.modelid = modelid;
        this.executionToBeRun = [];
    }

    public async prepareExecutions(): Promise<boolean> {
        try {
            for (const pmodelid in this.thread.model_ensembles) {
                if (!this.modelid || this.modelid === pmodelid) {
                    return await this.prepareModelExecutions(pmodelid);
                }
            }
            return true;
        } catch (error) {
            console.error("Error preparing executions:", error);
            throw error;
        }
    }

    private async prepareModelExecutions(modelid: string): Promise<boolean> {
        if (!this.thread.execution_summary) this.thread.execution_summary = {};

        this.model = this.thread.models[modelid];
        const modelEnsembleId = this.thread.model_ensembles[modelid].id;
        this.threadRegion = await getRegionDetails(this.thread.regionid);
        const executionDetails = ExecutionCreation.getModelInputBindings(
            this.model,
            this.thread,
            this.threadRegion
        );
        const threadModel = executionDetails[0] as ThreadModelMap;
        const inputIds = executionDetails[1] as string[];
        const configs = getModelInputConfigurations(threadModel, inputIds);
        if (configs !== null) {
            await this.createExecutions(configs, modelEnsembleId, inputIds, modelid);
        }
        return true;
    }

    private async createExecutions(
        configs: Array<Array<string | number>>,
        thread_model_id: string,
        inputIds: string[],
        modelid: string
    ): Promise<void> {
        await this.createThreadModelExecutionSummary(configs, thread_model_id);
        await deleteThreadModelExecutionIds(thread_model_id);
        this.model = this.thread.models[modelid];
        this.component = await this.getModelDetails(this.model);

        for (let i = 0; i < configs.length; i += ExecutionCreation.BATCH_SIZE) {
            const bindings = configs.slice(i, i + ExecutionCreation.BATCH_SIZE);
            const executionsBatch = this.createExecutionsBatch(bindings, inputIds, modelid);
            const executionIdsBatch = executionsBatch.map((e) => e.id);

            const successful_execution_ids = await listSuccessfulExecutionIds(executionIdsBatch);
            const executions_to_be_run = executionsBatch.filter(
                (e) => successful_execution_ids.indexOf(e.id) < 0
            );

            await setExecutions(executions_to_be_run, thread_model_id);
            await setThreadModelExecutionIds(thread_model_id, executionIdsBatch);
            await this.updateSuccessfulExecutionOnThread(successful_execution_ids, thread_model_id);
            await incrementThreadModelSubmittedRuns(thread_model_id, executions_to_be_run.length);
            this.executionToBeRun = [...this.executionToBeRun, ...executions_to_be_run];
        }
    }

    private async updateSuccessfulExecutionOnThread(
        successful_execution_ids: string[],
        thread_model_id: string
    ): Promise<void> {
        const num_already_run = successful_execution_ids.length;
        if (num_already_run > 0) {
            await incrementThreadModelSubmittedRuns(thread_model_id, num_already_run);
            await incrementThreadModelSuccessfulRuns(thread_model_id, num_already_run);
        }
    }

    private async createThreadModelExecutionSummary(
        configs: any[][],
        thread_model_id: string
    ): Promise<void> {
        const summary: ExecutionSummary = {
            total_runs: configs.length,
            submitted_runs: 0,
            failed_runs: 0,
            successful_runs: 0,
            workflow_name: "",
            submitted_for_execution: true,
            submission_time: new Date(),
            submitted_for_ingestion: false,
            fetched_run_outputs: 0,
            ingested_runs: 0,
            submitted_for_registration: false,
            registered_runs: 0,
            submitted_for_publishing: false,
            published_runs: 0
        };
        await setThreadModelExecutionSummary(thread_model_id, summary);
    }

    private createExecutionsBatch(
        bindings: any[][],
        inputIds: string[],
        modelid: string
    ): Execution[] {
        return bindings.map((binding) => {
            const inputBindings: any = {};
            for (let j = 0; j < inputIds.length; j++) {
                inputBindings[inputIds[j]] = binding[j];
            }
            return this.createExecutionMetadata(modelid, inputBindings);
        });
    }

    private createExecutionMetadata(modelid: string, inputBindings: any): Execution {
        const execution: Execution = {
            modelid: modelid,
            bindings: inputBindings,
            execution_engine: "localex",
            runid: null,
            status: null,
            results: [],
            start_time: new Date(),
            selected: true
        };
        execution.id = getExecutionHash(execution);
        return execution;
    }

    private async getModelDetails(model: Model): Promise<TapisComponent> {
        const comp = await this.loadComponent(model.code_url);
        comp.inputs = [];
        comp.outputs = [];

        model.input_files.forEach((input) => {
            const details = this._getModelIODetails(input, "input");
            if (!details) throw new Error("Input file missing position: " + input.id);
            comp.inputs.push(details);
        });

        model.input_parameters.forEach((param) => {
            const details = this._getModelParamDetails(param);
            if (!details) throw new Error("Input parameter missing position: " + param.id);
            comp.inputs.push(details);
        });

        model.output_files.forEach((output) => {
            const details = this._getModelIODetails(output, "output");
            if (!details) throw new Error("Output file missing position: " + output.id);
            comp.outputs.push(details);
        });

        return comp;
    }

    private async loadComponent(component_url: string): Promise<TapisComponent> {
        try {
            const response = await fetch(component_url);
            if (response.ok) {
                const data = await response.text();
                const component = JSON.parse(data) as TapisComponent;
                console.log(component);
                if (component.id && component.version) {
                    return component;
                }
                console.error(`Invalid component: ${component_url}`);
                throw new Error("Invalid component");
            }
            throw new Error(`Response status not ok: ${component_url}`);
        } catch (e) {
            console.log(e);
            throw Error(`Error loading component ${component_url}`);
        }
    }

    private _getModelIODetails(io: ModelIO, iotype: string): ComponentIODetails | null {
        if (!io.position) {
            return null;
        }
        const pfx = iotype === "input" ? "-i" : "-o";
        return {
            id: io.id,
            role: io.name,
            prefix: pfx + io.position,
            isParam: false,
            format: io.format,
            type: io.type
        };
    }

    private _getModelParamDetails(param: ModelParameter): ComponentIODetails {
        return {
            id: param.id,
            role: param.name,
            prefix: "-p" + param.position,
            isParam: true,
            type: param.type
        };
    }

    private static getModelInputBindings = (model: Model, thread: Thread, region: Region) => {
        const me = thread.model_ensembles[model.id];
        const threadModel = {
            id: me.id,
            bindings: Object.assign({}, me.bindings)
        } as ThreadModelMap;
        const inputIds: any[] = [];

        model.input_files.map((io) => {
            inputIds.push(io.id);
            if (!io.value) {
                // Expand a dataset to it's constituent "selected" resources
                // FIXME: Create a collection if the model input has dimensionality of 1
                if (threadModel.bindings[io.id]) {
                    console.log(threadModel.bindings[io.id]);
                    let nexecution: any[] = [];
                    threadModel.bindings[io.id].map((dsid) => {
                        const ds = thread.data[dsid];
                        let selected_resources = ds.resources.filter((res) => res.selected);
                        // Fix for older saved resources
                        if (selected_resources.length == 0) selected_resources = ds.resources;
                        nexecution = nexecution.concat(selected_resources);
                    });
                    threadModel.bindings[io.id] = nexecution;
                }
            } else {
                threadModel.bindings[io.id] = io.value.resources as any[];
            }
        });

        // Add adjustable parameters to the input ids
        model.input_parameters.map((io) => {
            inputIds.push(io.id);

            if (io.value) {
                // If this is a non-adjustable parameter, set the binding value to the fixed value
                threadModel.bindings[io.id] = [io.value];
            }

            // HACK: Add region id to __region_geojson (Not replacing )
            if (
                threadModel.bindings[io.id] &&
                threadModel.bindings[io.id][0] == "__region_geojson"
            ) {
                threadModel.bindings[io.id] = ["__region_geojson:" + region.id];
            }
        });

        return [threadModel, inputIds];
    };

    private static getModelInputConfigurations = (
        threadModel: ThreadModelMap,
        inputIds: string[]
    ) => {
        const dataBindings = threadModel.bindings;
        const inputBindings: any[] = [];
        let totalproducts = 1;
        inputIds.map((inputid) => {
            inputBindings.push(dataBindings[inputid]);
            if (dataBindings[inputid]) totalproducts *= dataBindings[inputid].length;
        });
        if (totalproducts < MAX_CONFIGURATIONS) {
            return ExecutionCreation.cartProd(inputBindings);
        } else {
            return null;
        }
    };

    private static cartProd = (lists: any[]) => {
        let ps: any[] = [],
            acc: any[][] = [[]],
            i = lists.length;
        while (i--) {
            let subList = lists[i],
                j = subList.length;
            while (j--) {
                let x = subList[j],
                    k = acc.length;
                while (k--) ps.push([x].concat(acc[k]));
            }
            acc = ps;
            ps = [];
        }
        return acc.reverse();
    };
}
