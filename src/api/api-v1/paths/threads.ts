// ./api/api-v1/paths/threads.ts

import { Router } from "express";
import threadsService from "@/api/api-v1/services/threadsService";

export default function (service: typeof threadsService) {
    const router = Router();

    /**
     * @swagger
     * /threads:
     *   post:
     *     summary: Create modeling thread in MINT
     *     operationId: createThread
     *     tags: [Threads]
     *     security:
     *       - BearerAuth: []
     *       - oauth2: []
     *     requestBody:
     *       description: New modeling thread details
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/NewModelThread'
     *     responses:
     *       202:
     *         description: Successful response
     *       default:
     *         description: An error occurred
     */
    router.post("/", async (req, res) => {
        try {
            const result = await service.createThread(req.body);
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
