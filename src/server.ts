import bodyParser from "body-parser";
import express from "express";
import path from "path";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import v1ExecutionsService from "./api/api-v1/services/executionsService";
import v1ExecutionsLocalService from "./api/api-v1/services/executionsLocalService";
import v1RegistrationService from "./api/api-v1/services/registrationService";
import v1ExecutionQueueService from "./api/api-v1/services/executionQueueService";
import v1MonitorsService from "./api/api-v1/services/monitorsService";
import v1LogsService from "./api/api-v1/services/logsService";
import v1ThreadsService from "./api/api-v1/services/threadsService";
import v1ModelCacheService from "./api/api-v1/services/modelCacheService";
import v1ExecutionTapisService from "./api/api-v1/services/executionsTapisService";

import { initialize } from "express-openapi";
import { getResource } from "./classes/wings/xhr-requests";

import Queue from "bull";
const { createBullBoard } = require("@bull-board/api");
const { BullAdapter } = require("@bull-board/api/bullAdapter");
const { ExpressAdapter } = require("@bull-board/express");

import { DOWNLOAD_TAPIS_OUTPUT_QUEUE_NAME, EXECUTION_QUEUE_NAME, REDIS_URL } from "./config/redis";
import { PORT, VERSION } from "./config/app";
import jobsService from "./api/api-v1/services/tapis/jobsService";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

// Main Express Server
const app = express();
const port = PORT;
const version = VERSION;
const dashboard_url = "/admin/queues";

const CLIENT_ID = process.env.CLIENT_ID;
const secretKey = process.env.JWT_SECRET_KEY;

// jwt
const client = jwksClient({
    jwksUri: "https://portals.tapis.io/v3/oauth2/jwks"
});

// Setup API
const v1ApiDoc = require("./api/api-doc");
app.use(bodyParser.json());
app.use(cors());

function getKey(header, callback) {
    client.getSigningKey(header.kid, function (err, key) {
        var signingKey = key.getPublicKey();
        callback(null, signingKey);
    });
}

const verifyToken = (token: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        // Get the unverified token header to extract the kid
        const decodedHeader = jwt.decode(token, { complete: true });
        if (!decodedHeader || !decodedHeader.header) {
            reject(new Error("Invalid token format"));
            return;
        }

        jwt.verify(token, getKey, {}, (err, decoded) => {
            if (err) {
                console.error("Token verification error:", err);
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
};

const securityHandlers = {
    BearerAuth: async (req, scopes) => {
        // Get the token from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return false;
        }

        const token = authHeader.split(" ")[1];
        console.log(token);
        return true;
    },
    ImplicitAuth: async (req, scopes) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return false;
        }

        const token = authHeader.split(" ")[1];

        try {
            const decoded = await verifyToken(token);
            return decoded;
        } catch (error) {
            console.error("Token validation error:", error);
            return false;
        }
    }
};

initialize({
    app,
    apiDoc: v1ApiDoc,
    securityHandlers: securityHandlers,
    dependencies: {
        executionsService: v1ExecutionsService,
        executionsLocalService: v1ExecutionsLocalService,
        executionQueueService: v1ExecutionQueueService,
        jobsService: jobsService,
        registrationService: v1RegistrationService,
        monitorsService: v1MonitorsService,
        threadsService: v1ThreadsService,
        logsService: v1LogsService,
        modelCacheService: v1ModelCacheService,
        executionsTapisService: v1ExecutionTapisService
    },
    paths: path.resolve(__dirname, "./api/api-v1/paths"),
    routesGlob: "**/*.{ts,js}",
    routesIndexFileRegExp: /(?:index)?\.[tj]s$/
});

// Setup Error Handler
app.use(((err, req, res, next) => {
    console.log(err);
    const status = err.status || 500;
    res.status(status).json(err);
}) as express.ErrorRequestHandler);

// Setup Queue
const executionQueue = new Queue(EXECUTION_QUEUE_NAME, REDIS_URL);
const downloadTapisOutputQueue = new Queue(DOWNLOAD_TAPIS_OUTPUT_QUEUE_NAME, REDIS_URL);

// Setup Bull Dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath(dashboard_url);

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: [new BullAdapter(executionQueue), new BullAdapter(downloadTapisOutputQueue)],
    serverAdapter: serverAdapter
});

app.use(dashboard_url, serverAdapter.getRouter());

// Express start
app.listen(port, () => {
    // Serve Swagger UI
    getResource({
        url: "http://localhost:" + port + "/" + version + "/api-docs",
        onError: () => {},
        onLoad: (resp: any) => {
            const apidoc = JSON.parse(resp.target.responseText);
            app.use(
                "/" + version + "/ui",
                swaggerUi.serve,
                swaggerUi.setup(apidoc, {
                    swaggerOptions: {
                        oauth: {
                            clientId: CLIENT_ID
                        }
                    }
                })
            );
        }
    });
});
