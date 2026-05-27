import { Router } from "express";
import { db, transfersTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { CreateTransferBody, DeleteTransferParams, ListTransfersQueryParams, UpdateTransferParams, UpdateTransferBody } from "@workspace/api-zod";
import { notifyTransfer } from "../lib/notifier";

const router = Router();

router.get("/transfers", async (req, res) => {
  const parsed = ListTransfersQueryParams.safeParse({
    driverId: req.query.driverId ? Number(req.query.driverId) : undefined,
    activeOnly: req.query.activeOnly === "true",
  });

  const conditions = [];
  if (parsed.success && parsed.data.driverId) {
    conditions.push(eq(transfersTable.driverId, parsed.data.driverId));
  }
  if (parsed.success && parsed.data.activeOnly) {
    conditions.push(isNull(transfersTable.settlementId));
  }

  const transfers = await db
    .select()
    .from(transfersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(transfersTable.date);

  res.json(transfers);
});

router.post("/transfers", async (req, res) => {
  const parsed = CreateTransferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [transfer] = await db.insert(transfersTable).values({
    driverId: parsed.data.driverId,
    amount: String(parsed.data.amount),
    description: parsed.data.description ?? null,
    receiptImageUrl: parsed.data.receiptImageUrl ?? null,
    date: (parsed.data.date as unknown as Date).toISOString().slice(0, 10),
  }).returning();
  notifyTransfer(req.log, {
    driverId: transfer.driverId,
    amount: transfer.amount,
    description: transfer.description,
    date: transfer.date,
  });
  res.status(201).json(transfer);
});

router.patch("/transfers/:id", async (req, res) => {
  const paramsParsed = UpdateTransferParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid transfer ID" });
    return;
  }
  const bodyParsed = UpdateTransferBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (bodyParsed.data.amount !== undefined) updates.amount = String(bodyParsed.data.amount);
  if (bodyParsed.data.description !== undefined) updates.description = bodyParsed.data.description ?? null;
  if (bodyParsed.data.date !== undefined) updates.date = bodyParsed.data.date;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const existing = await db.select().from(transfersTable).where(eq(transfersTable.id, paramsParsed.data.id));
  if (existing.length === 0) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }
  if (existing[0].settlementId !== null) {
    res.status(409).json({ error: "Cannot edit a settled transfer" });
    return;
  }

  const [updated] = await db
    .update(transfersTable)
    .set(updates)
    .where(eq(transfersTable.id, paramsParsed.data.id))
    .returning();

  res.json(updated);
});

router.delete("/transfers/:id", async (req, res) => {
  const parsed = DeleteTransferParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid transfer ID" });
    return;
  }
  await db.delete(transfersTable).where(eq(transfersTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
