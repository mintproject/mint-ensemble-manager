import { HttpError } from "@/classes/common/errors";
import { Dataset, DatasetSearchCriteria, MintPreferences } from "../mint-types";
import { IDataCatalog } from "./IDatacatalog";
import CKAN, {
    Dataset as CKANDataset,
    DatasetSearchOptions,
    Tag,
    Resource as CKANResource
} from "@mfosorio/ckan-ts";

interface CreateDataset {
    name: string;
    title: string;
    notes: string;
    owner_org: string;
    private: boolean;
    version: string;
    extras: {
        key: string;
        value: string;
    }[];
    tags: Tag[];
    resources: CKANResource[];
}

export class TACC_CKAN_DataCatalog implements IDataCatalog {
    private parser: CKAN;

    constructor(prefs: MintPreferences) {
        this.parser = new CKAN(prefs.data_catalog_api, {
            requestOptions: {
                headers: {
                    Authorization: ` ${prefs.data_catalog_key}`
                }
            }
        });
    }

    getCatalogType(): string {
        return "TACC_CKAN";
    }

    async registerDataset(dataset: Dataset, owner_org?: string): Promise<void> {
        const ckan_dataset: CreateDataset = {
            name: dataset.name,
            title: dataset.name,
            notes: dataset.description,
            owner_org: owner_org || "",
            private: false,
            version: dataset.version,
            extras: [
                {
                    key: "spatial",
                    value: dataset.spatial_coverage || ""
                }
            ],
            tags: dataset.variables.map((v) => {
                return { name: "stdvar." + v } as Tag;
            }),
            resources: dataset.resources.map((res) => {
                return {
                    name: res.name,
                    url: res.url
                } as CKANResource;
            })
        };
        await this.parser.action<CreateDataset, CKANDataset>("package_create", ckan_dataset);
    }

    async findDatasets(criteria: DatasetSearchCriteria): Promise<Dataset[]> {
        const searchParams: DatasetSearchOptions = {
            limit: criteria.limit || 100,
            offset: criteria.offset || 0
        };

        // Build query string
        const queryParts: string[] = [];

        if (criteria.datasetIds && criteria.datasetIds.length > 0) {
            queryParts.push(`id:(${criteria.datasetIds.join(" OR ")})`);
        }

        if (criteria.variables && criteria.variables.length > 0) {
            const tagQueries = criteria.variables.map((v) => `tags:"stdvar.${v}"`);
            queryParts.push(`(${tagQueries.join(" OR ")})`);
        }

        if (criteria.categories && criteria.categories.length > 0) {
            const categoryQueries = criteria.categories.map((c) => `tags:"${c}"`);
            queryParts.push(`(${categoryQueries.join(" OR ")})`);
        }

        searchParams.filterQuery = queryParts.length > 0 ? queryParts.join(" AND ") : "*:*";

        try {
            const datasets: CKANDataset[] = await this.parser.searchDataset(
                searchParams.filterQuery
            );
            return this.transformCKANSearchResponse(datasets, criteria.variables || []);
        } catch (error) {
            throw new HttpError(500, "CKAN dataset search failed");
        }
    }

    async getDataset(datasetId: string): Promise<Dataset> {
        const dataset: CKANDataset = await this.parser.dataset(datasetId);
        return this.transformCKANPackageResponse(dataset);
    }

    async testConnection(): Promise<boolean> {
        const available = await this.parser.available();
        return available;
    }

    private transformCKANSearchResponse(datasets: CKANDataset[], variables: string[]): Dataset[] {
        if (!datasets) {
            return [];
        }
        return datasets.map((pkg: CKANDataset) => this.transformCKANPackage(pkg, variables));
    }

    private transformCKANPackageResponse(pkg: CKANDataset): Dataset {
        return this.transformCKANPackage(pkg, []);
    }

    private transformCKANPackage(pkg: CKANDataset, variables: string[]): Dataset {
        return {
            id: pkg.id,
            name: pkg.name,
            region: "",
            variables: variables,
            time_period: this.extractTemporalCoverage(pkg),
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
            spatial_coverage: this.extractSpatialCoverage(pkg)
        };
    }

    private extractTemporalCoverage(
        pkg: any
    ): { start_date: Date | null; end_date: Date | null } | null {
        // Extract temporal coverage from CKAN extras if available
        const spatialExtra = pkg.extras?.find((e: any) => e.key === "temporal_coverage");
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

    private extractSpatialCoverage(pkg: any): string | undefined {
        const spatialExtra = pkg.extras?.find((e: any) => e.key === "spatial");
        return spatialExtra?.value;
    }
}
