import { Task, Thread, ProblemStatementInfo, ProblemStatement, ThreadInfo, MintEvent, ModelEnsembleMap, 
    ModelIOBindings, Execution, ExecutionSummary, DataMap, ThreadModelMap, Dataslice, ModelIO, Dataset, Model, ModelParameter, DataResource } from "../mint/mint-types"

import * as crypto from 'crypto';
import { Region } from "../mint/mint-types";


export const regionFromGQL = (regionobj: any) : Region => {
    let region = {
        id: regionobj.id,
        name: regionobj.name,
        category_id: regionobj.category_id,
        geometries: regionobj.geometries.map((geoobj: any) => geoobj["geometry"]),
        model_catalog_uri: regionobj.model_catalog_uri
    } as Region;
    return region;
}

export const eventFromGQL = (eventobj: any) : MintEvent => {
    let event = {
        event: eventobj.event,
        userid: eventobj.userid,
        timestamp: new Date(eventobj.timestamp),
        notes: eventobj.notes
    } as MintEvent;
    return event;
}

export const problemStatementFromGQL = (problem: any) : ProblemStatement => {
    let details = {
        id : problem["id"],
        regionid: problem["region_id"],
        name: problem["name"],
        dates: {
            start_date: new Date(problem["start_date"]),
            end_date: new Date(problem["end_date"])
        },
        events: problem["events"].map(eventFromGQL),
        tasks: {}
    } as ProblemStatement;
    if(problem["tasks"]) {
        problem["tasks"].forEach((task:any) => {
            let fbtask = taskFromGQL(task);
            fbtask.problem_statement_id = problem["id"];
            details.tasks[fbtask.id] = fbtask;
        })
    }
    return details;
}

export const taskFromGQL = (task: any) : Task => {
    let taskobj = {
        id : task["id"],
        problem_statement_id: task["problem_statement_id"],
        regionid: task["region_id"],
        name: task["name"],
        dates: {
            start_date: new Date(task["start_date"]),
            end_date: new Date(task["end_date"])
        },
        threads: {},
        driving_variables: task.driving_variable_id != null ? [task.driving_variable_id] : [],
        response_variables: task.response_variable_id != null ? [task.response_variable_id] : [],
        events: task["events"].map(eventFromGQL),
    } as Task;
    if(task["threads"]) {
        task["threads"].forEach((thread:any) => {
            let fbthread = threadInfoFromGQL(thread);
            fbthread.task_id = task["id"];
            taskobj.threads[fbthread.id] = fbthread;
        });
    }
    return taskobj;
}

export const threadInfoFromGQL = (thread: any) => {
    return {
        id : thread["id"],
        name: thread["name"],
        dates: {
            start_date: new Date(thread["start_date"]),
            end_date: new Date(thread["end_date"])
        },
        regionid: thread["region_id"],
        driving_variables: thread.driving_variable_id != null ? [thread.driving_variable_id] : [],
        response_variables: thread.response_variable_id != null ? [thread.response_variable_id] : [],
        events: thread["events"].map(eventFromGQL),
    } as ThreadInfo;
}

