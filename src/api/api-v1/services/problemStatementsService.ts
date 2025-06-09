import { ProblemStatement } from "@/classes/mint/mint-types";
import { getProblemStatements } from "@/classes/graphql/graphql_functions";

export interface ProblemStatementsService {
    getProblemStatements(authorizationHeader: string): Promise<ProblemStatement[]>;
}

const problemStatementsService: ProblemStatementsService = {
    async getProblemStatements(authorizationHeader: string) {
        return await getProblemStatements(authorizationHeader);
    }
};

export default problemStatementsService;
