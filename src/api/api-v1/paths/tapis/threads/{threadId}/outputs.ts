import { Response } from "express";
import { ThreadsOutputsService } from "@/api/api-v1/services/tapis/threads/outputs/threadsOutputsService";

export default function (threadsOutputsService: ThreadsOutputsService) {
    const exports = {
        POST,
        parameters: [
            {
                in: "path",
                name: "threadId",
                required: true,
                schema: {
                    type: "string"
                }
            }
        ]
    };

    async function POST(req: any, res: Response) {
        try {
            // Start the registration process asynchronously
            threadsOutputsService.registerOutputs(req.params.threadId, req.headers.authorization);

            // Return immediate acknowledgment
            res.status(202).json({
                message: "Thread outputs registration process started"
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: error.message
            });
        }
    }

    POST.apiDoc = {
        summary: "Register Thread Execution Outputs",
        description:
            "Register all execution outputs for a thread in the data catalog asynchronously",
        operationId: "registerThreadExecutionOutputs",
        tags: ["Tapis"],
        security: [
            {
                BearerAuth: [],
                oauth2: []
            }
        ],
        responses: {
            "202": {
                description: "Registration process started"
            },
            "500": {
                description: "Server error"
            }
        }
    };

    return exports;
}
