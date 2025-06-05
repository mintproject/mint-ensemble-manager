import { Response } from "express";
import { ThreadsExecutionsService } from "@/api/api-v1/services/tapis/threads/executions/threadsExecutionsService";
import { Request } from "express";
import { Status } from "@/interfaces/IExecutionService";

export default function (threadsExecutionsService: ThreadsExecutionsService) {
    const exports = {
        PUT
    };

    /**
     * @swagger
     * /tapis/threads/{threadId}/executions/{executionId}/status:
     *   put:
     *     summary: Update Execution Status
     *     description: Update the status of an execution.
     *     operationId: updateExecutionStatus
     *     tags:
     *       - Tapis
     *     security:
     *       - BearerAuth: []
     *       - oauth2: []
     *     parameters:
     *       - name: threadId
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *         description: Thread ID
     *       - name: executionId
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *         description: Execution ID
     *     requestBody:
     *       description: Status Update
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ReqUpdateExecutionStatus'
     *     responses:
     *       200:
     *         description: Status Updated Successfully
     *       default:
     *         description: An error occurred
     */
    async function PUT(
        req: Request<{ threadId: string; executionId: string }, unknown, { status: Status }>,
        res: Response
    ) {
        try {
            const { threadId, executionId } = req.params;
            const { status } = req.body;

            await threadsExecutionsService.updateStatus(threadId, executionId, status);
            return res.status(200).send({ message: "Execution status updated" });
        } catch (error) {
            console.error(error);
            return res.status(500).send({ message: error.message });
        }
    }

    return exports;
}
