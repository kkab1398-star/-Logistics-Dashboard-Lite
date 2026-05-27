import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "./logger";

/**
 * Idempotently creates the trigger functions and triggers that keep
 * `global_totals` in sync with `revenues`, `expenses`, and `settlements`.
 *
 * Also seeds the single `global_totals` row and reconciles its values
 * from the source tables on every boot, so the cached row is guaranteed
 * to be correct even if data was changed outside the API server.
 */
export async function initGlobalTotals(): Promise<void> {
  const start = Date.now();

  await db.execute(sql`
    INSERT INTO global_totals (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;
  `);

  await db.execute(sql`
    CREATE OR REPLACE FUNCTION trg_revenues_global_totals_fn() RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE global_totals
           SET total_revenues = total_revenues + NEW.amount,
               updated_at = NOW()
         WHERE id = 1;
      ELSIF TG_OP = 'UPDATE' THEN
        UPDATE global_totals
           SET total_revenues = total_revenues + (NEW.amount - OLD.amount),
               updated_at = NOW()
         WHERE id = 1;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE global_totals
           SET total_revenues = total_revenues - OLD.amount,
               updated_at = NOW()
         WHERE id = 1;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await db.execute(sql`
    CREATE OR REPLACE FUNCTION trg_expenses_global_totals_fn() RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE global_totals
           SET total_expenses = total_expenses + NEW.amount,
               updated_at = NOW()
         WHERE id = 1;
      ELSIF TG_OP = 'UPDATE' THEN
        UPDATE global_totals
           SET total_expenses = total_expenses + (NEW.amount - OLD.amount),
               updated_at = NOW()
         WHERE id = 1;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE global_totals
           SET total_expenses = total_expenses - OLD.amount,
               updated_at = NOW()
         WHERE id = 1;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await db.execute(sql`
    CREATE OR REPLACE FUNCTION trg_settlements_global_totals_fn() RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE global_totals
           SET total_owner_profit = total_owner_profit + NEW.owner_payout,
               total_driver_earnings = total_driver_earnings + NEW.driver_share,
               updated_at = NOW()
         WHERE id = 1;
      ELSIF TG_OP = 'UPDATE' THEN
        UPDATE global_totals
           SET total_owner_profit = total_owner_profit + (NEW.owner_payout - OLD.owner_payout),
               total_driver_earnings = total_driver_earnings + (NEW.driver_share - OLD.driver_share),
               updated_at = NOW()
         WHERE id = 1;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE global_totals
           SET total_owner_profit = total_owner_profit - OLD.owner_payout,
               total_driver_earnings = total_driver_earnings - OLD.driver_share,
               updated_at = NOW()
         WHERE id = 1;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await db.execute(sql`DROP TRIGGER IF EXISTS revenues_global_totals_trg ON revenues;`);
  await db.execute(sql`
    CREATE TRIGGER revenues_global_totals_trg
      AFTER INSERT OR UPDATE OR DELETE ON revenues
      FOR EACH ROW EXECUTE FUNCTION trg_revenues_global_totals_fn();
  `);

  await db.execute(sql`DROP TRIGGER IF EXISTS expenses_global_totals_trg ON expenses;`);
  await db.execute(sql`
    CREATE TRIGGER expenses_global_totals_trg
      AFTER INSERT OR UPDATE OR DELETE ON expenses
      FOR EACH ROW EXECUTE FUNCTION trg_expenses_global_totals_fn();
  `);

  await db.execute(sql`DROP TRIGGER IF EXISTS settlements_global_totals_trg ON settlements;`);
  await db.execute(sql`
    CREATE TRIGGER settlements_global_totals_trg
      AFTER INSERT OR UPDATE OR DELETE ON settlements
      FOR EACH ROW EXECUTE FUNCTION trg_settlements_global_totals_fn();
  `);

  await db.execute(sql`
    UPDATE global_totals SET
      total_revenues        = COALESCE((SELECT SUM(amount::numeric)        FROM revenues),    0),
      total_expenses        = COALESCE((SELECT SUM(amount::numeric)        FROM expenses),    0),
      total_owner_profit    = COALESCE((SELECT SUM(owner_payout::numeric)  FROM settlements), 0),
      total_driver_earnings = COALESCE((SELECT SUM(driver_share::numeric)  FROM settlements), 0),
      updated_at = NOW()
    WHERE id = 1;
  `);

  logger.info({ durationMs: Date.now() - start }, "Global totals initialized and reconciled");
}
