// ./api/api-v1/paths/executionsLocal.ts

import { Request, Response } from "express";
import { JobsService } from "@/api/api-v1/services/tapis/jobsService";

export default function (jobsService: JobsService) {
    const exports = {
        POST
    };

    /**
     * @swagger
     * /tapis/jobs:
     *   post:
     *     summary: Submit Job
     *     description: Submit a job to the queue.
     *     operationId: tapisSubmitJob
     *     tags: [Tapis]
     *     security:
     *       - BearerAuth: []
     *       - oauth2: []
     *     requestBody:
     *       description: Job
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ReqSubmitTapisJob'
     *     responses:
     *       200:
     *         description: Job Submitted
     *       default:
     *         description: An error occurred
     */
    /* submit a job to the queue */
    async function POST(req: Request, res: Response) {
        try {
            const job = await jobsService.submitJob(req.body, req.headers.authorization);
            return res.status(200).send({ message: "Job submitted", job });
        } catch (error) {
            console.error(error);
            return res.status(500).send({ message: error.message });
        }
    }

    POST.apiDoc = {
        summary: "Submit Job",
        description: "Submit a job to the queue.",
        operationId: "tapisSubmitJob",
        tags: ["Tapis"],
        security: [
            {
                BearerAuth: [],
                oauth2: []
            }
        ],
        requestBody: {
            description: "Job",
            required: true,
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/ReqSubmitTapisJob"
                    }
                }
            }
        },
        responses: {
            "200": {
                description: "Job Submitted"
            },
            default: {
                description: "An error occurred"
            }
        }
    };

    return exports;
}
