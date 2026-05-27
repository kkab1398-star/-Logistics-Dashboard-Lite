import { Router } from "express";
import { db, expensesTable } from "@workspace/db";
import { eq, and, gte, lte, sql, isNull } from "drizzle-orm";
import {
  CreateExpenseBody,
  DeleteExpenseParams,
  ListExpensesQueryParams,
  GetExpenseSummaryQueryParams,
  UpdateExpenseParams,
  UpdateExpenseBody,
} from "@workspace/api-zod";
import { notifyExpense } from "../lib/notifier";

const router = Router();

router.get("/expenses/summary", async (req, res) => {
  const parsed = GetExpenseSummaryQueryParams.safeParse({
    driverId: req.query.driverId ? Number(req.query.driverId) : undefined,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    activeOnly: req.query.activeOnly === "true",
  });

  const conditions = [];
  if (parsed.success && parsed.data.driverId) {
    conditions.push(eq(expensesTable.driverId, parsed.data.driverId));
  }
  if (parsed.success && parsed.data.startDate) {
    conditions.push(gte(expensesTable.date, parsed.data.startDate as string));
  }
  if (parsed.success && parsed.data.endDate) {
    conditions.push(lte(expensesTable.date, parsed.data.endDate as string));
  }
  if (parsed.success && parsed.data.activeOnly) {
    conditions.push(isNull(expensesTable.settlementId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      type: expensesTable.type,
      totalAmount: sql<number>`sum(${expensesTable.amount}::numeric)`,
      totalLiters: sql<number>`sum(${expensesTable.liters}::numeric)`,
      count: sql<number>`count(*)`,
    })
    .from(expensesTable)
    .where(whereClause)
    .groupBy(expensesTable.type);

  let totalAmount = 0;
  let dieselTotal = 0;
  let dieselLiters = 0;
  let oilTotal = 0;
  let maintenanceTotal = 0;
  let otherTotal = 0;
  let expenseCount = 0;

  for (const row of rows) {
    const amt = Number(row.totalAmount) || 0;
    totalAmount += amt;
    expenseCount += Number(row.count) || 0;
    if (row.type === "diesel") {
      dieselTotal = amt;
      dieselLiters = Number(row.totalLiters) || 0;
    } else if (row.type === "oil") {
      oilTotal = amt;
    } else if (row.type === "maintenance") {
      maintenanceTotal = amt;
    } else if (row.type === "other") {
      otherTotal = amt;
    }
  }

  res.json({ totalAmount, dieselTotal, dieselLiters, oilTotal, maintenanceTotal, otherTotal, expenseCount });
});

router.get("/expenses", async (req, res) => {
  const parsed = ListExpensesQueryParams.safeParse({
    driverId: req.query.driverId ? Number(req.query.driverId) : undefined,
    type: req.query.type,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    activeOnly: req.query.activeOnly === "true",
  });

  const conditions = [];
  if (parsed.success && parsed.data.driverId) {
    conditions.push(eq(expensesTable.driverId, parsed.data.driverId));
  }
  if (parsed.success && parsed.data.type) {
    conditions.push(eq(expensesTable.type, parsed.data.type));
  }
  if (parsed.success && parsed.data.startDate) {
    conditions.push(gte(expensesTable.date, parsed.data.startDate as string));
  }
  if (parsed.success && parsed.data.endDate) {
    conditions.push(lte(expensesTable.date, parsed.data.endDate as string));
  }
  if (parsed.success && parsed.data.activeOnly) {
    conditions.push(isNull(expensesTable.settlementId));
  }

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(expensesTable.date);

  res.json(expenses);
});

router.post("/expenses", async (req, res) => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [expense] = await db.insert(expensesTable).values({
    driverId: parsed.data.driverId,
    type: parsed.data.type,
    amount: String(parsed.data.amount),
    liters: parsed.data.liters != null ? String(parsed.data.liters) : null,
    notes: parsed.data.notes ?? null,
    invoiceImageUrl: parsed.data.invoiceImageUrl ?? null,
    date: (parsed.data.date as unknown as Date).toISOString().slice(0, 10),
  }).returning();
  notifyExpense(req.log, {
    driverId: expense.driverId,
    type: expense.type,
    amount: expense.amount,
    liters: expense.liters,
    notes: expense.notes,
    date: expense.date,
  });
  res.status(201).json(expense);
});

router.patch("/expenses/:id", async (req, res) => {
  const paramsParsed = UpdateExpenseParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid expense ID" });
    return;
  }
  const bodyParsed = UpdateExpenseBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [existing] = await db
    .select({ settlementId: expensesTable.settlementId })
    .from(expensesTable)
    .where(eq(expensesTable.id, paramsParsed.data.id));

  if (!existing) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  if (existing.settlementId != null) {
    res.status(409).json({ error: "Cannot edit a settled expense" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (bodyParsed.data.type !== undefined) updates.type = bodyParsed.data.type;
  if (bodyParsed.data.amount !== undefined) updates.amount = String(bodyParsed.data.amount);
  if ("liters" in bodyParsed.data) updates.liters = bodyParsed.data.liters != null ? String(bodyParsed.data.liters) : null;
  if ("notes" in bodyParsed.data) updates.notes = bodyParsed.data.notes ?? null;
  if (bodyParsed.data.date !== undefined) updates.date = bodyParsed.data.date;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(expensesTable)
    .set(updates)
    .where(eq(expensesTable.id, paramsParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.json(updated);
});

router.delete("/expenses/:id", async (req, res) => {
  const parsed = DeleteExpenseParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid expense ID" });
    return;
  }
  await db.delete(expensesTable).where(eq(expensesTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
