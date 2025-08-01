// ./api/api-v1/paths/executionsLocal.ts

import { Router } from "express";
import executionsLocalService from "@/api/api-v1/services/executionsLocalService";

export default function (service: typeof executionsLocalService) {
    const router = Router();

    /**
     * @swagger
     * /executionsLocal:
     *   post:
     *     summary: Submit modeling thread for local execution.
     *     operationId: submitLocalExecution
     *     security:
     *       - BearerAuth: []
     *       - oauth2: []
     *     requestBody:
     *       description: Modeling thread
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ModelThread'
     *     responses:
     *       202:
     *         description: Successful response
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 result:
     *                   type: string
     *                   example: "success"
     *                 message:
     *                   type: string
     *                   example: "Execution submitted successfully"
     *       default:
     *         description: Default error response
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 result:
     *                   type: string
     *                   example: "error"
     *                 message:
     *                   type: string
     *                   example: "Internal server error"
     */
    router.post("/", async (req, res) => {
        try {
            const result = await service.submitExecution(req.body);
            if (result.result === "error") {
                res.status(406).json(result);
            } else {
                res.status(202).json(result);
            }
        } catch (error) {
            res.status(500).json({ result: "error", message: error.message });
        }
    });

    /**
     * @swagger
     * /executionsLocal:
     *   delete:
     *     summary: Delete cached results, cached models and cached data for local execution.
     *     operationId: deleteLocalExecutionCache
     *     security:
     *       - BearerAuth: []
     *       - oauth2: []
     *     responses:
     *       202:
     *         description: Successful response
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 result:
     *                   type: string
     *                   example: "success"
     *                 message:
     *                   type: string
     *                   example: "Execution cache deleted successfully"
     *       default:
     *         description: Default error response
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 result:
     *                   type: string
     */
    router.delete("/", async (req, res) => {
        try {
            const result = await service.deleteExecutionCache(req.body);
            if (result.result === "error") {
                res.status(406).json(result);
            } else {
                res.status(202).json(result);
            }
        } catch (error) {
            res.status(500).json({ result: "error", message: error.message });
        }
    });

    return router;
}
