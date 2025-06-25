import { TACC_CKAN_DataCatalog } from "../TACC_CKAN_Datacatalog";
import { MintPreferences, Dataset } from "../../mint-types";

describe("TACC_CKAN_DataCatalog Integration Tests", () => {
    let dataCatalog: TACC_CKAN_DataCatalog;
    const testPreferences: MintPreferences = {
        data_catalog_api: "http://ckan.tacc.cloud:5000",
        data_catalog_key:
            "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJ6OUwwc1BTVzZnN0pMRFJ6S2RrM0VoZ2dTMnNxWHQ4Y2pVa2NucDhkNE5VWkFKX2pZdDR5dDJsZFQwdUZCQlVNT0tXcmZYNmlDS3owbExTciIsImlhdCI6MTc1MDg1MTgxNH0.myxa8WPhxDp3BpVY3r4j466k1jYNK9ciEaX2cXI_dZY",
        ensemble_manager_api: "http://localhost:3000",
        ingestion_api: "http://localhost:3001",
        visualization_url: "http://localhost:3002",
        auth_server: "http://localhost:8080",
        auth_realm: "mint",
        auth_client_id: "mint-client"
    };
    let datasetId: string;

    beforeAll(() => {
        // Setup test preferences with the provided credentials
    });

    beforeEach(async () => {
        // Create fresh instance for each test
        dataCatalog = new TACC_CKAN_DataCatalog(testPreferences);

        // Add small delay to prevent overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 100));
    });

    describe("Connection Testing", () => {
        it("should successfully connect to CKAN server", async () => {
            const isConnected = await dataCatalog.testConnection();
            expect(isConnected).toBe(true);
        });

        it("should return correct catalog type", () => {
            const catalogType = dataCatalog.getCatalogType();
            expect(catalogType).toBe("TACC_CKAN");
        });
    });

    describe("Dataset Registration", () => {
        const testDataset: Dataset = {
            name: "test-dataset-integration",
            region: "test-region",
            variables: ["temperature", "precipitation"],
            time_period: {
                start_date: new Date("2020-01-01"),
                end_date: new Date("2020-12-31")
            },
            description: "Integration test dataset for TACC CKAN",
            version: "1.0.0",
            limitations: "Test data only",
            source: {
                name: "Test Source",
                url: "http://test.source.com",
                type: "CKAN"
            },
            is_cached: false,
            resource_count: 2,
            datatype: "climate",
            categories: ["climate", "test"],
            resources: [
                {
                    id: "resource-1",
                    name: "Temperature Data",
                    url: "http://test.source.com/temperature.csv",
                    time_period: {
                        start_date: new Date("2020-01-01"),
                        end_date: new Date("2020-12-31")
                    },
                    spatial_coverage: null,
                    selected: true
                },
                {
                    id: "resource-2",
                    name: "Precipitation Data",
                    url: "http://test.source.com/precipitation.csv",
                    time_period: {
                        start_date: new Date("2020-01-01"),
                        end_date: new Date("2020-12-31")
                    },
                    spatial_coverage: null,
                    selected: true
                }
            ],
            spatial_coverage: "Test Region"
        };

        it("should register a new dataset successfully", async () => {
            datasetId = await dataCatalog.registerDataset(testDataset, "test-org");
            expect(datasetId).toBeDefined();
        }, 30000); // Increased timeout for network operations
    });

    describe("Dataset Retrieval", () => {
        it("should retrieve a specific dataset by ID", async () => {
            const dataset = await dataCatalog.getDataset(datasetId);

            expect(dataset).toBeDefined();
            expect(dataset.id).toBe(datasetId);
            expect(dataset.name).toBe("test-dataset-integration");
            expect(dataset.description).toBe("Integration test dataset for TACC CKAN");
            expect(dataset.resources).toHaveLength(0);
        }, 30000);

        it("should handle non-existent dataset gracefully", async () => {
            await expect(dataCatalog.getDataset("non-existent-dataset")).rejects.toThrow();
        }, 30000);
    });

    //     it("should transform CKAN dataset with temporal coverage", async () => {
    //         // This test verifies the transformation logic works correctly
    //         const dataset = await dataCatalog.getDataset("test-dataset-integration");

    //         expect(dataset.time_period).toBeDefined();
    //         expect(dataset.spatial_coverage).toBeDefined();
    //         expect(dataset.categories).toBeDefined();
    //         expect(Array.isArray(dataset.categories)).toBe(true);
    //         expect(dataset.resources).toBeDefined();
    //         expect(Array.isArray(dataset.resources)).toBe(true);
    //     }, 30000);
    // });

    describe("Error Handling", () => {
        it("should handle network errors gracefully", async () => {
            const invalidPreferences: MintPreferences = {
                ...testPreferences,
                data_catalog_api: "http://invalid-url-that-does-not-exist.com"
            };

            const invalidCatalog = new TACC_CKAN_DataCatalog(invalidPreferences);

            await expect(invalidCatalog.testConnection()).rejects.toThrow();
        }, 30000);

        // it("should handle invalid API key", async () => {
        //     const invalidKeyPreferences: MintPreferences = {
        //         ...testPreferences,
        //         data_catalog_key: "invalid-key"
        //     };

        //     const invalidKeyCatalog = new TACC_CKAN_DataCatalog(invalidKeyPreferences);

        //     // This should fail but not throw an unhandled error
        //     await expect(invalidKeyCatalog.testConnection()).rejects.toThrow();
        // }, 30000);
    });

    describe("Cleanup", () => {
        it("should clean up test data", async () => {
            // Note: In a real integration test, you might want to clean up
            // the test datasets that were created. However, this would require
            // additional methods in the data catalog interface for deletion.
            // For now, we'll just verify the tests completed successfully.
            await dataCatalog.deleteDataset("test-dataset-integration");
        });
    });
});