export const threadFromGQL = (thread: any) => {
    let fbthread = {
        id : thread["id"],
        task_id: thread["task_id"],
        regionid: thread["region_id"],
        name: thread["name"],
        dates: {
            start_date: new Date(thread["start_date"]),
            end_date: new Date(thread["end_date"])
        },
        driving_variables: thread.driving_variable_id != null ? [thread.driving_variable_id] : [],
        response_variables: thread.response_variable_id != null ? [thread.response_variable_id] : [],
        execution_summary: {},
        events: thread["events"].map(eventFromGQL),
        models: {},
        data: {},
        model_ensembles: {}
    } as Thread;
    
    thread["thread_data"].forEach((tm:any) => {
        let m = tm["dataslice"];
        let dataslice : Dataslice = dataFromGQL(m);
        fbthread.data[dataslice.id] = dataslice;
    })

    thread["thread_models"].forEach((tm:any) => {
        let m = tm["model"];
        let model : Model = modelFromGQL(m);
        fbthread.models[model.id] = model;
        let model_ensemble = modelEnsembleFromGQL(tm["data_bindings"], tm["parameter_bindings"]);
        fbthread.model_ensembles[model.id] = {
            id: tm["id"],
            bindings: model_ensemble
        }

        tm["execution_summary"].forEach((tmex: any) => {
            fbthread.execution_summary[model.id] = {
                total_runs: tmex["total_runs"],
                submitted_runs: tmex["submitted_runs"],
                successful_runs: tmex["successful_runs"],
                failed_runs: tmex["failed_runs"],
                ingested_runs: tmex["ingested_runs"],
                registered_runs: tmex["registered_runs"],
                published_runs: tmex["published_runs"],
                submission_time: tmex["submission_time"],
                submitted_for_execution: tmex["submitted_for_execution"],
                fetched_run_outputs: tmex["fetched_run_outputs"],
                submitted_for_ingestion: tmex["submitted_for_ingestion"],
                submitted_for_publishing: tmex["submitted_for_publishing"],
                submitted_for_registration: tmex["submitted_for_registration"]
            } as ExecutionSummary
        });
    })
    return fbthread;
}

export const getTotalConfigs = (model: Model, bindings: ModelIOBindings, thread: Thread) => {
    let totalconfigs = 1;
    model.input_files.map((io) => {
        if(!io.value) {
            // Expand a dataset to it's constituent resources
            // FIXME: Create a collection if the model input has dimensionality of 1
            if(bindings[io.id]) {
                let nensemble : any[] = [];
                bindings[io.id].map((dsid) => {
                    let ds = thread.data[dsid];
                    let selected_resources = ds.resources.filter((res) => res.selected);
                    // Fix for older saved resources
                    if(selected_resources.length == 0) 
                        selected_resources = ds.resources;
                    nensemble = nensemble.concat(selected_resources);
                });
                totalconfigs *= nensemble.length;
            }
        }
        else {
            totalconfigs *= (io.value.resources as any[]).length;
        }
    })
    
    // Add adjustable parameters to the input ids
    model.input_parameters.map((io) => {
        if(!io.value)
            totalconfigs *= bindings[io.id].length;
    });

    return totalconfigs;
}

export const dataFromGQL = (d: any) => {
    let ds = d["dataset"];
    return {
        id: d["id"],
        name: ds["name"],
        resources: d["resources"].map((resobj:any) => {
            let res = resourceFromGQL(resobj["resource"]);
            res.selected = resobj["selected"];
            return res;
        }),
        time_period: {
            start_date: ds["start_date"],
            end_date: ds["end_date"]
        },
        resource_count: d["resources"].length,
        dataset: {
            id: ds["id"],
            name: ds["name"]
        } as Dataset
    } as Dataslice;
}

export const modelFromGQL = (mobj: any) => {
    let m = Object.assign({}, mobj);
    if ( typeof m['type'] === 'undefined') {
        console.error("undefined type")
        m["type"] = "Theory-GuidedModel"
    }
    m["input_files"] = (m["inputs"] as any[]).map((input) => {
        return modelIOFromGQL(input);
    });
    delete m["inputs"];
    m["output_files"] = (m["outputs"] as any[]).map((output) => {
        return modelIOFromGQL(output);
    });
    delete m["outputs"];
    m["input_parameters"] = (m["parameters"] as any[]).map((parameter) => {
        return modelParameterFromGQL(parameter);
    });
    delete m["parameters"];
    return m;
}

