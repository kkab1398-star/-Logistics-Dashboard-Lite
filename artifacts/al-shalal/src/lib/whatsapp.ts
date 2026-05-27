import { BUSINESS_ADDRESS_EN, BUSINESS_NAME_EN, getBusinessConfig } from "./business-config";

export function openWhatsApp(phone: string, message: string) {
  const clean = phone.replace(/\D/g, "");
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

export function buildExpenseMessage(params: {
  driverName: string;
  vehicleNumber?: string;
  type: string;
  amount: number | string;
  liters?: number | string | null;
  date: string;
  notes?: string | null;
}): string {
  const lines = [
    `🚛 *${BUSINESS_NAME_EN} — Expense Logged*`,
    `━━━━━━━━━━━━━━━━`,
    `👤 Driver: ${params.driverName}`,
    params.vehicleNumber ? `🚗 Vehicle: ${params.vehicleNumber}` : "",
    `📋 Type: ${params.type}`,
    `💰 Amount: ${Number(params.amount).toFixed(2)} SAR`,
    params.liters ? `⛽ Liters: ${Number(params.liters).toFixed(2)} L` : "",
    `📅 Date: ${params.date}`,
    params.notes ? `📝 Notes: ${params.notes}` : "",
    `━━━━━━━━━━━━━━━━`,
    `📍 ${BUSINESS_ADDRESS_EN}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildRevenueMessage(params: {
  driverName: string;
  vehicleNumber?: string;
  amount: number | string;
  description?: string | null;
  date: string;
}): string {
  const lines = [
    `✅ *${BUSINESS_NAME_EN} — Revenue Logged*`,
    `━━━━━━━━━━━━━━━━`,
    `👤 Driver: ${params.driverName}`,
    params.vehicleNumber ? `🚗 Vehicle: ${params.vehicleNumber}` : "",
    `💰 Amount: ${Number(params.amount).toFixed(2)} SAR`,
    `📅 Date: ${params.date}`,
    params.description ? `📝 Description: ${params.description}` : "",
    `━━━━━━━━━━━━━━━━`,
    `📍 ${BUSINESS_ADDRESS_EN}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildInvoiceMessage(params: {
  invoiceNumber: string;
  clientName?: string;
  serviceType: string;
  amount: number | string;
  date: string;
  phone: string;
  email: string;
  driverName?: string;
  vehicleNumber?: string;
  notes?: string | null;
}): string {
  const lines = [
    `🧾 *${BUSINESS_NAME_EN} — Client Invoice*`,
    `━━━━━━━━━━━━━━━━`,
    `🏢 ${BUSINESS_NAME_EN}`,
    `📍 ${BUSINESS_ADDRESS_EN}`,
    `📞 ${params.phone}`,
    `📧 ${params.email}`,
    `━━━━━━━━━━━━━━━━`,
    `📄 Invoice #: ${params.invoiceNumber}`,
    `📅 Date: ${params.date}`,
    params.clientName ? `👤 Client: ${params.clientName}` : "",
    params.driverName ? `🚛 Driver: ${params.driverName}` : "",
    params.vehicleNumber ? `🚗 Vehicle: ${params.vehicleNumber}` : "",
    `🔧 Service: ${params.serviceType}`,
    params.notes ? `📝 Notes: ${params.notes}` : "",
    `━━━━━━━━━━━━━━━━`,
    `💰 Amount: ${Number(params.amount).toFixed(2)} SAR`,
    `🚫 VAT: 0%`,
    `✅ Total: ${Number(params.amount).toFixed(2)} SAR`,
    `━━━━━━━━━━━━━━━━`,
    `Thank you for your business!`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function notifyOwner(message: string) {
  const config = getBusinessConfig();
  if (!config.ownerWhatsApp) return false;
  openWhatsApp(config.ownerWhatsApp, message);
  return true;
}
