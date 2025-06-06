import { Router } from "express";
import executionOutputsService from "@/api/api-v1/services/tapis/executionOutputsService";
import { NotFoundError } from "@/classes/common/errors";

export default function () {
    const router = Router();
    /**
     * @swagger
     * /tapis/executions/{executionId}/outputs:
     *   post:
     *     summary: Register Tapis Execution Outputs
     *     description: Register the outputs of a successful Tapis execution in the data catalog
     *     operationId: registerTapisExecutionOutputs
     *     tags:
     *       - Tapis
     *     security:
     *       - BearerAuth: []
     *       - oauth2: []
     *     parameters:
     *       - name: executionId
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Outputs registered successfully
     *       400:
     *         description: Invalid request or registration failed
     *       500:
     *         description: Server error
     */
    router.post("/:executionId/outputs", async (req, res) => {
        try {
            const success = await executionOutputsService.registerOutputs(
                req.params.executionId,
                req.headers.authorization
            );

            if (success) {
                res.status(200).json({
                    message: "Execution outputs registered successfully"
                });
            } else {
                res.status(400).json({
                    message: "Failed to register execution outputs"
                });
            }
        } catch (error) {
            if (error instanceof NotFoundError) {
                res.status(404).json({
                    message: "Execution not found"
                });
            } else {
                res.status(500).json({
                    message: error.message
                });
            }
        }
    });

    return router;
}