export const modelIOFromGQL = (model_io: any) => {
    let io = model_io["model_io"];
    let fixed_ds = (io["fixed_bindings"] && io["fixed_bindings"].length > 0) ? 
        {
            id: io.id + "_fixed_dataset",
            name: io.name + "_fixed_dataset",
            resources: io["fixed_bindings"].map((res:any) => {
                return res["resource"]
            })
        } as Dataslice
        : null;
    return {
        id: io["id"],
        name: io["name"],
        type: io["type"],
        value: fixed_ds,
        position: model_io["position"],
        variables: io["variables"].map((varobj:any) => {
            let v = varobj["variable"];
            return v["id"];
        })
    } as ModelIO
}

export const modelParameterFromGQL = (p: any) => {
    return {
        id: p["id"],
        name: p["name"],
        type: p["type"],
        accepted_values: p["accepted_values"],
        adjustment_variable: p["adjustment_variable"],
        default: p["default"],
        description: p["description"],
        max: p["max"],
        min: p["min"],
        unit: p["unit"],
        value: p["fixed_value"],
        position: p["position"]
    } as ModelParameter
}

export const modelEnsembleFromGQL = (dbs: any[], pbs: any[]): ModelIOBindings => {
    let bindings = {} as ModelIOBindings;
    dbs.forEach((db) => {
        let binding = bindings[db["model_io"]["id"]];
        if(!binding)
            binding = [];
        binding.push(db["dataslice_id"]);
        bindings[db["model_io"]["id"]] = binding;
    })
    pbs.forEach((pb) => {
        let binding = bindings[pb["model_parameter"]["id"]];
        if(!binding)
            binding = [];
        binding.push(pb["parameter_value"]);
        bindings[pb["model_parameter"]["id"]] = binding;        
    })
    return bindings;
}

export const toDateString = (date: Date) : string => {
    if(!date)
        return null;
    let dateString = typeof(date) == "string" ? date : date.toISOString();
    return dateString.split('T')[0]
}

