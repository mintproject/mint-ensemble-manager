// ./api/api-v1/paths/executionsLocal.ts

import { ModelThread } from "../../../schema/openapi";
import { Request } from "express";
import { submitExecution } from "../services/executionsKubernetesService";

export default function () {
    const operations = {
        POST,
    };

    function POST(req: Request<null, null, ModelThread, null, null>, res: any, next: any) {
        submitExecution(req.body).then((result: any) => {
            if (result.result == "error") {
                res.status(406).json(result);
            } else {
                res.status(202).json(result);
            }
        });
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
