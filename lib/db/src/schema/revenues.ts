import { pgTable, serial, integer, text, numeric, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { driversTable } from "./drivers";

export const revenuesTable = pgTable("revenues", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driversTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  clientName: text("client_name"),
  description: text("description"),
  receiptImageUrl: text("receipt_image_url"),
  date: date("date").notNull(),
  settlementId: integer("settlement_id"),
  hasSavedInvoice: boolean("has_saved_invoice").default(false).notNull(),
  savedInvoiceId: integer("saved_invoice_id"),
  isDeferred: boolean("is_deferred").default(false).notNull(),
  deferredAmount: numeric("deferred_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  isPaid: boolean("is_paid").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertRevenueSchema = createInsertSchema(revenuesTable).omit({ id: true, createdAt: true });
export type InsertRevenue = z.infer<typeof insertRevenueSchema>;
export type Revenue = typeof revenuesTable.$inferSelect;