export const toDateTimeString = (date: Date) : string => {
    if(!date)
        return null;
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

export const getDates = (dates:any) => {
    let start = dates["start_date"]
    let end = dates["end_date"]
    return {
        "start_date" : toDateString(start),
        "end_date": toDateString(end)
    }
}

export const getResourceData = (data:any) => {
    let dates = getDates(data["time_period"])
    return {
        "data": {
            "id": getMd5Hash(data["url"]),
            "dcid": data["id"],
            "name": data["name"],
            "spatial_coverage": data["spatial_coverage"],
            "start_date": dates?.start_date,
            "end_date": dates?.end_date,
            "url": data["url"]
        },
        "on_conflict": {
            "constraint": "resource_pkey",
            "update_columns": ["id"]
        }
    }
}

export const executionResultsToGQL = (results: any) => {
    let data: any = [];
    Object.keys(results).forEach((outid) => {
        let result = results[outid];
        data.push({
            model_io_id: outid,
            resource: getResourceData(result)
        });
    })
    return data;
}

export const executionToGQL = (ex: Execution) : any => {
    let exobj = {
        id: ex.id,
        model_id: ex.modelid,
        status: ex.status,
        start_time: ex.start_time,
        execution_engine: ex.execution_engine,
        run_progress: ex.run_progress,
        run_id: ex.runid,
        parameter_bindings: {
            data: [] as any
        },
        data_bindings: {
            data: [] as any
        },
        results: {
            data: [] as any
        }
    }
    Object.keys(ex.bindings).forEach((ioid) => {
        let binding = ex.bindings[ioid];
        if (typeof(binding) == 'string') {
            exobj.parameter_bindings.data.push({
                model_parameter_id: ioid,
                parameter_value: binding+"",
            })
        }
        else {
            exobj.data_bindings.data.push({
                model_io_id: ioid,
                resource_id: binding["id"]
            })
        }
    })
    exobj.results.data = executionResultsToGQL(ex.results);
    return exobj;
}

export const executionFromGQL = (ex: any) : Execution => {
    let exobj = {
        id: ex.id,
        modelid: ex.model_id,
        status: ex.status,
        start_time: ex.start_time,
        end_time: ex.end_time,
        execution_engine: ex.execution_engine,
        run_progress: ex.run_progress,
        runid: ex.run_id,
        bindings: {},
        results: {}
    } as Execution;
    ex.parameter_bindings.forEach((param:any) => {
        exobj.bindings[param.model_parameter_id] = param.parameter_value;
    });
    ex.data_bindings.forEach((data:any) => {
        exobj.bindings[data.model_io_id] = data.resource as DataResource;
    });
    ex.results.forEach((data:any) => {
        exobj.results[data.model_output_id] = data.resource as DataResource;
    });
    return exobj;
}

export const resourceToGQL = (resource: DataResource) => {
    let resourceobj = {
        id: resource.id,
        name: resource.name,
        url: resource.url,
        start_date: resource.time_period?.start_date,
        end_date: resource.time_period?.end_date
    };
    return resourceobj;
}

export const resourceFromGQL = (resourceobj: any) : DataResource => {
    let resource = {
        id: resourceobj.id,
        name: resourceobj.name,
        url: resourceobj.url,
        spatial_coverage: resourceobj.spatial_coverage,
        time_period: {
            start_date: new Date(resourceobj.start_date),
            end_date: new Date(resourceobj.end_date)
        }
    } as DataResource;
    return resource;
}

export const getAutoID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let autoId = ''
    for (let i = 0; i < 20; i++) {
      autoId += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return autoId;
}

const getMd5Hash = (str2hash: string) => {
    return crypto.createHash('md5').update(str2hash).digest("hex");
}


export const executionSummaryToGQL = (summary: ExecutionSummary) => {
    let exobj = Object.assign({}, summary) as any;
    exobj["submission_time"] = toDateTimeString(summary.submission_time);
    return exobj;
}

export const executionSummaryFromGQL = (summary: any) : ExecutionSummary => {
    let exobj = Object.assign({}, summary) as ExecutionSummary;
    return exobj;
}

export const eventToGQL = (event: MintEvent) => {
    let eventobj = {
        event: event.event,
        userid: event.userid,
        timestamp: event.timestamp.toISOString(),
        notes: event.notes
    };
    return eventobj;
}

export const threadInfoToGQL = (thread: ThreadInfo, taskid: string, regionid: string) => {
    let threadobj = {
        id: getAutoID(),
        name: thread.name,
        task_id: taskid,
        start_date: toDateString(thread.dates.start_date),
        end_date: toDateString(thread.dates.end_date),
        region_id: regionid,
        response_variable_id: thread.response_variables[0],
        driving_variable_id: thread.driving_variables.length > 0 ? thread.driving_variables[0] : null
    };
    return threadobj;
}

export const threadInfoUpdateToGQL = (thread:  ThreadInfo) => {
    let threadobj = {
        id: thread.id,
        task_id: thread.task_id,
        name: thread.name,
        start_date: toDateString(thread.dates.start_date),
        end_date: toDateString(thread.dates.end_date),
        response_variable_id: thread.response_variables[0],
        driving_variable_id: thread.driving_variables.length > 0 ? thread.driving_variables[0] : null,
        events: {
            data: thread.events.map(eventToGQL),
        }
    };
    return threadobj;
}


export const threadModelsToGQL = (models: Model[], threadid: string) => {
    return models.map((model) => {
        return {
            "thread_id": threadid,
            "model": {
                "data": modelToGQL(model),
                "on_conflict": {
                    "constraint": "model_pkey",
                    "update_columns": ["name"]
                }
            }
        };
    });
}

const getNamespacedId = (namespace, id) => {
    if(id.indexOf(namespace) == 0)
        return id;
    return namespace + id
}

const modelInputOutputToGQL = (io: any) => {
    return {
        "position": io["position"],
        "model_io": {
            "data": modelIOToGQL(io),
            "on_conflict": {
                "constraint": "model_io_pkey",
                "update_columns": ["id"]
            }
        }
    }
}

const getVariableData = (variableid) => {
    return {
        "data": {
            "id": variableid
        },
        "on_conflict": {
            "constraint": "variable_pkey",
            "update_columns": ["id"]
        }
    }
}
const getModelIOFixedBindings = (io) => {
    let fixed_bindings_data = []
    //console.log(io)
    if ("value" in io && io["value"] && "resources" in io["value"]) {
        io["value"]["resources"].forEach((res: any) => {
            if (!("name" in res)) {
                res["name"] = res["url"].replace(/^.*\/(.*?)$/, "$1");
                fixed_bindings_data.push({
                    "resource": {
                        "data": {
                            "id": getMd5Hash(res["url"]),
                            "name": res["name"],
                            "url": res["url"]
                        },
                        "on_conflict": {
                            "constraint": "resource_pkey",
                            "update_columns": ["name"]
                        }
                    }
                })
            }
        });
    }
    return {
        "data": fixed_bindings_data,
        "on_conflict": {
            "constraint": "model_input_bindings_pkey",
            "update_columns": ["resource_id"]
        }
    }
}


const modelIOToGQL = (io: any) => {
    let fixed_bindings = getModelIOFixedBindings(io)
    return {
        "id": io["id"],
        "name": io["name"],
        "type": io["type"],
        "fixed_bindings": fixed_bindings,
        "variables": {
            "data": io["variables"].map((v) => { 
                return { 
                    "variable": getVariableData(v)
                };
            }),
            "on_conflict": {
                "constraint": "model_io_variable_pkey",
                "update_columns": ["variable_id"]
            }
        }
    }
}

const modelParameterToGQL = (input: ModelParameter) => {
    if ("default" in input && input["default"])
        input["default"] = input["default"] + "";
    if ("value" in input && input["value"])
        input["fixed_value"] = input["value"] + "";
    delete input["value"]
    return input
}

export const modelToGQL = (m: Model) => {
    let namespace = m.id.replace(/(^.*\/).*$/, "$1");
    console.log("=== " + m.model_type + " ==== ") 
    return {
        "id": m.id,
        "name": m.name,
        "category": m.category,
        "description": m.description,
        "region_name": m.region_name,
        "type": "Theory-GuidedModel",
        "model_configuration": getNamespacedId(namespace, m.model_configuration),
        "model_version": getNamespacedId(namespace, m.model_version),
        "model_name": getNamespacedId(namespace, m.model_name),
        "dimensionality": m.dimensionality,
        "parameter_assignment": m.parameter_assignment,
        "parameter_assignment_details": m.parameter_assignment_details,
        "calibration_target_variable": m.calibration_target_variable,
        "spatial_grid_resolution": m.spatial_grid_resolution,
        "spatial_grid_type": m.spatial_grid_type,
        "output_time_interval": m.output_time_interval,
        "code_url": m.code_url,
        "usage_notes": m.usage_notes,
        "inputs": {
            "data": m.input_files.map((input) => modelInputOutputToGQL(input)),
            "on_conflict": {
                "constraint": "model_input_pkey",
                "update_columns": ["model_id"]
            }
        },
        "parameters": {
            "data": m.input_parameters.map((param) => modelParameterToGQL(param)),
            "on_conflict": {
                "constraint": "model_parameter_pkey",
                "update_columns": ["model_id"]
            }
        },
        "outputs": {
            "data": m.output_files.map((output) => modelInputOutputToGQL(output)),
            "on_conflict": {
                "constraint": "model_output_pkey",
                "update_columns": ["model_id"]
            }
        }
    };
}

export const getCustomEvent = (event:string, notes: string, email: string) => {
    return {
        event: event,
        timestamp: new Date(),
        userid: email,
        notes: notes
    } as MintEvent;
}