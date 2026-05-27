import { pgTable, serial, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { driversTable } from "./drivers";

export const settlementsTable = pgTable("settlements", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driversTable.id, { onDelete: "cascade" }),
  totalRevenue: numeric("total_revenue", { precision: 12, scale: 2 }).notNull(),
  totalExpenses: numeric("total_expenses", { precision: 12, scale: 2 }).notNull(),
  totalTransfers: numeric("total_transfers", { precision: 12, scale: 2 }).notNull(),
  netProfit: numeric("net_profit", { precision: 12, scale: 2 }).notNull(),
  driverShare: numeric("driver_share", { precision: 12, scale: 2 }).notNull(),
  ownerPayout: numeric("owner_payout", { precision: 12, scale: 2 }).notNull(),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSettlementSchema = createInsertSchema(settlementsTable).omit({ id: true, createdAt: true });
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
export type Settlement = typeof settlementsTable.$inferSelect;
