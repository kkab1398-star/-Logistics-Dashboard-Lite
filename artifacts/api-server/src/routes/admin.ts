import { Router } from "express";
import { db, expensesTable, revenuesTable, transfersTable, settlementsTable, driversTable, savedInvoicesTable, globalTotalsTable } from "@workspace/db";
import { and, eq, gte, lte, lt, sql, exists } from "drizzle-orm";

const router = Router();

const ADMIN_CODE = "1234";

router.post("/admin/reset", async (req, res) => {
  const { adminCode } = req.body as { adminCode?: string };

  if (adminCode !== ADMIN_CODE) {
    return res.status(403).json({ error: "Invalid admin code" });
  }

  try {
    // Delete in dependency order: child tables first, then parents
    const [deletedInvoices, deletedExpenses, deletedRevenues, deletedTransfers, deletedSettlements] =
      await Promise.all([
        db.delete(savedInvoicesTable).returning({ id: savedInvoicesTable.id }),
        db.delete(expensesTable).returning({ id: expensesTable.id }),
        db.delete(revenuesTable).returning({ id: revenuesTable.id }),
        db.delete(transfersTable).returning({ id: transfersTable.id }),
        db.delete(settlementsTable).returning({ id: settlementsTable.id }),
      ]);

    // Delete drivers last (revenues/expenses reference driverId but are already gone)
    const deletedDrivers = await db.delete(driversTable).returning({ id: driversTable.id });

    return res.json({
      success: true,
      deleted: {
        invoices: deletedInvoices.length,
        expenses: deletedExpenses.length,
        revenues: deletedRevenues.length,
        transfers: deletedTransfers.length,
        settlements: deletedSettlements.length,
        drivers: deletedDrivers.length,
      },
    });
  } catch (err) {
    console.error("Reset failed:", err);
    return res.status(500).json({ error: "Reset failed" });
  }
});

router.get("/admin/archive", async (req, res) => {
  try {
    const { driverId, month, clientName } = req.query as { driverId?: string; month?: string; clientName?: string };

    const conditions = [];

    if (driverId) {
      const id = parseInt(driverId, 10);
      if (!isNaN(id)) {
        conditions.push(eq(settlementsTable.driverId, id));
      }
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, mon] = month.split("-").map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);
      conditions.push(gte(settlementsTable.createdAt, start));
      conditions.push(lt(settlementsTable.createdAt, end));
    }

    if (clientName && clientName.trim()) {
      const pattern = `%${clientName.trim().toLowerCase()}%`;
      conditions.push(
        exists(
          db
            .select({ one: sql<number>`1` })
            .from(revenuesTable)
            .where(
              and(
                eq(revenuesTable.settlementId, settlementsTable.id),
                sql`lower(${revenuesTable.clientName}) like ${pattern}`
              )
            )
        )
      );
    }

    const query = db
      .select({
        id: settlementsTable.id,
        driverId: settlementsTable.driverId,
        driverName: driversTable.name,
        vehicleNumber: driversTable.vehicleNumber,
        totalRevenue: settlementsTable.totalRevenue,
        totalExpenses: settlementsTable.totalExpenses,
        netProfit: settlementsTable.netProfit,
        driverShare: settlementsTable.driverShare,
        ownerPayout: settlementsTable.ownerPayout,
        periodStart: settlementsTable.periodStart,
        periodEnd: settlementsTable.periodEnd,
        createdAt: settlementsTable.createdAt,
      })
      .from(settlementsTable)
      .innerJoin(driversTable, eq(settlementsTable.driverId, driversTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(settlementsTable.createdAt);

    const rows = await query;
    return res.json(rows);
  } catch (err) {
    console.error("Archive fetch failed:", err);
    return res.status(500).json({ error: "Failed to fetch archive" });
  }
});

