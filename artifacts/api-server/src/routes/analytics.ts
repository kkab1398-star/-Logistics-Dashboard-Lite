import { Router } from "express";
import { db, expensesTable, revenuesTable, settlementsTable, driversTable } from "@workspace/db";
import { eq, gte, lte, and, isNull, sql } from "drizzle-orm";
import { GetAnalyticsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/analytics", async (req, res) => {
  const parsed = GetAnalyticsQueryParams.safeParse({
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });

  const expConditions: any[] = [isNull(expensesTable.settlementId)];
  const revConditions: any[] = [isNull(revenuesTable.settlementId)];

  if (parsed.success && parsed.data.startDate) {
    expConditions.push(gte(expensesTable.date, parsed.data.startDate as string));
    revConditions.push(gte(revenuesTable.date, parsed.data.startDate as string));
  }
  if (parsed.success && parsed.data.endDate) {
    expConditions.push(lte(expensesTable.date, parsed.data.endDate as string));
    revConditions.push(lte(revenuesTable.date, parsed.data.endDate as string));
  }

  const [globalRev] = await db
    .select({
      total: sql<number>`coalesce(sum(case when ${revenuesTable.isPaid} = true then ${revenuesTable.amount}::numeric else 0 end), 0)`,
      gross: sql<number>`coalesce(sum(${revenuesTable.amount}::numeric), 0)`,
      postponed: sql<number>`coalesce(sum(case when ${revenuesTable.isDeferred} = true then ${revenuesTable.deferredAmount}::numeric else 0 end), 0)`,
      deferredCount: sql<number>`count(*) filter (where ${revenuesTable.isDeferred} = true)`,
    })
    .from(revenuesTable)
    .where(and(...revConditions));

  const [globalExp] = await db
    .select({ total: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)` })
    .from(expensesTable)
    .where(and(...expConditions));

  const [driverCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(driversTable);

  const [settlementCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(settlementsTable);

  const drivers = await db.select().from(driversTable);

  const perDriver = await Promise.all(drivers.map(async (driver) => {
    const driverRevCond = [isNull(revenuesTable.settlementId), eq(revenuesTable.driverId, driver.id)];
    const driverExpCond = [isNull(expensesTable.settlementId), eq(expensesTable.driverId, driver.id)];

    if (parsed.success && parsed.data.startDate) {
      driverRevCond.push(gte(revenuesTable.date, parsed.data.startDate as string));
      driverExpCond.push(gte(expensesTable.date, parsed.data.startDate as string));
    }
    if (parsed.success && parsed.data.endDate) {
      driverRevCond.push(lte(revenuesTable.date, parsed.data.endDate as string));
      driverExpCond.push(lte(expensesTable.date, parsed.data.endDate as string));
    }

    const [rev] = await db
      .select({
        total: sql<number>`coalesce(sum(case when ${revenuesTable.isPaid} = true then ${revenuesTable.amount}::numeric else 0 end), 0)`,
        gross: sql<number>`coalesce(sum(${revenuesTable.amount}::numeric), 0)`,
        postponed: sql<number>`coalesce(sum(case when ${revenuesTable.isDeferred} = true then ${revenuesTable.deferredAmount}::numeric else 0 end), 0)`,
        deferredCount: sql<number>`count(*) filter (where ${revenuesTable.isDeferred} = true)`,
      })
      .from(revenuesTable)
      .where(and(...driverRevCond));

    const [exp] = await db
      .select({ total: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)` })
      .from(expensesTable)
      .where(and(...driverExpCond));

    const [sets] = await db
      .select({ count: sql<number>`count(*)` })
      .from(settlementsTable)
      .where(eq(settlementsTable.driverId, driver.id));

    const totalRevenue = Number(rev?.total ?? 0);
    const totalExpenses = Number(exp?.total ?? 0);

    return {
      driverId: driver.id,
      driverName: driver.name,
      vehicleNumber: driver.vehicleNumber,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      settlementCount: Number(sets?.count ?? 0),
      postponedBalance: -Number(rev?.postponed ?? 0),
      deferredCount: Number(rev?.deferredCount ?? 0),
      grossRevenue: Number(rev?.gross ?? 0),
      cashRevenue: totalRevenue,
    };
  }));

  const totalRevenue = Number(globalRev?.total ?? 0);
  const totalExpenses = Number(globalExp?.total ?? 0);

  res.json({
    totalRevenue,
    totalExpenses,
    totalTransfers: 0,
    netProfit: totalRevenue - totalExpenses,
    driverCount: Number(driverCountRow?.count ?? 0),
    settlementCount: Number(settlementCountRow?.count ?? 0),
    grossRevenue: Number(globalRev?.gross ?? 0),
    cashRevenue: totalRevenue,
    postponedBalance: -Number(globalRev?.postponed ?? 0),
    deferredCount: Number(globalRev?.deferredCount ?? 0),
    perDriver,
  });
});

export default router;
