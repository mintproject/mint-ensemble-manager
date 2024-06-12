// ./api/api-v1/paths/executionsLocal.ts

import { Response } from "express";
import { JobsService } from "../../../services/tapis/jobsService";

export default function (jobsService: JobsService) {
    const exports = {
        POST,
        parameters: [
            {
                in: "path",
                name: "jobId",
                example: "60cfd7b6-746e-416c-bb8c-3cd8c761ab60-007"
            }
        ]
    };

    async function POST(req: any, res: Response) {
        jobsService.webhookJobStatusChange(req.body, req.params.jobId);
        res.status(200).send({ message: "Job Status Change." });
    }

    // NOTE: We could also use a YAML string here.
    POST.apiDoc = {
        summary: "Webhook for Job Status Change.",
        description:
            "Webhook for Job Status Change. TAPIS will send a POST request to this endpoint when a job status changes.",
        operationId: "tapisChangeJobStatus",
        tags: ["Tapis Jobs"],
        requestBody: {
            description: "Job Status",
            required: true,
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/WebHookEvent"
                    }
                }
            }
        },
        responses: {
            "200": {
                description: "Log Details"
            },
            default: {
                description: "An error occurred"
            }
        }
    };

    return exports;
}
