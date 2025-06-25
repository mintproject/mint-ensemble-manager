import { DataResource, Dataset, MintPreferences } from "../mint-types";
import { IDataCatalog } from "./IDatacatalog";
import CKAN, { Dataset as CKANDataset, Tag, Resource as CKANResource } from "@pkyeck/ckan-ts";
import http from "http";
import https from "https";

interface CreateDataset {
    name: string;
    title: string;
    notes: string;
    owner_org: string;
    private: boolean;
    version: string;
    extras?: {
        key: string;
        value: string;
    }[];
    tags?: Tag[];
    resources?: CKANResource[];
}

interface CreateResource {
    package_id: string;
    url: string;
    name?: string;
    format?: string;
    description?: string;
    hash?: string;
    resource_type?: string;
    mimetype?: string;
    mimetype_inner?: string;
    cache_url?: string;
    size?: number;
    created?: string;
    last_modified?: string;
    cache_last_updated?: string;
    upload?: unknown; // FieldStorage for multipart/form-data
}

interface CKANExtra {
    key: string;
    value: string;
}

interface CKANPackageWithExtras extends CKANDataset {
    extras?: CKANExtra[];
}

export class TACC_CKAN_DataCatalog implements IDataCatalog {
    private key: string;
    private url: string;

    constructor(prefs: MintPreferences) {
        this.key = prefs.data_catalog_key || "";
        this.url = prefs.data_catalog_api || "";
    }

    private async getParser(): Promise<CKAN> {
        return new CKAN(this.url, {
            requestOptions: {
                headers: {
                    Authorization: ` ${this.key}`,
                    "Content-Type": "application/json",
                    Connection: "close", // Force close connections
                    "Cache-Control": "no-cache"
                },
                // Conservative HTTP agent settings
                httpAgent: new http.Agent({
                    keepAlive: false, // Don't reuse connections
                    maxSockets: 1, // Only one socket at a time
                    maxFreeSockets: 0, // Don't keep free sockets
                    timeout: 60000, // 60 second timeout
                    scheduling: "fifo" // First in, first out
                }),
                httpsAgent: new https.Agent({
                    keepAlive: false,
                    maxSockets: 1,
                    maxFreeSockets: 0,
                    timeout: 60000,
                    scheduling: "fifo",
                    rejectUnauthorized: process.env.NODE_ENV === "production" // Allow self-signed in dev
                })
            }
        });
    }

    getCatalogType(): string {
        return "TACC_CKAN";
    }

    async registerDataset(dataset: Dataset, owner_org?: string): Promise<string> {
        const parser = await this.getParser();
        const tags = [];
        if (dataset.variables) {
            tags.push(
                ...dataset.variables.map((v) => {
                    return { name: "stdvar." + v } as Tag;
                })
            );
        }
        if (dataset.categories) {
            tags.push(
                ...dataset.categories.map((c) => {
                    return { name: c } as Tag;
                })
            );
        }
        const ckan_dataset: CreateDataset = {
            name: dataset.name,
            title: dataset.name,
            notes: dataset.description,
            owner_org: owner_org || "",
            private: false,
            version: dataset.version,
            // extras: [
            //     {
            //         key: "spatial",
            //         value: dataset.spatial_coverage || ""
            //     }
            // ],
            tags: tags
            // resources: dataset.resources.map((res) => {
            //     return {
            //         name: res.name,
            //         url: res.url
            //     } as CKANResource;
            // })
        };
        const response = await parser.action<CreateDataset, CKANDataset>(
            "package_create",
            ckan_dataset,
            "POST"
        );
        return response.id;
    }

    async deleteDataset(datasetId: string): Promise<void> {
        const parser = await this.getParser();
        await parser.action<{ id: string }, CKANDataset>(
            "package_delete",
            { id: datasetId },
            "POST"
        );
    }

    async getDataset(datasetId: string): Promise<Dataset> {
        const parser = await this.getParser();
        const dataset: CKANDataset = await parser.dataset(datasetId);
        return this.transformCKANPackageResponse(dataset);
    }

    async getResource(resourceId: string): Promise<DataResource> {
        const parser = await this.getParser();
        const resource: CKANResource = await parser.resource(resourceId);
        return this.transformCKANResource(resource);
    }

    async registerResources(datasetId: string, resources: DataResource[]): Promise<void> {
        // Create resources one by one as CKAN resource_create expects individual resource creation
        for (const resource of resources) {
            const resourceBody: CreateResource = {
                package_id: datasetId,
                url: resource.url,
                name: resource.name,
                format: resource.type
                // Optional fields that can be added if available in DataResource
                // hash: resource.hash,
                // resource_type: resource.resource_type,
                // mimetype: resource.mimetype,
                // size: resource.size,
                // created: resource.created,
                // last_modified: resource.last_modified
            };

            await (
                await this.getParser()
            ).action<CreateResource, CKANResource>("resource_create", resourceBody, "POST");
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            const parser = await this.getParser();
            const available = await parser.available();
            return available;
        } catch (error) {
            throw new Error("Failed to connect to CKAN server");
        }
    }

    private transformCKANPackageResponse(pkg: CKANDataset): Dataset {
        return this.transformCKANPackage(pkg);
    }

    private transformCKANPackage(pkg: CKANDataset): Dataset {
        return {
            id: pkg.id,
            name: pkg.name,
            region: "",
            time_period: this.extractTemporalCoverage(pkg as CKANPackageWithExtras),
            description: pkg.notes || "",
            version: pkg.version || "",
            limitations: "",
            source: {
                name: pkg.organization?.title || "",
                url: pkg.url || "",
                type: "CKAN"
            },
            is_cached: false,
            resource_count: pkg.resources?.length || 0,
            datatype: "",
            categories: pkg.tags?.map((t: Tag) => t.name) || [],
            resources: pkg.resources?.map((r: CKANResource) => this.transformCKANResource(r)) || [],
            spatial_coverage: this.extractSpatialCoverage(pkg as CKANPackageWithExtras)
        };
    }

    private transformCKANResource(resource: CKANResource): DataResource {
        return {
            id: resource.id,
            name: resource.name,
            url: resource.url,
            selected: true,
            type: resource.format,
            time_period: null,
            spatial_coverage: null
        };
    }

    private extractTemporalCoverage(
        pkg: CKANPackageWithExtras
    ): { start_date: Date | null; end_date: Date | null } | null {
        // Extract temporal coverage from CKAN extras if available
        const spatialExtra = pkg.extras?.find((e: CKANExtra) => e.key === "temporal_coverage");
        if (spatialExtra) {
            try {
                const temporal = JSON.parse(spatialExtra.value);
                return {
                    start_date: temporal.start_time ? new Date(temporal.start_time) : null,
                    end_date: temporal.end_time ? new Date(temporal.end_time) : null
                };
            } catch {
                return null;
            }
        }
        return null;
    }

    private extractSpatialCoverage(pkg: CKANPackageWithExtras): string | undefined {
        const spatialExtra = pkg.extras?.find((e: CKANExtra) => e.key === "spatial");
        return spatialExtra?.value;
    }
}
