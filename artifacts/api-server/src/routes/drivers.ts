import { Router } from "express";
import { db, driversTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateDriverBody, GetDriverParams, UpdateDriverBody, DriverLoginBody } from "@workspace/api-zod";
import bcrypt from "bcryptjs";

const router = Router();

// ─── List drivers (public, passwords excluded) ────────────────────────────────
router.get("/drivers", async (req, res) => {
  const drivers = await db.select({
    id: driversTable.id,
    name: driversTable.name,
    phone: driversTable.phone,
    vehicleNumber: driversTable.vehicleNumber,
    username: driversTable.username,
    status: driversTable.status,
    createdAt: driversTable.createdAt,
  }).from(driversTable).orderBy(driversTable.createdAt);
  res.json(drivers);
});

// ─── Create driver (admin only) ───────────────────────────────────────────────
router.post("/drivers", async (req, res) => {
  const parsed = CreateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { password, ...rest } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);
  const [driver] = await db.insert(driversTable).values({ ...rest, passwordHash }).returning({
    id: driversTable.id,
    name: driversTable.name,
    phone: driversTable.phone,
    vehicleNumber: driversTable.vehicleNumber,
    username: driversTable.username,
    status: driversTable.status,
    createdAt: driversTable.createdAt,
  });
  res.status(201).json(driver);
});

// ─── Get single driver ────────────────────────────────────────────────────────
router.get("/drivers/:id", async (req, res) => {
  const parsed = GetDriverParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid driver ID" });
    return;
  }
  const [driver] = await db.select({
    id: driversTable.id,
    name: driversTable.name,
    phone: driversTable.phone,
    vehicleNumber: driversTable.vehicleNumber,
    username: driversTable.username,
    status: driversTable.status,
    createdAt: driversTable.createdAt,
  }).from(driversTable).where(eq(driversTable.id, parsed.data.id));
  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  res.json(driver);
});

// ─── Update driver (admin only) ───────────────────────────────────────────────
router.patch("/drivers/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid driver ID" }); return; }
  const parsed = UpdateDriverBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const { password, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest };
  if (password) {
    updates.passwordHash = await bcrypt.hash(password, 10);
  }
  const [driver] = await db.update(driversTable).set(updates).where(eq(driversTable.id, id)).returning({
    id: driversTable.id,
    name: driversTable.name,
    phone: driversTable.phone,
    vehicleNumber: driversTable.vehicleNumber,
    username: driversTable.username,
    status: driversTable.status,
    createdAt: driversTable.createdAt,
  });
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }
  res.json(driver);
});

// ─── Delete driver (admin only) ───────────────────────────────────────────────
router.delete("/drivers/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid driver ID" }); return; }
  await db.delete(driversTable).where(eq(driversTable.id, id));
  res.status(204).send();
});

// ─── Driver login ─────────────────────────────────────────────────────────────
router.post("/auth/driver-login", async (req, res) => {
  const parsed = DriverLoginBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.username, parsed.data.username));
  if (!driver) { res.status(401).json({ error: "invalid_credentials" }); return; }
  if (driver.status === "frozen") { res.status(403).json({ error: "account_frozen" }); return; }
  const valid = await bcrypt.compare(parsed.data.password, driver.passwordHash);
  if (!valid) { res.status(401).json({ error: "invalid_credentials" }); return; }
  res.json({
    id: driver.id,
    name: driver.name,
    vehicleNumber: driver.vehicleNumber,
    username: driver.username,
    status: driver.status,
  });
});

export default router;
