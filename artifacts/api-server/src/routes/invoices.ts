import { Router } from "express";
import { db, savedInvoicesTable, revenuesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/invoices", async (req, res) => {
  const {
    invoiceNumber, driverId, revenueId, clientName,
    serviceType, amount, date, notes, driverName, vehicleNumber,
  } = req.body as {
    invoiceNumber: string;
    driverId?: number;
    revenueId?: number;
    clientName?: string;
    serviceType: string;
    amount: number;
    date: string;
    notes?: string;
    driverName?: string;
    vehicleNumber?: string;
  };

  if (!invoiceNumber || !serviceType || !amount || !date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const [saved] = await db.insert(savedInvoicesTable).values({
      invoiceNumber,
      driverId: driverId ?? null,
      revenueId: revenueId ?? null,
      clientName: clientName ?? null,
      serviceType,
      amount: String(amount),
      date,
      notes: notes ?? null,
      driverName: driverName ?? null,
      vehicleNumber: vehicleNumber ?? null,
    }).returning();

    if (revenueId) {
      await db
        .update(revenuesTable)
        .set({ hasSavedInvoice: true, savedInvoiceId: saved.id })
        .where(eq(revenuesTable.id, revenueId));
    }

    return res.status(201).json(saved);
  } catch (err) {
    console.error("Save invoice failed:", err);
    return res.status(500).json({ error: "Failed to save invoice" });
  }
});

router.get("/invoices/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid invoice ID" });

  try {
    const [invoice] = await db
      .select()
      .from(savedInvoicesTable)
      .where(eq(savedInvoicesTable.id, id))
      .limit(1);

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    return res.json(invoice);
  } catch (err) {
    console.error("Get invoice failed:", err);
    return res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

router.get("/revenues/:revenueId/invoice", async (req, res) => {
  const revenueId = Number(req.params.revenueId);
  if (!revenueId) return res.status(400).json({ error: "Invalid revenue ID" });

  try {
    const [invoice] = await db
      .select()
      .from(savedInvoicesTable)
      .where(eq(savedInvoicesTable.revenueId, revenueId))
      .limit(1);

    if (!invoice) return res.status(404).json({ error: "No saved invoice for this revenue" });
    return res.json(invoice);
  } catch (err) {
    console.error("Get revenue invoice failed:", err);
    return res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

export default router;
