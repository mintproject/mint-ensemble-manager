import { Router } from "express";
import problemStatementsService from "@/api/api-v1/services/problemStatementsService";

const problemStatementsRouter = (): Router => {
    const router = Router();

    /**
     * @openapi
     * /problemStatements:
     *   get:
     *     summary: Get all problem statements
     *     description: Returns a list of all problem statements
     *     security:
     *       - BearerAuth: []
     *         oauth2: []
     *     tags:
     *       - Problem Statements
     *     responses:
     *       200:
     *         description: A list of problem statements
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/ProblemStatement'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       500:
     *         description: Internal server error
     */
    router.get("/", async (req, res) => {
        try {
            const authorizationHeader = req.headers.authorization;
            if (!authorizationHeader) {
                return res.status(401).json({ message: "Authorization header is required" });
            }
            const problemStatements =
                await problemStatementsService.getProblemStatements(authorizationHeader);
            res.status(200).json(problemStatements);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    /**
     * @openapi
     * /problemStatements/{id}:
     *   get:
     *     summary: Get a specific problem statement
     *     description: Returns a specific problem statement by ID
     *     security:
     *       - BearerAuth: []
     *         oauth2: []
     *     tags:
     *       - Problem Statements
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: The problem statement ID
     *     responses:
     *       200:
     *         description: The problem statement
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ProblemStatement'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Problem statement not found
     *       500:
     *         description: Internal server error
     */
    router.get("/:id", async (req, res) => {
        try {
            const authorizationHeader = req.headers.authorization;
            if (!authorizationHeader) {
                return res.status(401).json({ message: "Authorization header is required" });
            }
            const { id } = req.params;
            const problemStatement = await problemStatementsService.getProblemStatementById(
                id,
                authorizationHeader
            );
            res.status(200).json(problemStatement);
        } catch (error) {
            if (error.message.includes("not found")) {
                return res.status(404).json({ message: error.message });
            }
            res.status(500).json({ message: error.message });
        }
    });

    return router;
};

export default problemStatementsRouter;
