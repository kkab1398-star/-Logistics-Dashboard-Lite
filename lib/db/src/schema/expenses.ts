import { pgTable, serial, integer, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { driversTable } from "./drivers";

export const expenseTypeEnum = ["diesel", "oil", "maintenance", "other"] as const;
export type ExpenseType = typeof expenseTypeEnum[number];

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driversTable.id, { onDelete: "cascade" }),
  type: text("type", { enum: expenseTypeEnum }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  liters: numeric("liters", { precision: 10, scale: 2 }),
  notes: text("notes"),
  invoiceImageUrl: text("invoice_image_url"),
  date: date("date").notNull(),
  settlementId: integer("settlement_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
