import { ExecutionCreation } from "../ExecutionCreation";
import { ModelIOBindings } from "../../mint/mint-types";
import { ThreadModelMap } from "../../mint/mint-types";

describe("ExecutionCreation", () => {
    describe("getInputBindingsAndTotalProducts", () => {
        it("should return correct input bindings and total products", () => {
            // Sample data for testing
            const dataBindings: ModelIOBindings = {
                input1: ["value1", "value2"],
                input2: ["valueA", "valueB"],
                input3: ["valueX"]
            };
            const inputIds = ["input1", "input2", "input3"];

            // Expected output
            const expectedInputBindings = [["value1", "value2"], ["valueA", "valueB"], ["valueX"]];
            const expectedTotalProducts = 4; // 2 (input1) * 2 (input2) * 1 (input3)

            // Call the method
            const { inputBindings, totalproducts } =
                ExecutionCreation.getInputBindingsAndTotalProducts(dataBindings, inputIds);

            // Assertions
            expect(inputBindings).toEqual(expectedInputBindings);
            expect(totalproducts).toBe(expectedTotalProducts);
        });

        it("should handle empty inputIds", () => {
            const dataBindings: ModelIOBindings = {};
            const inputIds: string[] = [];

            const { inputBindings, totalproducts } =
                ExecutionCreation.getInputBindingsAndTotalProducts(dataBindings, inputIds);

            expect(inputBindings).toEqual([]);
            expect(totalproducts).toBe(1); // No inputs means 1 combination (the empty product)
        });

        it("should handle missing dataBindings", () => {
            const dataBindings: ModelIOBindings = {
                input1: ["value1"],
                input2: [] // Simulating missing data
            };
            const inputIds = ["input1", "input2"];

            const { inputBindings, totalproducts } =
                ExecutionCreation.getInputBindingsAndTotalProducts(dataBindings, inputIds);

            expect(inputBindings).toEqual([["value1"], []]);
            expect(totalproducts).toBe(0); // Since input2 is undefined, total products should be 0
        });
    });

    describe("processInputParameter", () => {
        let threadModel: ThreadModelMap;
        let inputIds: string[];

        beforeEach(() => {
            // Reset test objects before each test
            threadModel = {
                id: "test-model",
                bindings: {}
            };
            inputIds = [];
        });

        it("should handle parameter with fixed value", () => {
            const param = {
                id: "param1",
                name: "Parameter 1",
                value: "fixed-value",
                position: 1,
                type: "string"
            };

            ExecutionCreation.processInputParameter(param, threadModel, inputIds, "region-123");

            expect(inputIds).toContain("param1");
            expect(threadModel.bindings["param1"]).toEqual(["fixed-value"]);
        });

        it("should handle __region_geojson parameter", () => {
            const param = {
                id: "region_param",
                name: "Region Parameter",
                position: 1,
                type: "string"
            };
            threadModel.bindings["region_param"] = ["__region_geojson"];

            ExecutionCreation.processInputParameter(param, threadModel, inputIds, "region-123");

            expect(inputIds).toContain("region_param");
            expect(threadModel.bindings["region_param"]).toEqual(["__region_geojson:region-123"]);
        });

        it("should not modify bindings for parameter without value or special case", () => {
            const param = {
                id: "param2",
                name: "Parameter 2",
                position: 2,
                type: "string"
            };
            threadModel.bindings["param2"] = ["existing-value"];

            ExecutionCreation.processInputParameter(param, threadModel, inputIds, "region-123");

            expect(inputIds).toContain("param2");
            expect(threadModel.bindings["param2"]).toEqual(["existing-value"]);
        });

        it("should handle parameter with no existing bindings", () => {
            const param = {
                id: "param3",
                name: "Parameter 3",
                position: 3,
                type: "string"
            };

            ExecutionCreation.processInputParameter(param, threadModel, inputIds, "region-123");

            expect(inputIds).toContain("param3");
            expect(threadModel.bindings["param3"]).toBeUndefined();
        });
    });
});
