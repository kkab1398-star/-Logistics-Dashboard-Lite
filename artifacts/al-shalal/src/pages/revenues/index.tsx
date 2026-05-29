import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useListRevenues, getListRevenuesQueryKey, useUpdateRevenue, useDeleteRevenue, useRepayRevenue, getGetCycleSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Printer, User, Receipt, FileText, CheckCircle, Pencil, X, Check, Trash2, Clock, BadgeCheck, ListFilter, CalendarDays, Coins } from "lucide-react";
import { format } from "date-fns";
import {
  BUSINESS_NAME_EN, BUSINESS_NAME_AR,
  BUSINESS_ADDRESS_EN, BUSINESS_ADDRESS_AR,
  BUSINESS_EMAIL, BUSINESS_PHONES,
  getBusinessConfig,
} from "@/lib/business-config";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type RevenueWithInvoice = {
  id: number;
  amount: string | number;
  clientName?: string | null;
  description?: string | null;
  date: string;
  createdAt: string;
  settlementId?: number | null;
  hasSavedInvoice?: boolean;
  savedInvoiceId?: number | null;
  isDeferred?: boolean;
  deferredAmount?: string | number;
  isPaid?: boolean;
};

function printRevenueInvoice(rev: RevenueWithInvoice, driverName?: string, vehicleNumber?: string) {
  const cfg = getBusinessConfig();
  const phones = BUSINESS_PHONES.slice(0, 3).join(" | ");
  const invNum = `REV-${rev.id.toString().padStart(5, "0")}`;
  const dateStr = format(new Date(rev.date), "dd/MM/yyyy");
  const amount = Number(rev.amount).toFixed(2);

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<title>${invNum}</title>
<style>
  @media print { @page { margin: 15mm; } }
  body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; color: #1a3358; direction: rtl; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #c9a227; padding-bottom: 16px; margin-bottom: 20px; }
  .logo-block h1 { font-size: 26px; font-weight: 900; color: #1a3358; margin: 0 0 4px; }
  .logo-block h2 { font-size: 13px; font-weight: 600; color: #c9a227; margin: 0; }
  .logo-block p { font-size: 11px; color: #666; margin: 2px 0 0; }
  .inv-block { text-align: left; direction: ltr; }
  .inv-block .inv-num { font-size: 18px; font-weight: 800; color: #1a3358; }
  .inv-block .inv-date { font-size: 12px; color: #666; margin-top: 4px; }
  .client-box { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
  .client-box .label { font-size: 11px; color: #888; margin-bottom: 4px; }
  .client-box .name { font-size: 18px; font-weight: 700; color: #1a3358; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #1a3358; color: #c9a227; font-size: 12px; padding: 10px 14px; text-align: right; }
  td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #eee; }
  .total-row td { font-weight: 800; font-size: 16px; border-top: 2px solid #c9a227; color: #1a3358; background: #fffbf0; }
  .vat-note { background: #fff8e1; border: 1px solid #c9a227; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #7a5f00; margin-bottom: 16px; }
  .footer { text-align: center; border-top: 1px solid #e0e0e0; padding-top: 14px; font-size: 11px; color: #888; }
  .footer strong { color: #1a3358; }
</style>
</head>
<body>
<div class="header">
  <div class="logo-block">
    <h1>${BUSINESS_NAME_AR}</h1>
    <h2>${BUSINESS_NAME_EN}</h2>
    <p>${BUSINESS_ADDRESS_AR} • ${BUSINESS_ADDRESS_EN}</p>
    ${driverName ? `<p style="margin-top:6px; font-weight:600; font-size:12px;">${driverName}${vehicleNumber ? ` — ${vehicleNumber}` : ""}</p>` : ""}
  </div>
  <div class="inv-block">
    <div class="inv-num">${invNum}</div>
    <div class="inv-date">${dateStr}</div>
  </div>
</div>

${rev.clientName ? `
<div class="client-box">
  <div class="label">العميل / Client</div>
  <div class="name">${rev.clientName}</div>
</div>` : ""}

<table>
  <thead><tr><th>الخدمة / Service</th><th style="text-align:center;">المبلغ / Amount (SAR)</th></tr></thead>
  <tbody>
    <tr>
      <td>${rev.description || "خدمة نقل / Transport Service"}</td>
      <td style="text-align:center; font-weight:700;">${amount}</td>
    </tr>
    <tr class="total-row">
      <td>الإجمالي / Total</td>
      <td style="text-align:center;">${amount} ريال</td>
    </tr>
  </tbody>
</table>

<div class="vat-note">ضريبة القيمة المضافة: 0% (معفى) — VAT: 0% (Exempt)</div>

<div class="footer">
  <strong>${BUSINESS_NAME_AR}</strong><br/>
  ${phones}${BUSINESS_EMAIL ? ` | ${BUSINESS_EMAIL}` : ""}${cfg.ownerWhatsApp ? ` | واتساب: ${cfg.ownerWhatsApp}` : ""}
</div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  }
}

async function viewSavedInvoice(revenueId: number) {
  try {
    const res = await fetch(`${BASE_URL}/api/revenues/${revenueId}/invoice`);
    if (!res.ok) return;
    const inv = await res.json();
    const dateStr = inv.date ? format(new Date(inv.date), "dd/MM/yyyy") : "";
    const cfg = getBusinessConfig();
    const phones = BUSINESS_PHONES.slice(0, 3).join(" | ");
    const amount = Number(inv.amount).toFixed(2);

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"/><title>${inv.invoiceNumber}</title>
<style>
  @media print { @page { margin: 15mm; } }
  body { font-family: Arial, sans-serif; padding: 24px; color: #1a3358; direction: rtl; }
  .header { display: flex; justify-content: space-between; border-bottom: 3px solid #c9a227; padding-bottom: 14px; margin-bottom: 18px; }
  .logo h1 { font-size: 22px; font-weight: 900; margin: 0 0 3px; }
  .logo h2 { font-size: 11px; color: #c9a227; margin: 0; }
  .badge { background: #1a3358; color: #c9a227; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: #1a3358; color: #c9a227; padding: 9px 12px; font-size: 12px; text-align: right; }
  td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  .total td { font-weight: 800; border-top: 2px solid #c9a227; background: #fffbf0; }
  .footer { text-align: center; border-top: 1px solid #eee; padding-top: 10px; font-size: 10px; color: #888; margin-top: 14px; }
  .footer strong { color: #1a3358; }
</style>
</head>
<body>
<div class="header">
  <div class="logo"><h1>مؤسسة الشلال</h1><h2>Al-Shalal Transport & Forklifts</h2></div>
  <div>
    <div class="badge">${inv.invoiceNumber}</div>
    <p style="font-size:11px; color:#888; margin:4px 0 0; direction:ltr;">${dateStr}</p>
    ${inv.driverName ? `<p style="font-size:11px; margin:4px 0 0;">${inv.driverName}${inv.vehicleNumber ? ` — ${inv.vehicleNumber}` : ""}</p>` : ""}
  </div>
</div>
${inv.clientName ? `<div style="background:#f8f9fa; border-radius:8px; padding:12px 16px; margin-bottom:16px;"><div style="font-size:11px; color:#888; margin-bottom:3px;">العميل / Client</div><div style="font-size:17px; font-weight:700;">${inv.clientName}</div></div>` : ""}
<table>
  <thead><tr><th>الخدمة / Service</th><th style="text-align:center;">المبلغ</th></tr></thead>
  <tbody>
    <tr><td>${inv.serviceType}${inv.notes ? `<br/><small style="color:#888;">${inv.notes}</small>` : ""}</td><td style="text-align:center; font-weight:700;">${amount}</td></tr>
    <tr class="total"><td>الإجمالي / Total</td><td style="text-align:center;">${amount} ريال</td></tr>
  </tbody>
</table>
<div class="footer"><strong>مؤسسة الشلال للنقل والرافعات الشوكية</strong><br/>${phones}${BUSINESS_EMAIL ? ` | ${BUSINESS_EMAIL}` : ""}${cfg.ownerWhatsApp ? ` | واتساب: ${cfg.ownerWhatsApp}` : ""}</div>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.onload = () => w.print(); }
  } catch {
    /* ignore */
  }
}

type EditForm = {
  amount: string;
  clientName: string;
  description: string;
  date: string;
};

export default function RevenueList() {
  const { t, lang } = useI18n();
  const { driverId, driverName, role } = useAuth();
  const [, setLocation] = useLocation();
  const isRtl = lang === "ar" || lang === "ur";
  const [allTime, setAllTime] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ amount: "", clientName: "", description: "", date: "" });
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const updateRevenue = useUpdateRevenue();
  const deleteRevenue = useDeleteRevenue();
  const repayRevenue = useRepayRevenue();
  const [repaySuccess, setRepaySuccess] = useState(false);
  const [repayError, setRepayError] = useState<string | null>(null);

  async function handleRepay(id: number) {
    setRepayError(null);
    try {
      await repayRevenue.mutateAsync({ id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListRevenuesQueryKey(params) }),
        queryClient.invalidateQueries({ queryKey: getListRevenuesQueryKey() }),
        driverId
          ? queryClient.invalidateQueries({ queryKey: getGetCycleSummaryQueryKey({ driverId }) })
          : Promise.resolve(),
      ]);
      setRepaySuccess(true);
      setTimeout(() => setRepaySuccess(false), 3000);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number }; status?: number })?.response?.status
        ?? (err as { status?: number })?.status;
      const settled = status === 409;
      const msg = settled
        ? (lang === "ar" ? "تمت تسوية هذا الإيراد بالفعل." : lang === "ur" ? "یہ آمدنی پہلے ہی طے ہو چکی ہے۔" : "This revenue is already settled.")
        : (lang === "ar" ? "فشل تأكيد الدفع