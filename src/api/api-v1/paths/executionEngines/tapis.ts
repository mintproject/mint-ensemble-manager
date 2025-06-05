// ./api/api-v1/paths/executionsLocal.ts

import { Router } from "express";
import { ExecutionsTapisService } from "@/api/api-v1/services/executionsTapisService";

export default function (executionsTapisService: ExecutionsTapisService) {
    const router = Router();

    /**
     * @swagger
     * /executionEngines/tapis:
     *   post:
     *     summary: Submit modeling thread for execution using Tapis.
     *     operationId: submitTapisExecution
     *     tags:
     *       - Execution Engine
     *     requestBody:
     *       description: Modeling thread
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ModelThread'
     *           example:
     *             thread_id: "108bguHTBBNLlZaPMLlM"
     *             model_id: "https://w3id.org/okn/i/mint/modflow_2005_BartonSprings_avg"
     *     security:
     *       - BearerAuth: []
     *         oauth2: []
     *     responses:
     *       202:
     *         description: Successful response
     *       default:
     *         description: An error occurred
     */
    router.post("/", async (req, res) => {
        try {
            const response = await executionsTapisService.submitExecution(
                req.body,
                req.headers.authorization
            );
            res.status(response.status).json(response.data);
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
