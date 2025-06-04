import { Request, Response } from "express";
import { ProblemStatementInfo } from "@/classes/mint/mint-types";
import problemStatementsService from "../../services/problemStatementsService";

export default function () {
    const operations = {
        GET,
        POST
    };

    // problemStatements/:id
    async function GET(req: Request, res: Response) {
        try {
            const response = await problemStatementsService.getProblemStatement(req.params.id);
            if (response === null) res.status(404).send();
            else res.status(200).send(response);
        } catch (error) {
            res.status(500).send(error);
        }
    }

    async function POST(req: Request, res: Response) {
        try {
            const problemStatement: ProblemStatementInfo = {
                name: req.body.name,
                regionid: req.body.regionid,
                dates: {
                    start_date: new Date(req.body.time_period.from),
                    end_date: new Date(req.body.time_period.to)
                },
                events: [],
                permissions: [{ read: true, write: true, execute: true, owner: false, userid: "*" }]
            };

            const createdProblemStatement =
                await problemStatementsService.createProblemStatement(problemStatement);
            res.status(201).send(createdProblemStatement);
        } catch (error) {
            res.status(500).send(error);
        }
    }

    GET.apiDoc = {
        summary: "Get a problem statement by ID",
        operationId: "getProblemStatement",
        security: [
            {
                BearerAuth: [],
                oauth2: []
            }
        ],
        parameters: [
            {
                in: "path",
                name: "id",
                required: true,
                schema: {
                    type: "string"
                }
            }
        ],
        responses: {
            "200": {
                description: "Successful response",
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/ProblemStatement"
                        }
                    }
                }
            },
            "404": {
                description: "Problem statement not found"
            },
            default: {
                description: "An error occurred"
            }
        }
    };

    POST.apiDoc = {
        summary: "Create a new problem statement",
        operationId: "createProblemStatement",
        security: [
            {
                BearerAuth: [],
                oauth2: []
            }
        ],
        requestBody: {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/ProblemStatement"
                    }
                }
            }
        },
        responses: {
            "201": {
                description: "Problem statement created successfully",
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/ProblemStatement"
                        }
                    }
                }
            },
            default: {
                description: "An error occurred"
            }
        }
    };

    return operations;
}
