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

    return router;
};

export default problemStatementsRouter;