router.get("/admin/archive/:id/operations", async (req, res) => {
  const settlementId = Number(req.params.id);
  if (!settlementId) return res.status(400).json({ error: "Invalid settlement ID" });

  try {
    const [revenues, expenses, transfers, settlement] = await Promise.all([
      db.select().from(revenuesTable).where(eq(revenuesTable.settlementId, settlementId)),
      db.select().from(expensesTable).where(eq(expensesTable.settlementId, settlementId)),
      db.select().from(transfersTable).where(eq(transfersTable.settlementId, settlementId)),
      db.select({
        id: settlementsTable.id,
        driverName: driversTable.name,
        vehicleNumber: driversTable.vehicleNumber,
        periodStart: settlementsTable.periodStart,
        periodEnd: settlementsTable.periodEnd,
        totalRevenue: settlementsTable.totalRevenue,
        totalExpenses: settlementsTable.totalExpenses,
        netProfit: settlementsTable.netProfit,
        driverShare: settlementsTable.driverShare,
        ownerPayout: settlementsTable.ownerPayout,
        createdAt: settlementsTable.createdAt,
      })
        .from(settlementsTable)
        .innerJoin(driversTable, eq(settlementsTable.driverId, driversTable.id))
        .where(eq(settlementsTable.id, settlementId))
        .limit(1),
    ]);

    return res.json({
      settlement: settlement[0] ?? null,
      revenues,
      expenses,
      transfers,
    });
  } catch (err) {
    console.error("Archive operations fetch failed:", err);
    return res.status(500).json({ error: "Failed to fetch operations" });
  }
});

