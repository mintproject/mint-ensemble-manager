import { Router } from "express";
import threadsRouter from "./threads";
import jobsRouter from "./jobs";

export default function () {
    const router = Router();
    router.use("/jobs", jobsRouter());
    router.use("/threads", threadsRouter()); // TODO: remove this
    return router;
}
