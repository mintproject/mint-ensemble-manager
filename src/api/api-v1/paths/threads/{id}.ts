// ./api/api-v1/paths/threads.ts

import { Request, Response } from "express";

interface ThreadsService {
    getThread(id: string): Promise<any>;
}

export default function (threadsService: ThreadsService) {
    const operations = {
        GET
    };

    /**
     * @swagger
     * /threads/{id}:
     *   get:
     *     summary: Get modeling thread in MINT.
     *     operationId: getThread
     *     security:
     *       - BearerAuth: []
     *         oauth2: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Successful response
     *       default:
     *         description: An error occurred
     */
    async function GET(req: Request, res: Response) {
        try {
            const response = await threadsService.getThread(req.params.id);
            if (response === undefined) res.status(404).send();
            else res.status(200).send(response);
        } catch (error) {
            res.status(500).send(error);
        }
    }

    return operations;
}
