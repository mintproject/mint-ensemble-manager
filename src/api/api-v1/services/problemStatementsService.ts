import { ProblemStatement } from "@/classes/mint/mint-types";
import { getProblemStatements, getProblemStatement } from "@/classes/graphql/graphql_functions";
import { getTokenFromAuthorizationHeader } from "@/utils/authUtils";
import { UnauthorizedError, InternalServerError } from "@/classes/common/errors";

export interface ProblemStatementsService {
    getProblemStatements(authorizationHeader: string): Promise<ProblemStatement[]>;
    getProblemStatementById(id: string, authorizationHeader: string): Promise<ProblemStatement>;
}

const problemStatementsService: ProblemStatementsService = {
    async getProblemStatements(authorizationHeader: string) {
        return await getProblemStatements(authorizationHeader);
    },

    async getProblemStatementById(id: string, authorizationHeader: string) {
        const access_token = getTokenFromAuthorizationHeader(authorizationHeader);
        if (!access_token) {
            throw new UnauthorizedError("Invalid authorization header");
        }

        try {
            const problemStatement = await getProblemStatement(id, access_token);
            if (!problemStatement) {
                throw new InternalServerError("Problem statement not found");
            }
            return problemStatement;
        } catch (error) {
            console.error("Error getting problem statement:", error);
            throw new InternalServerError("Error getting problem statement: " + error.message);
        }
    }
};

export default problemStatementsService;
