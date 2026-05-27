import { Router, type IRouter } from "express";
import healthRouter from "./health";
import driversRouter from "./drivers";
import expensesRouter from "./expenses";
import revenuesRouter from "./revenues";
import transfersRouter from "./transfers";
import settlementsRouter from "./settlements";
import analyticsRouter from "./analytics";
import adminRouter from "./admin";
import invoicesRouter from "./invoices";

const router: IRouter = Router();

router.use(healthRouter);
router.use(driversRouter);
router.use(expensesRouter);
router.use(revenuesRouter);
router.use(transfersRouter);
router.use(settlementsRouter);
router.use(analyticsRouter);
router.use(adminRouter);
router.use(invoicesRouter);

export default router;
