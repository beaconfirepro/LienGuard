import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import healthRouter from "./routes/health";
import externalRouter from "./routes/external";
import apiRouter from "./routes/api";
import configRouter from "./routes/config";
import projectsRouter from "./routes/projects";
import streamsRouter from "./routes/streams";
import deadlinesRouter from "./routes/deadlines";
import invoicesRouter from "./routes/invoices";
import holdsRouter from "./routes/holds";
import monthlyRouter from "./routes/monthly";
import noticesRouter, { mailingWebhookRouter } from "./routes/notices";
import waiversRouter from "./routes/waivers";
import filingRouter from "./routes/filing";
import reportsRouter from "./routes/reports";
import collectionsRouter from "./routes/collections";
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

// All routes live under /api — the Replit proxy forwards /api/* to port 8080
// without stripping the prefix.
// Order matters: more-specific prefixes must be registered BEFORE /api catch-alls.
app.use("/api", healthRouter);          // GET /api/health, GET /api/healthz  (no auth)
app.use("/api", externalRouter);        // GET /api/external/reference         (service-key)

if (process.env.NODE_ENV !== "production") {
  app.use("/api/dev", devRouter);       // GET /api/dev/session                (no auth)
  logger.info("Dev session routes mounted at /api/dev (non-production only)");
}

app.use("/api/config", configRouter);        // GET/POST /api/config/*              (session)
app.use("/api/projects", projectsRouter);   // GET/POST /api/projects/*            (session)
app.use("/api", streamsRouter);             // POST /api/streams/open, PATCH /api/streams/:id/*
app.use("/api", deadlinesRouter);           // GET /api/deadlines/:workMonthId
app.use("/api", invoicesRouter);            // GET/POST /api/invoices/*
app.use("/api", holdsRouter);               // GET/POST /api/holds/*
app.use("/api/monthly", monthlyRouter);     // POST /api/monthly/run, GET /api/monthly/report, etc.
app.use("/api", noticesRouter);             // POST /api/notices, PATCH /api/notices/:id, etc.
app.use("/api", mailingWebhookRouter);      // POST /api/webhooks/mailing           (no auth — Shippo callback)
app.use("/api", waiversRouter);             // POST /api/waivers, GET /api/waivers/exposure, etc.
app.use("/api", filingRouter);              // POST /api/filing/:streamId/*, GET /api/filing/stream/:sid
app.use("/api", reportsRouter);             // GET /api/reports/exposure, /timeline/:id, /lapsed
app.use("/api/collections", collectionsRouter); // GET/POST /api/collections/*     (session)
app.use("/api", apiRouter);                 // GET /api/org, etc.                  (session, catch-all)

export default app;
