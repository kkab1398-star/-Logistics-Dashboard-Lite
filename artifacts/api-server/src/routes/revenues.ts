import { Router } from "express";
import { db, revenuesTable, savedInvoicesTable } from "@workspace/db";
import { eq, and, isNull, isNotNull, sql, ne } from "drizzle-orm";
import { CreateRevenueBody, DeleteRevenueParams, ListRevenuesQueryParams, UpdateRevenueParams, UpdateRevenueBody } from "@workspace/api-zod";
import { notifyRevenue } from "../lib/notifier";

const router = Router();

router.get("/revenues", async (req, res) => {
  const parsed = ListRevenuesQueryParams.safeParse({
    driverId: req.query.driverId ? Number(req.query.driverId) : undefined,
    activeOnly: req.query.activeOnly === "true",
  });

  const conditions = [];
  if (parsed.success && parsed.data.driverId) {
    conditions.push(eq(revenuesTable.driverId, parsed.data.driverId));
  }
  if (parsed.success && parsed.data.activeOnly) {
    conditions.push(isNull(revenuesTable.settlementId));
  }

  const revenues = await db
    .select()
    .from(revenuesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(revenuesTable.date);

  res.json(revenues);
});

router.get("/revenues/clients", async (req, res) => {
  const driverId = req.query.driverId ? Number(req.query.driverId) : undefined;
  const q = req.query.q ? String(req.query.q).toLowerCase() : "";

  const revenueConditions: any[] = [isNotNull(revenuesTable.clientName), ne(revenuesTable.clientName, "")];
  if (driverId) revenueConditions.push(eq(revenuesTable.driverId, driverId));

  const invoiceConditions: any[] = [isNotNull(savedInvoicesTable.clientName), ne(savedInvoicesTable.clientName, "")];
  if (driverId) invoiceConditions.push(eq(savedInvoicesTable.driverId, driverId));

  const [revenueRows, invoiceRows] = await Promise.all([
    db.selectDistinct({ clientName: revenuesTable.clientName })
      .from(revenuesTable)
      .where(and(...revenueConditions)),
    db.selectDistinct({ clientName: savedInvoicesTable.clientName })
      .from(savedInvoicesTable)
      .where(and(...invoiceConditions)),
  ]);

  const allNames = [
    ...revenueRows.map(r => r.clientName),
    ...invoiceRows.map(r => r.clientName),
  ];

  const unique = [...new Set(
    allNames
      .filter((n): n is string => !!n && n.trim().length > 0)
      .filter(n => !q || n.toLowerCase().includes(q))
  )].sort((a, b) => a.localeCompare(b, "ar"));

  res.json(unique);
});

router.post("/revenues", async (req, res) => {
  const parsed = CreateRevenueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const isDeferred = (req.body.isDeferred as boolean) === true;
  const [revenue] = await db.insert(revenuesTable).values({
    driverId: parsed.data.driverId,
    amount: String(parsed.data.amount),
    clientName: (req.body.clientName as string) || null,
    description: parsed.data.description ?? null,
    receiptImageUrl: parsed.data.receiptImageUrl ?? null,
    date: (parsed.data.date as unknown as Date).toISOString().slice(0, 10),
    isDeferred,
    deferredAmount: isDeferred ? String(parsed.data.amount) : "0",
    isPaid: !isDeferred,
  }).returning();
  notifyRevenue(req.log, {
    driverId: revenue.driverId,
    amount: revenue.amount,
    clientName: revenue.clientName,
    description: revenue.description,
    date: revenue.date,
  });
  res.status(201).json(revenue);
});

router.patch("/revenues/:id/repay", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid revenue ID" });
    return;
  }
  // Atomic conditional update: only repay if still unsettled. Prevents a race
  // where settlement archives the row between a read-then-write check.
  const updatedRows = await db
    .update(revenuesTable)
    .set({ isDeferred: false, deferredAmount: "0", isPaid: true })
    .where(and(eq(revenuesTable.id, id), isNull(revenuesTable.settlementId)))
    .returning();
  if (updatedRows.length === 0) {
    // Determine whether the row is missing or already settled
    const existing = await db
      .select({ settlementId: revenuesTable.settlementId })
      .from(revenuesTable)
      .where(eq(revenuesTable.id, id));
    if (existing.length === 0) {
      res.status(404).json({ error: "Revenue not found" });
      return;
    }
    res.status(409).json({ error: "Cannot repay a settled revenue" });
    return;
  }
  res.json(updatedRows[0]);
});

router.patch("/revenues/:id", async (req, res) => {
  const paramsParsed = UpdateRevenueParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid revenue ID" });
    return;
  }
  const bodyParsed = UpdateRevenueBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (bodyParsed.data.amount !== undefined) updates.amount = String(bodyParsed.data.amount);
  if (bodyParsed.data.clientName !== undefined) updates.clientName = bodyParsed.data.clientName ?? null;
  if (bodyParsed.data.description !== undefined) updates.description = bodyParsed.data.description ?? null;
  if (bodyParsed.data.date !== undefined) updates.date = bodyParsed.data.date;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const existing = await db.select().from(revenuesTable).where(eq(revenuesTable.id, paramsParsed.data.id));
  if (existing.length === 0) {
    res.status(404).json({ error: "Revenue not found" });
    return;
  }
  if (existing[0].settlementId !== null) {
    res.status(409).json({ error: "Cannot edit a settled revenue" });
    return;
  }

  // Keep deferred_amount in sync when the amount of a still-deferred revenue
  // is edited — otherwise cycle math (amount - deferredAmount) would silently
  // double-count or under-count the difference.
  if (
    updates.amount !== undefined &&
    existing[0].isDeferred &&
    bodyParsed.data.amount !== undefined
  ) {
    updates.deferredAmount = String(bodyParsed.data.amount);
  }

  const [updated] = await db
    .update(revenuesTable)
    .set(updates)
    .where(eq(revenuesTable.id, paramsParsed.data.id))
    .returning();

  res.json(updated);
});

router.delete("/revenues/:id", async (req, res) => {
  const parsed = DeleteRevenueParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid revenue ID" });
    return;
  }

  const [existing] = await db
    .select({ settlementId: revenuesTable.settlementId })
    .from(revenuesTable)
    .where(eq(revenuesTable.id, parsed.data.id));

  if (!existing) {
    res.status(404).json({ error: "Revenue not found" });
    return;
  }
  if (existing.settlementId != null) {
    res.status(409).json({ error: "Cannot delete a settled revenue" });
    return;
  }

  await db.delete(revenuesTable).where(eq(revenuesTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
