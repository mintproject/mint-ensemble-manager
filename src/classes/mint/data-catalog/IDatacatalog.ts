import { Dataset, DatasetSearchCriteria } from "../mint-types";

export interface IDataCatalog {
    /**
     * Register a dataset in the catalog
     */
    registerDataset(dataset: Dataset, owner_org?: string): Promise<void>;

    /**
     * Find datasets based on search criteria
     */
    findDatasets(criteria: DatasetSearchCriteria): Promise<Dataset[]>;

    /**
     * Get a specific dataset by ID with detailed information
     */
    getDataset(datasetId: string): Promise<Dataset>;

    /**
     * Register variables for a dataset
     */
    registerVariables?(dataset: Dataset): Promise<boolean>;

    /**
     * Register resources for a dataset
     */
    registerResources?(datasetId: string, resources: any[]): Promise<boolean>;

    /**
     * Sync dataset metadata
     */
    syncMetadata?(datasetId: string): Promise<void>;

    /**
     * Get catalog type identifier
     */
    getCatalogType(): string;

    /**
     * Test connection to the catalog
     */
    testConnection?(): Promise<boolean>;
}
