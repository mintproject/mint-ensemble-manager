// ./api/api-v1/paths/executionsLocal.ts

import { ModelThread } from "../../../classes/api";
import { ExecutionsTapisService } from "../services/executionsTapisService";
import { Request, Response } from "express";

export default function (executionsTapisService: ExecutionsTapisService) {
    const operations = {
        POST
    };

    async function POST(req: Request<null, null, ModelThread, null, null>, res: Response) {
        const threadmodel = req.body;
        return await executionsTapisService.submitExecution(threadmodel, res);
    }

    // NOTE: We could also use a YAML string here.
    POST.apiDoc = {
        summary: "Submit modeling thread for local execution.",
        operationId: "submitLocalExecution",
        requestBody: {
            description: "Modeling thread",
            required: true,
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/ModelThread"
                    }
                }
            }
        },
        responses: {
            "202": {
                description: "Successful response"
            },
            default: {
                description: "An error occurred"
            }
        }
    };

    return operations;
}