router.get("/admin/stats/timeseries", async (req, res) => {
  const driverId = req.query.driverId ? Number(req.query.driverId) : undefined;

  try {
    const revQuery = db
      .select({
        month: sql<string>`to_char(${revenuesTable.date}, 'YYYY-MM')`.as("month"),
        total: sql<number>`coalesce(sum(${revenuesTable.amount}::numeric), 0)`.as("total"),
      })
      .from(revenuesTable)
      .groupBy(sql`to_char(${revenuesTable.date}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${revenuesTable.date}, 'YYYY-MM')`);

    const expQuery = db
      .select({
        month: sql<string>`to_char(${expensesTable.date}, 'YYYY-MM')`.as("month"),
        total: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)`.as("total"),
      })
      .from(expensesTable)
      .groupBy(sql`to_char(${expensesTable.date}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${expensesTable.date}, 'YYYY-MM')`);

    if (driverId) {
      revQuery.where(eq(revenuesTable.driverId, driverId));
      expQuery.where(eq(expensesTable.driverId, driverId));
    }

    const [revRows, expRows] = await Promise.all([revQuery, expQuery]);

    const monthSet = new Set([...revRows.map(r => r.month), ...expRows.map(e => e.month)]);
    const revMap = Object.fromEntries(revRows.map(r => [r.month, Number(r.total)]));
    const expMap = Object.fromEntries(expRows.map(e => [e.month, Number(e.total)]));

    const months = [...monthSet].sort();
    const series = months.map(m => ({
      month: m,
      revenue: revMap[m] ?? 0,
      expenses: expMap[m] ?? 0,
      profit: (revMap[m] ?? 0) - (expMap[m] ?? 0),
    }));

    return res.json(series);
  } catch (err) {
    console.error("Timeseries fetch failed:", err);
    return res.status(500).json({ error: "Failed to fetch timeseries" });
  }
});

router.get("/admin/stats/clients/:clientName/timeseries", async (req, res) => {
  const clientName = req.params.clientName;
  try {
    const rows = await db
      .select({
        month: sql<string>`to_char(${revenuesTable.date}, 'YYYY-MM')`.as("month"),
        revenue: sql<number>`coalesce(sum(${revenuesTable.amount}::numeric), 0)`.as("revenue"),
        entryCount: sql<number>`count(*)`.as("entryCount"),
      })
      .from(revenuesTable)
      .where(
        sql`coalesce(nullif(trim(${revenuesTable.clientName}), ''), 'Unknown') = ${clientName}`
      )
      .groupBy(sql`to_char(${revenuesTable.date}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${revenuesTable.date}, 'YYYY-MM')`);

    return res.json(rows.map(r => ({
      month: r.month,
      revenue: Number(r.revenue),
      entryCount: Number(r.entryCount),
    })));
  } catch (err) {
    console.error("Client timeseries fetch failed:", err);
    return res.status(500).json({ error: "Failed to fetch client timeseries" });
  }
});

router.get("/admin/stats/clients", async (req, res) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate   = req.query.endDate   as string | undefined;

  const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
  if (startDate && !isValidDate(startDate)) {
    return res.status(400).json({ error: "Invalid startDate; expected YYYY-MM-DD" });
  }
  if (endDate && !isValidDate(endDate)) {
    return res.status(400).json({ error: "Invalid endDate; expected YYYY-MM-DD" });
  }
  if (startDate && endDate && startDate > endDate) {
    return res.status(400).json({ error: "startDate must be on or before endDate" });
  }

  const conditions: ReturnType<typeof gte>[] = [];
  if (startDate) conditions.push(gte(revenuesTable.date, startDate));
  if (endDate)   conditions.push(lte(revenuesTable.date, endDate));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  try {
    const rows = await db
      .select({
        clientName: sql<string>`coalesce(nullif(trim(${revenuesTable.clientName}), ''), 'Unknown')`.as("clientName"),
        totalRevenue: sql<number>`coalesce(sum(${revenuesTable.amount}::numeric), 0)`.as("totalRevenue"),
        entryCount: sql<number>`count(*)`.as("entryCount"),
      })
      .from(revenuesTable)
      .where(whereClause)
      .groupBy(sql`coalesce(nullif(trim(${revenuesTable.clientName}), ''), 'Unknown')`)
      .orderBy(sql`coalesce(sum(${revenuesTable.amount}::numeric), 0) desc`);

    return res.json(
      rows.map(r => ({
        clientName: r.clientName,
        totalRevenue: Number(r.totalRevenue),
        entryCount: Number(r.entryCount),
      }))
    );
  } catch (err) {
    console.error("Client stats fetch failed:", err);
    return res.status(500).json({ error: "Failed to fetch client stats" });
  }
});

router.get("/admin/global-summary", async (_req, res) => {
  try {
    // Read pre-aggregated totals from the single-row `global_totals` table.
    // The row is kept in sync incrementally by Postgres triggers on
    // revenues/expenses/settlements (see initGlobalTotals on server boot),
    // so this endpoint is O(1) regardless of dataset size.
    const rows = await db
      .select({
        totalRevenues: globalTotalsTable.totalRevenues,
        totalExpenses: globalTotalsTable.totalExpenses,
        totalOwnerProfit: globalTotalsTable.totalOwnerProfit,
        totalDriverEarnings: globalTotalsTable.totalDriverEarnings,
      })
      .from(globalTotalsTable)
      .where(eq(globalTotalsTable.id, 1))
      .limit(1);

    const row = rows[0];
    return res.json({
      totalRevenues: Number(row?.totalRevenues ?? 0),
      totalExpenses: Number(row?.totalExpenses ?? 0),
      totalOwnerProfit: Number(row?.totalOwnerProfit ?? 0),
      totalDriverEarnings: Number(row?.totalDriverEarnings ?? 0),
    });
  } catch (err) {
    console.error("Global summary fetch failed:", err);
    return res.status(500).json({ error: "Failed to fetch global summary" });
  }
});

router.get("/admin/activity", async (req, res) => {
  const driverId = req.query.driverId ? Number(req.query.driverId) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate   = req.query.endDate   as string | undefined;

  if (!driverId) {
    return res.status(400).json({ error: "driverId is required" });
  }

  const baseConditions = (table: typeof revenuesTable | typeof expensesTable | typeof transfersTable) => {
    const conds: any[] = [eq(table.driverId, driverId)];
    if (startDate) conds.push(gte(table.date, startDate));
    if (endDate)   conds.push(lte(table.date, endDate));
    return and(...conds);
  };

  try {
    const [revenues, expenses, transfers] = await Promise.all([
      db.select().from(revenuesTable).where(baseConditions(revenuesTable)).orderBy(revenuesTable.date),
      db.select().from(expensesTable).where(baseConditions(expensesTable)).orderBy(expensesTable.date),
      db.select().from(transfersTable).where(baseConditions(transfersTable)).orderBy(transfersTable.date),
    ]);

    const totalRevenue   = revenues.reduce((s, r) => s + Number(r.amount), 0);
    const totalExpenses  = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalTransfers = transfers.reduce((s, t) => s + Number(t.amount), 0);

    return res.json({
      revenues,
      expenses,
      transfers,
      summary: {
        totalRevenue,
        totalExpenses,
        totalTransfers,
        net: totalRevenue - totalExpenses,
      },
    });
  } catch (err) {
    console.error("Activity fetch failed:", err);
    return res.status(500).json({ error: "Failed to fetch activity" });
  }
});

export default router;
