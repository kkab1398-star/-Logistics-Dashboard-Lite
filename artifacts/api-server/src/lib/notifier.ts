import { logger } from "./logger";
import { db, driversTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type Logger = typeof logger;

const TELEGRAM_API_TIMEOUT_MS = 5000;

function getTelegramConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID?.trim();
  if (!token || !chatId) return null;
  return { token, chatId };
}

export function isOwnerNotifierEnabled(): boolean {
  return getTelegramConfig() !== null;
}

async function sendTelegramMessage(text: string, log: Logger): Promise<void> {
  const config = getTelegramConfig();
  if (!config) {
    log.debug("Telegram notifier disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_OWNER_CHAT_ID not set");
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_API_TIMEOUT_MS);

  try {
    const url = `https://api.telegram.org/bot${config.token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log.warn({ status: res.status, body }, "Telegram sendMessage failed");
    }
  } catch (err) {
    log.warn({ err }, "Telegram sendMessage threw");
  } finally {
    clearTimeout(timeout);
  }
}

async function getDriverInfo(driverId: number): Promise<{ name: string; vehicleNumber: string } | null> {
  try {
    const [row] = await db
      .select({ name: driversTable.name, vehicleNumber: driversTable.vehicleNumber })
      .from(driversTable)
      .where(eq(driversTable.id, driverId));
    return row ?? null;
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function fmtAmount(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return Number.isFinite(n) ? n.toFixed(2) : String(amount);
}

const EXPENSE_TYPE_AR: Record<string, string> = {
  diesel: "ديزل / Diesel",
  oil: "زيت / Oil",
  maintenance: "صيانة / Maintenance",
  other: "أخرى / Other",
};

export function notifyRevenue(
  log: Logger,
  data: { driverId: number; amount: number | string; clientName?: string | null; description?: string | null; date: string },
): void {
  void (async () => {
    if (!isOwnerNotifierEnabled()) return;
    const driver = await getDriverInfo(data.driverId);
    const driverLine = driver
      ? `${escapeHtml(driver.name)} (${escapeHtml(driver.vehicleNumber)})`
      : `#${data.driverId}`;
    const lines = [
      "💰 <b>إيراد جديد / New revenue</b>",
      `السائق / Driver: ${driverLine}`,
      `المبلغ / Amount: <b>${fmtAmount(data.amount)} ر.س</b>`,
    ];
    if (data.clientName) lines.push(`العميل / Client: ${escapeHtml(data.clientName)}`);
    if (data.description) lines.push(`الوصف / Notes: ${escapeHtml(data.description)}`);
    lines.push(`التاريخ / Date: ${escapeHtml(data.date)}`);
    await sendTelegramMessage(lines.join("\n"), log);
  })();
}

export function notifyExpense(
  log: Logger,
  data: { driverId: number; type: string; amount: number | string; liters?: number | string | null; notes?: string | null; date: string },
): void {
  void (async () => {
    if (!isOwnerNotifierEnabled()) return;
    const driver = await getDriverInfo(data.driverId);
    const driverLine = driver
      ? `${escapeHtml(driver.name)} (${escapeHtml(driver.vehicleNumber)})`
      : `#${data.driverId}`;
    const typeLabel = EXPENSE_TYPE_AR[data.type] ?? escapeHtml(data.type);
    const lines = [
      "⛽ <b>مصروف جديد / New expense</b>",
      `السائق / Driver: ${driverLine}`,
      `النوع / Type: ${typeLabel}`,
      `المبلغ / Amount: <b>${fmtAmount(data.amount)} ر.س</b>`,
    ];
    if (data.liters != null && data.liters !== "") {
      lines.push(`اللترات / Liters: ${fmtAmount(data.liters)}`);
    }
    if (data.notes) lines.push(`ملاحظات / Notes: ${escapeHtml(data.notes)}`);
    lines.push(`التاريخ / Date: ${escapeHtml(data.date)}`);
    await sendTelegramMessage(lines.join("\n"), log);
  })();
}

export function notifyTransfer(
  log: Logger,
  data: { driverId: number; amount: number | string; description?: string | null; date: string },
): void {
  void (async () => {
    if (!isOwnerNotifierEnabled()) return;
    const driver = await getDriverInfo(data.driverId);
    const driverLine = driver
      ? `${escapeHtml(driver.name)} (${escapeHtml(driver.vehicleNumber)})`
      : `#${data.driverId}`;
    const lines = [
      "💸 <b>تحويل من المالك / Owner transfer</b>",
      `السائق / Driver: ${driverLine}`,
      `المبلغ / Amount: <b>${fmtAmount(data.amount)} ر.س</b>`,
    ];
    if (data.description) lines.push(`الوصف / Notes: ${escapeHtml(data.description)}`);
    lines.push(`التاريخ / Date: ${escapeHtml(data.date)}`);
    await sendTelegramMessage(lines.join("\n"), log);
  })();
}
