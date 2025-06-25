import { Dataset, MintPreferences } from "../mint-types";
import { IDataCatalog } from "./IDatacatalog";
import CKAN, { Dataset as CKANDataset, Tag, Resource as CKANResource } from "@pkyeck/ckan-ts";

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

interface CKANExtra {
    key: string;
    value: string;
}

interface CKANPackageWithExtras extends CKANDataset {
    extras?: CKANExtra[];
}

export class TACC_CKAN_DataCatalog implements IDataCatalog {
    private parser: CKAN;

    constructor(prefs: MintPreferences) {
        this.parser = new CKAN(prefs.data_catalog_api, {
            requestOptions: {
                timeout: 10000,
                headers: {
                    Authorization: ` ${prefs.data_catalog_key}`
                }
            }
        });
    }

    getCatalogType(): string {
        return "TACC_CKAN";
    }

    async registerDataset(dataset: Dataset, owner_org?: string): Promise<string> {
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
        const response = await this.parser.action<CreateDataset, CKANDataset>(
            "package_create",
            ckan_dataset,
            "POST"
        );
        return response.id;
    }

    async deleteDataset(datasetId: string): Promise<void> {
        await this.parser.action<{ id: string }, CKANDataset>(
            "package_delete",
            { id: datasetId },
            "POST"
        );
    }

    async getDataset(datasetId: string): Promise<Dataset> {
        const dataset: CKANDataset = await this.parser.dataset(datasetId);
        return this.transformCKANPackageResponse(dataset);
    }

    async testConnection(): Promise<boolean> {
        try {
            const available = await this.parser.available();
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
            resources:
                pkg.resources?.map((r: CKANResource) => ({
                    id: r.id,
                    name: r.name,
                    url: r.url,
                    time_period: null,
                    spatial_coverage: null,
                    selected: true
                })) || [],
            spatial_coverage: this.extractSpatialCoverage(pkg as CKANPackageWithExtras)
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
