import { pgTable, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const globalTotalsTable = pgTable("global_totals", {
  id: integer("id").primaryKey(),
  totalRevenues: numeric("total_revenues", { precision: 18, scale: 2 }).notNull().default("0"),
  totalExpenses: numeric("total_expenses", { precision: 18, scale: 2 }).notNull().default("0"),
  totalOwnerProfit: numeric("total_owner_profit", { precision: 18, scale: 2 }).notNull().default("0"),
  totalDriverEarnings: numeric("total_driver_earnings", { precision: 18, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type GlobalTotals = typeof globalTotalsTable.$inferSelect;
