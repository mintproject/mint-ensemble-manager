import "cross-fetch/polyfill";
import { ApolloClient, createHttpLink, InMemoryCache, NormalizedCacheObject } from "@apollo/client";
import { User } from "../classes/mint/mint-types";

import { KeycloakAdapter } from "./keycloak-adapter";
import { getConfiguration } from "../classes/mint/mint-functions";

export class GraphQL {
    static client: ApolloClient<NormalizedCacheObject>;
    static userId;

    static instance = (auth: User) => {
        if (GraphQL.client != null && auth.email && auth.email == GraphQL.userId)
            return GraphQL.client;
        GraphQL.userId = auth?.email;

        // Create the Apollo GraphQL Client
        GraphQL.client = new ApolloClient({
            link: GraphQL.getHTTPSLink(),
            cache: new InMemoryCache(),
            defaultOptions: {
                query: {
                    fetchPolicy: "no-cache"
                }
            }
        });
        return GraphQL.client;
    };

    static instanceUsingAccessToken = (access_token: string) => {
        const prefs = getConfiguration();
        const protocol = prefs.graphql.enable_ssl ? "https://" : "http://";
        const uri = protocol + prefs.graphql.endpoint;
        return new ApolloClient({
            link: createHttpLink({
                uri: uri,
                headers: { Authorization: `Bearer ${access_token}` }
            }),
            cache: new InMemoryCache(),
            defaultOptions: {
                query: {
                    fetchPolicy: "no-cache"
                }
            }
        });
    };

    static getHTTPSLink() {
        const prefs = getConfiguration();

        // Normal HTTP Link
        const protocol = prefs.graphql.enable_ssl ? "https://" : "http://";
        const uri = protocol + prefs.graphql.endpoint;

        return createHttpLink({
            uri: uri,
            headers: prefs.graphql.secret
                ? { "X-Hasura-Admin-Secret": prefs.graphql.secret }
                : KeycloakAdapter.getAccessTokenHeader()
        });
    }
}
