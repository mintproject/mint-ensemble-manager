import bodyParser from "body-parser";
import express, { Request, Response, ErrorRequestHandler } from "express";
import cors from "cors";
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { ExpressAdapter } from "@bull-board/express";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import v1ExecutionsService from "@/api/api-v1/services/executionsService";
import v1ExecutionsLocalService from "@/api/api-v1/services/executionsLocalService";
import v1RegistrationService from "@/api/api-v1/services/registrationService";
import v1ExecutionQueueService from "@/api/api-v1/services/executionQueueService";
import v1MonitorsService from "@/api/api-v1/services/monitorsService";
import v1LogsService from "@/api/api-v1/services/logsService";
import v1ThreadsService from "@/api/api-v1/services/threadsService";
import v1ModelCacheService from "@/api/api-v1/services/modelCacheService";

import Queue from "bull";

import { DOWNLOAD_TAPIS_OUTPUT_QUEUE_NAME, EXECUTION_QUEUE_NAME, REDIS_URL } from "@/config/redis";
import { PORT, VERSION } from "@/config/app";

// Import route handlers
import executionQueueRoutes from "@/api/api-v1/paths/executionQueue";
import executionsRoutes from "@/api/api-v1/paths/executions";
import executionsLocalRoutes from "@/api/api-v1/paths/executionsLocal";
import logsRoutes from "@/api/api-v1/paths/logs";
import modelCacheRoutes from "@/api/api-v1/paths/modelCache";
import monitorsRoutes from "@/api/api-v1/paths/monitors";
import registrationRoutes from "@/api/api-v1/paths/registration";
import threadsRoutes from "@/api/api-v1/paths/threads";
import apiDocComponents from "@/api/api-doc";
import tapisRouter from "@/api/api-v1/paths/tapis";
import executionEnginesRouter from "@/api/api-v1/paths/executionEngines/tapis";
import problemStatementsRouter from "@/api/api-v1/paths/problemStatements";
import { getConfiguration } from "./classes/mint/mint-functions";

// Main Express Server
const app = express();
const port = PORT;
const version = VERSION;
const dashboard_url = "/admin/queues";

// const CLIENT_ID = getConfiguration().auth.client_id;

// Setup API
app.use(bodyParser.json());
app.use(cors());

// Register routes
app.use(`/${version}/executionQueue`, executionQueueRoutes(v1ExecutionQueueService));
app.use(`/${version}/executions`, executionsRoutes(v1ExecutionsService));
app.use(`/${version}/executionsLocal`, executionsLocalRoutes(v1ExecutionsLocalService));
app.use(`/${version}/logs`, logsRoutes(v1LogsService));
app.use(`/${version}/modelCache`, modelCacheRoutes(v1ModelCacheService));
app.use(`/${version}/monitors`, monitorsRoutes(v1MonitorsService));
app.use(`/${version}/registration`, registrationRoutes(v1RegistrationService));
app.use(`/${version}/threads`, threadsRoutes(v1ThreadsService));
app.use(`/${version}/executionEngines`, executionEnginesRouter());
app.use(`/${version}/tapis`, tapisRouter());
app.use(`/${version}/problemStatements`, problemStatementsRouter());
// Swagger-jsdoc setup
//obtain server from the hosts headers

const CONFIG_SERVERS = getConfiguration().openapi?.servers || [];

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Mint Ensemble Manager API",
            version: "1.0.0"
        },
        servers: CONFIG_SERVERS,
        components: apiDocComponents.components
    },
    apis: ["./src/api/api-v1/paths/*.ts", "./src/api/api-v1/paths/**/*.ts", "./src/api/api-doc.ts"]
};
const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use(`/${version}/ui`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Setup Error Handler
const errorHandler: ErrorRequestHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: Function
) => {
    console.error(err);
    res.status(500).json({ message: err.message });
};
app.use(errorHandler);

// Setup Queue
const executionQueue = new Queue(EXECUTION_QUEUE_NAME, REDIS_URL);
const downloadTapisOutputQueue = new Queue(DOWNLOAD_TAPIS_OUTPUT_QUEUE_NAME, REDIS_URL);

// Setup Bull Dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath(dashboard_url);

createBullBoard({
    queues: [new BullAdapter(executionQueue), new BullAdapter(downloadTapisOutputQueue)],
    serverAdapter: serverAdapter
});

app.use(dashboard_url, serverAdapter.getRouter());

// Express start
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
