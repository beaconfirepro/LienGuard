import { Router, type IRouter } from "express";
import healthRouter from "./health";
import externalRouter from "./external";

const router: IRouter = Router();

router.use(healthRouter);
router.use(externalRouter);

export default router;
