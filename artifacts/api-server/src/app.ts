import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import healthRouter from "./routes/health";
import externalRouter from "./routes/external";
import apiRouter from "./routes/api";
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
app.use(cookieParser(process.env.SESSION_SECRET ?? "dev-secret"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(parseSession);

app.use(healthRouter);
app.use(externalRouter);
app.use("/api", apiRouter);

export default app;
