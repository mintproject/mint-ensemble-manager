import { DateRange, Region, MintPreferences, DatasetQueryParameters, Dataset } from "./mint-types";
import * as rp from "request-promise-native";

const getDatasetsFromDCResponse = (obj: any, queryParameters: DatasetQueryParameters) => {
    let datasets = obj.datasets.map((ds: any) => {
        let dmeta = ds['dataset_metadata'];
        return {
            id: ds['dataset_id'],
            name: ds['dataset_name'] || '',
            region: '',
            variables: queryParameters.variables,
            time_period: dmeta['temporal_coverage'] ? {
                start_date: (dmeta['temporal_coverage']['start_time'] ?
                    new Date(dmeta['temporal_coverage']['start_time'])
                    : null),
                end_date: (dmeta['temporal_coverage']['end_time'] ?
                    new Date(dmeta['temporal_coverage']['end_time'])
                    : null),
            } : null,
            description: dmeta['dataset_description'] || '',
            version: dmeta['version'] || '',
            limitations: dmeta['limitations'] || '',
            source: {
                name: dmeta['source'] || '',
                url: dmeta['source_url'] || '',
                type: dmeta['source_type'] || '',
            },
            is_cached: dmeta['is_cached'] || false,
            resource_count: dmeta['resource_count'] || 0,
            datatype: dmeta["datatype"] || dmeta["data_type"] || "",
            categories: dmeta["category_tags"] || [],
            resources: [] as any[]            
        }
    });
    return datasets;
}

const getDatasetResourceListFromDCResponse = (obj: any) => {
    let resources : any[] = [];
    obj.resources.map((row: any) => {
        let rmeta = row["resource_metadata"];
        let tcover = rmeta["temporal_coverage"];
        let scover = rmeta["spatial_coverage"];
        let tcoverstart = tcover ? new Date(tcover["start_time"]) : null;
        let tcoverend = tcover ? new Date(tcover["end_time"]) : null;
        
        resources.push({
            id: row["resource_id"],
            name: row["resource_name"],
            url: row["resource_data_url"],
            time_period: {
                start_date: tcoverstart,
                end_date: tcoverend
            },
            spatial_coverage: scover,
            selected: true
        });    
    });
    return resources;
}

// Query Dataset details and fetch dataset resources for a region and time-period
export const queryDatasetDetails = async (modelid: string, inputid: string, driving_variables: string[],
    dsid: string, dates: DateRange, region: Region, prefs:MintPreferences ) : Promise<Dataset> => {
    
    return new Promise<any>((resolve, reject) => {
        let dsQueryData = {
            standard_variable_names__in: driving_variables,
            spatial_coverage__intersects: region.geometries[0],
            end_time__gte: dates.start_date.toISOString().replace(/\.\d{3}Z$/,''),
            start_time__lte: dates.end_date.toISOString().replace(/\.\d{3}Z$/,''),
            dataset_ids__in: [dsid],
            limit: 100
        }

        let resQueryData : any = {
            dataset_id: dsid,
            filter: {
                spatial_coverage__intersects: region.geometries[0],
                end_time__gte: dates.start_date.toISOString().replace(/\.\d{3}Z$/,''),
                start_time__lte: dates.end_date.toISOString().replace(/\.\d{3}Z$/,'')
            },
            limit: 5000
        }

        rp.post({
            url: prefs.data_catalog_api + "/datasets/find",
            headers: {'Content-Type': 'application/json'},
            body: dsQueryData,
            json: true
        }).then((obj) => {
            let datasets: Dataset[] = getDatasetsFromDCResponse(obj, 
                {variables: driving_variables} as DatasetQueryParameters);
            
            if(datasets.length > 0) {
                let ds = datasets[0];
                rp.post({
                    url: prefs.data_catalog_api + "/datasets/dataset_resources",
                    headers: {'Content-Type': 'application/json'},
                    body: resQueryData,
                    json: true
                }).then((resobj) => {
                    ds.resources = getDatasetResourceListFromDCResponse(resobj);
                    resolve(ds);
                })
            } else {
                reject();
            }
        });
    });
};

export const registerDataset = async (dataset: Dataset, prefs: MintPreferences) : Promise<boolean> => {
    // If datacatalog is CKAN, we need to convert the dataset object to CKAN format and convert
    if (prefs.data_catalog_type == "CKAN") {
        return await registerCKANDataset(dataset, prefs);
    }
    else {
        // Register in internal data catalog
    }
};

export const registerCKANDataset = async (dataset: Dataset, prefs: MintPreferences) : Promise<boolean> => {
    let ckan_dataset = {
        name: dataset.name,
        title: dataset.name,
        notes: dataset.description,
        owner_org: prefs.data_catalog_extra.owner_organization_id,
        private: false,
        version: dataset.version,
        extras: [
            { 
                key: "spatial",
                value: dataset.spatial_coverage || ""
            }
        ],
        tags: dataset.variables.map((v) => { 
            return { name: "stdvar." + v }
        }),
        resources: dataset.resources.map((res) => {
            return {
                name: res.name,
                url: res.url
            }
        })
    };
    return new Promise<boolean>((resolve, reject) => {
        rp.post({
            url: prefs.data_catalog_api + "/api/action/package_create",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': prefs.data_catalog_key
            },
            body: ckan_dataset,
            json: true
        }).then((obj) => {
            resolve(true);
        }).catch((err) => {
            console.log(err);
            reject(err);
        });
    });
}