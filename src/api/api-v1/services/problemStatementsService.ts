import { ProblemStatementInfo } from "@/classes/mint/mint-types";
import {
    addProblemStatement,
    getProblemStatement
} from "../../../classes/graphql/graphql_functions";

const problemStatementsService = {
    async getProblemStatement(id: string) {
        return await getProblemStatement(id);
    },

    async createProblemStatement(problemStatement: ProblemStatementInfo) {
        const id = await addProblemStatement(problemStatement);
        if (id === null) {
            throw new Error("Failed to create problem statement");
        }
        return await getProblemStatement(id);
    }
};

export default problemStatementsService;
