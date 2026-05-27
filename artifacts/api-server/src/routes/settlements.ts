import { Router } from "express";
import { db, settlementsTable, expensesTable, revenuesTable, transfersTable } from "@workspace/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { CreateSettlementBody, GetCycleSummaryQueryParams, ListSettlementsQueryParams } from "@workspace/api-zod";

const router = Router();

async function computeCycle(driverId: number) {
  // Cash revenue = sum of amounts that are paid (not deferred).
  // Gross revenue = all revenue including deferred.
  // Deferred amounts are stored as a negative liability in postponedBalance.
  const revRows = await db
    .select({
      gross: sql<number>`coalesce(sum(${revenuesTable.amount}::numeric), 0)`,
      cash: sql<number>`coalesce(sum(case when ${revenuesTable.isPaid} = true then ${revenuesTable.amount}::numeric else 0 end), 0)`,
      count: sql<number>`count(*)`,
      postponed: sql<number>`coalesce(sum(case when ${revenuesTable.isDeferred} = true then ${revenuesTable.deferredAmount}::numeric else 0 end), 0)`,
      deferredCount: sql<number>`count(*) filter (where ${revenuesTable.isDeferred} = true)`,
    })
    .from(revenuesTable)
    .where(and(eq(revenuesTable.driverId, driverId), isNull(revenuesTable.settlementId)));

  const expRows = await db
    .select({ total: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)`, count: sql<number>`count(*)` })
    .from(expensesTable)
    .where(and(eq(expensesTable.driverId, driverId), isNull(expensesTable.settlementId)));

  const trfRows = await db
    .select({ total: sql<number>`coalesce(sum(${transfersTable.amount}::numeric), 0)`, count: sql<number>`count(*)` })
    .from(transfersTable)
    .where(and(eq(transfersTable.driverId, driverId), isNull(transfersTable.settlementId)));

  const grossRevenue = Number(revRows[0]?.gross ?? 0);
  const totalRevenue = Number(revRows[0]?.cash ?? 0);
  const totalExpenses = Number(expRows[0]?.total ?? 0);
  const totalTransfers = Number(trfRows[0]?.total ?? 0);
  const postponedBalance = -Number(revRows[0]?.postponed ?? 0);
  const netProfit = totalRevenue - totalExpenses;
  const driverShare = netProfit / 2;
  const ownerPayout = netProfit / 2 - totalTransfers;

  return {
    driverId,
    totalRevenue,
    totalExpenses,
    totalTransfers,
    netProfit,
    driverShare,
    ownerPayout,
    revenueCount: Number(revRows[0]?.count ?? 0),
    expenseCount: Number(expRows[0]?.count ?? 0),
    transferCount: Number(trfRows[0]?.count ?? 0),
    postponedBalance,
    deferredCount: Number(revRows[0]?.deferredCount ?? 0),
    grossRevenue,
    cashRevenue: totalRevenue,
  };
}

router.get("/cycle-summary", async (req, res) => {
  const parsed = GetCycleSummaryQueryParams.safeParse({
    driverId: req.query.driverId ? Number(req.query.driverId) : undefined,
  });
  if (!parsed.success || !parsed.data.driverId) {
    res.status(400).json({ error: "driverId is required" });
    return;
  }
  const summary = await computeCycle(parsed.data.driverId);
  res.json(summary);
});

router.get("/settlements", async (req, res) => {
  const parsed = ListSettlementsQueryParams.safeParse({
    driverId: req.query.driverId ? Number(req.query.driverId) : undefined,
  });

  const conditions = [];
  if (parsed.success && parsed.data.driverId) {
    conditions.push(eq(settlementsTable.driverId, parsed.data.driverId));
  }

  const settlements = await db
    .select()
    .from(settlementsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(settlementsTable.createdAt);

  res.json(settlements);
});

router.post("/settlements", async (req, res) => {
  const parsed = CreateSettlementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { driverId } = parsed.data;

  const cycle = await computeCycle(driverId);

  // Find period start (earliest unsettled date)
  const earliestRev = await db
    .select({ minDate: sql<string>`min(${revenuesTable.date})` })
    .from(revenuesTable)
    .where(and(eq(revenuesTable.driverId, driverId), isNull(revenuesTable.settlementId)));

  const earliestExp = await db
    .select({ minDate: sql<string>`min(${expensesTable.date})` })
    .from(expensesTable)
    .where(and(eq(expensesTable.driverId, driverId), isNull(expensesTable.settlementId)));

  const dates = [earliestRev[0]?.minDate, earliestExp[0]?.minDate].filter(Boolean);
  const periodStart = dates.length > 0 ? dates.sort()[0] : new Date().toISOString().split("T")[0];
  const periodEnd = new Date().toISOString().split("T")[0];

  // Create settlement record
  const [settlement] = await db.insert(settlementsTable).values({
    driverId,
    totalRevenue: String(cycle.totalRevenue),
    totalExpenses: String(cycle.totalExpenses),
    totalTransfers: String(cycle.totalTransfers),
    netProfit: String(cycle.netProfit),
    driverShare: String(cycle.driverShare),
    ownerPayout: String(cycle.ownerPayout),
    periodStart: periodStart as string,
    periodEnd,
  }).returning();

  // Archive: link all unsettled records to this settlement
  await db.update(expensesTable)
    .set({ settlementId: settlement.id })
    .where(and(eq(expensesTable.driverId, driverId), isNull(expensesTable.settlementId)));

  await db.update(revenuesTable)
    .set({ settlementId: settlement.id })
    .where(and(eq(revenuesTable.driverId, driverId), isNull(revenuesTable.settlementId)));

  await db.update(transfersTable)
    .set({ settlementId: settlement.id })
    .where(and(eq(transfersTable.driverId, driverId), isNull(transfersTable.settlementId)));

  res.status(201).json(settlement);
});

export default router;
