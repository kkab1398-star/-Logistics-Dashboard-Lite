import { pgTable, serial, integer, text, numeric, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { driversTable } from "./drivers";

export const savedInvoicesTable = pgTable("saved_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  driverId: integer("driver_id").references(() => driversTable.id, { onDelete: "set null" }),
  revenueId: integer("revenue_id"),
  clientName: text("client_name"),
  serviceType: text("service_type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  driverName: text("driver_name"),
  vehicleNumber: text("vehicle_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSavedInvoiceSchema = createInsertSchema(savedInvoicesTable).omit({ id: true, createdAt: true });
export type InsertSavedInvoice = z.infer<typeof insertSavedInvoiceSchema>;
export type SavedInvoice = typeof savedInvoicesTable.$inferSelect;
