import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import healthRouter from "./routes/health";
import externalRouter from "./routes/external";
import apiRouter from "./routes/api";
import devRouter from "./routes/dev";
import { logger } from "./lib/logger";
import { parseSession } from "./lib/session";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors());
app.use(cookieParser(process.env.SESSION_SECRET ?? "dev-local-secret"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(parseSession);

app.use(healthRouter);
app.use(externalRouter);
app.use("/api", apiRouter);

if (process.env.NODE_ENV !== "production") {
  app.use("/dev", devRouter);
  logger.info("Dev session routes mounted at /dev (non-production only)");
}

export default app;
