import { GraphQL } from "@/config/graphql";
import listProblemStatementsGQL from "./queries/problem-statement/list.graphql";
import getProblemStatementGQL from "./queries/problem-statement/get.graphql";
import { InternalServerError } from "@/classes/common/errors";
import { ApolloQueryResult } from "@apollo/client";
import { Problem_Statement } from "./types";
import { KeycloakAdapter } from "@/config/keycloak-adapter";

export const getProblemStatements = async (access_token: string): Promise<Problem_Statement[]> => {
    const APOLLO_CLIENT = GraphQL.instanceUsingAccessToken(access_token);
    const result: ApolloQueryResult<{ problem_statement: Problem_Statement[] }> =
        await APOLLO_CLIENT.query({
            query: listProblemStatementsGQL,
            fetchPolicy: "no-cache"
        });

    if (!result || (result.errors && result.errors.length > 0)) {
        throw new InternalServerError(
            "Error getting problem statements " + result.errors[0].message
        );
    }
    return result.data.problem_statement;
};

export const getProblemStatement = async (
    problem_statement_id: string,
    access_token?: string
): Promise<Problem_Statement> => {
    const APOLLO_CLIENT = access_token
        ? GraphQL.instanceUsingAccessToken(access_token)
        : GraphQL.instance(KeycloakAdapter.getUser());
    const result: ApolloQueryResult<{ problem_statement_by_pk: Problem_Statement }> =
        await APOLLO_CLIENT.query({
            query: getProblemStatementGQL,
            variables: {
                id: problem_statement_id
            }
        });
    if (!result || (result.errors && result.errors.length > 0)) {
        throw new InternalServerError(
            "Error getting problem statement " + result.errors[0].message
        );
    }
    return result.data.problem_statement_by_pk;
};
