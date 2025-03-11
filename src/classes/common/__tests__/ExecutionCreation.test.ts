import { ExecutionCreation } from "../ExecutionCreation";
import { getRegionDetails, listSuccessfulExecutionIds } from "../../graphql/graphql_functions";
import { getThreadMock } from "./mocks/getThreadMock";
import { getRegionMockTexas } from "./mocks/getRegionMockTexas";
import { Region } from "@/classes/mint/mint-types";
import { threadFromGQL } from "../../graphql/graphql_adapter";

// Mock all the imported functions
jest.mock("../../graphql/graphql_functions");

describe("ExecutionCreation", () => {
    let executionCreation: ExecutionCreation;

    beforeEach(() => {
        // Setup mock thread data

        // Setup mock responses
        (getRegionDetails as jest.Mock).mockResolvedValue(getRegionMockTexas as unknown as Region);
        (listSuccessfulExecutionIds as jest.Mock).mockResolvedValue([]);

        const thread = threadFromGQL(getThreadMock.data.thread_by_pk);
        executionCreation = new ExecutionCreation(
            thread,
            "https://w3id.org/okn/i/mint/d2792424-fb9d-461c-9470-4bc87ca2f05f"
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("prepareExecutions", () => {
        it("should prepare executions successfully", async () => {
            // Mock fetch for component loading
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () =>
                    Promise.resolve(
                        JSON.stringify({
                            id: "comp-1",
                            version: "1.0"
                        })
                    )
            });

            const executionDetails = ExecutionCreation.getModelInputBindings(
                executionCreation.thread.models[
                    "https://w3id.org/okn/i/mint/d2792424-fb9d-461c-9470-4bc87ca2f05f"
                ],
                executionCreation.thread,
                executionCreation.threadRegion
            );
            const [threadModel, inputIds] = executionDetails;
            expect(threadModel).toBeDefined();
            expect(inputIds).toBeDefined();
        });
    });

    // describe("createExecutions", () => {
    //     it("should create and process executions in batches", async () => {
    //         // Setup mock data
    //         const configs = [["value1"], ["value2"]];
    //         const inputIds = ["input1"];
    //         const modelid = "model-1";
    //         const thread_model_id = "ensemble-1";

    //         // Mock component loading
    //         global.fetch = jest.fn().mockResolvedValue({
    //             ok: true,
    //             text: () =>
    //                 Promise.resolve(
    //                     JSON.stringify({
    //                         id: "comp-1",
    //                         version: "1.0"
    //                     })
    //                 )
    //         });

    //         // Access private method using any type
    //         await (executionCreation as any).createExecutions(
    //             configs,
    //             thread_model_id,
    //             inputIds,
    //             modelid
    //         );

    //         // Verify the execution creation process
    //         expect(setThreadModelExecutionSummary).toHaveBeenCalled();
    //         expect(deleteThreadModelExecutionIds).toHaveBeenCalled();
    //         expect(setExecutions).toHaveBeenCalled();
    //         expect(setThreadModelExecutionIds).toHaveBeenCalled();
    //         expect(incrementThreadModelSubmittedRuns).toHaveBeenCalled();
    //     });
    // });

    // describe("getModelDetails", () => {
    //     it("should load and process model details correctly", async () => {
    //         const mockModel: Model = {
    //             id: "model-1",
    //             name: "Test Model",
    //             code_url: "http://example.com/component.json",
    //             input_files: [
    //                 {
    //                     id: "input1",
    //                     name: "Input 1",
    //                     position: 1,
    //                     type: "file",
    //                     format: "csv"
    //                 }
    //             ],
    //             input_parameters: [
    //                 {
    //                     id: "param1",
    //                     name: "Parameter 1",
    //                     position: 1,
    //                     type: "number"
    //                 }
    //             ],
    //             output_files: [
    //                 {
    //                     id: "output1",
    //                     name: "Output 1",
    //                     position: 1,
    //                     type: "file",
    //                     format: "csv"
    //                 }
    //             ]
    //         } as Model;

    //         global.fetch = jest.fn().mockResolvedValue({
    //             ok: true,
    //             text: () =>
    //                 Promise.resolve(
    //                     JSON.stringify({
    //                         id: "comp-1",
    //                         version: "1.0"
    //                     })
    //                 )
    //         });

    //         const result = await (executionCreation as any).getModelDetails(mockModel);

    //         expect(result.inputs.length).toBe(2); // 1 input file + 1 parameter
    //         expect(result.outputs.length).toBe(1);
    //     });
    // });
});
