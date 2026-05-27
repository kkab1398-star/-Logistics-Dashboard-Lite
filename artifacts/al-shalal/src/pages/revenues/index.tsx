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
import { TrendingUp, Printer, User, Receipt, FileText, CheckCircle, Pencil, X, Check, Trash2, Clock, BadgeCheck } from "lucide-react";
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
        : (lang === "ar" ? "فشل تأكيد الدفع. حاول مرة أخرى." : lang === "ur" ? "ادائیگی کی تصدیق ناکام۔ دوبارہ کوشش کریں۔" : "Failed to mark as paid. Please try again.");
      setRepayError(msg);
      setTimeout(() => setRepayError(null), 4000);
    }
  }

  useEffect(() => {
    if (role !== "driver" || !driverId) {
      setLocation("/");
    }
  }, [role, driverId, setLocation]);

  const params = { driverId: driverId ?? 0, activeOnly: !allTime };

  const { data: revenues, isLoading } = useListRevenues(
    params,
    { query: { queryKey: getListRevenuesQueryKey(params), enabled: !!driverId && role === "driver" } }
  );

  function startEdit(rev: RevenueWithInvoice) {
    setEditingId(rev.id);
    setEditForm({
      amount: String(Number(rev.amount)),
      clientName: rev.clientName ?? "",
      description: rev.description ?? "",
      date: rev.date,
    });
    setEditSuccess(false);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleDelete(id: number) {
    setDeleteError(null);
    try {
      await deleteRevenue.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getListRevenuesQueryKey(params) });
      setConfirmDeleteId(null);
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
    } catch (err: unknown) {
      setConfirmDeleteId(null);
      const status = (err as { response?: { status?: number }; status?: number })?.response?.status
        ?? (err as { status?: number })?.status;
      const settled = status === 409;
      const msg = settled
        ? (lang === "ar" ? "لا يمكن حذف إيراد تمت تسويته." : lang === "ur" ? "تصفیہ شدہ آمدنی حذف نہیں ہو سکتی۔" : "Cannot delete a settled revenue.")
        : (lang === "ar" ? "فشل الحذف. حاول مرة أخرى." : lang === "ur" ? "حذف ناکام۔ دوبارہ کوشش کریں۔" : "Delete failed. Please try again.");
      setDeleteError(msg);
      setTimeout(() => setDeleteError(null), 4000);
    }
  }

  async function saveEdit(id: number) {
    const amount = parseFloat(editForm.amount);
    if (isNaN(amount) || amount <= 0) return;
    setEditError(null);
    try {
      await updateRevenue.mutateAsync({
        id,
        data: {
          amount,
          clientName: editForm.clientName.trim() || null,
          description: editForm.description.trim() || null,
          date: editForm.date,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListRevenuesQueryKey(params) });
      setEditingId(null);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch {
      setEditError(lang === "ar" ? "فشل التحديث. حاول مرة أخرى." : lang === "ur" ? "اپ ڈیٹ ناکام۔ دوبارہ کوشش کریں۔" : "Update failed. Please try again.");
    }
  }

  const fmt = (n: string | number) => Number(n).toLocaleString("en-SA", { minimumFractionDigits: 2 });
  const sorted: RevenueWithInvoice[] = revenues
    ? [...(revenues as RevenueWithInvoice[])].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    : [];

  const total = sorted.reduce((sum, r) => sum + Number(r.amount), 0);
  const currentCycleTotal = sorted.filter(r => !r.settlementId).reduce((sum, r) => sum + Number(r.amount), 0);
  const settledTotal = sorted.filter(r => !!r.settlementId).reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="space-y-6 pb-8">
      {editSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4" />
          {t("revenueUpdated")}
        </div>
      )}
      {deleteSuccess && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 flex items-center gap-2">
          <Trash2 className="h-4 w-4" />
          {t("revenueDeleted")}
        </div>
      )}
      {repaySuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700 flex items-center gap-2">
          <BadgeCheck className="h-4 w-4" />
          {t("markedAsPaid")}
        </div>
      )}
      {repayError && (
        <div className="rounded-lg bg-amber-50 border border-amber-300 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
          <X className="h-4 w-4" />
          {repayError}
        </div>
      )}
      {deleteError && (
        <div className="rounded-lg bg-amber-50 border border-amber-300 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
          <X className="h-4 w-4" />
          {deleteError}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-green-500/10 p-2.5 rounded-full">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("revenueList")}</h1>
          </div>
        </div>
        {sorted.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t("totalRevenue")}</p>
            <p className="text-xl font-bold text-green-700">{fmt(total)} <span className="text-sm font-normal">{t("sar")}</span></p>
          </div>
        )}
      </div>

      <div className="flex gap-1 bg-muted rounded-lg p-1">
        <button
          onClick={() => setAllTime(false)}
          className={`flex-1 text-sm font-medium py-1.5 px-3 rounded-md transition-colors ${!allTime ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {t("currentCycle")}
        </button>
        <button
          onClick={() => setAllTime(true)}
          className={`flex-1 text-sm font-medium py-1.5 px-3 rounded-md transition-colors ${allTime ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {t("allTime")}
        </button>
      </div>

      {allTime && !isLoading && sorted.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-3 space-y-1">
            <p className="text-[11px] text-muted-foreground">{t("currentCycle")}</p>
            {currentCycleTotal === 0 ? (
              <p className="text-[11px] text-muted-foreground italic leading-snug">{t("noCurrentCycleRevenue")}</p>
            ) : (
              <>
                <p className="text-base font-bold text-green-700 leading-none">{fmt(currentCycleTotal)}</p>
                <p className="text-[10px] text-muted-foreground">{t("sar")}</p>
              </>
            )}
          </div>
          <div className="rounded-xl border bg-card p-3 space-y-1">
            <p className="text-[11px] text-muted-foreground">{t("pastSettlements")}</p>
            <p className="text-base font-bold text-blue-700 leading-none">{fmt(settledTotal)}</p>
            <p className="text-[10px] text-muted-foreground">{t("sar")}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed rounded-xl">
          <Receipt className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">{t("noRevenues")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(rev => (
            <Card key={rev.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  <div className="w-1.5 bg-green-500 shrink-0" />
                  <div className="flex-1 p-4 space-y-3">
                    {editingId === rev.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{t("amount")}</Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={editForm.amount}
                              onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                              className="h-8 text-sm"
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{t("date")}</Label>
                            <Input
                              type="date"
                              value={editForm.date}
                              onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                              className="h-8 text-sm"
                              dir="ltr"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t("clientName")}</Label>
                          <Input
                            value={editForm.clientName}
                            onChange={e => setEditForm(f => ({ ...f, clientName: e.target.value }))}
                            className="h-8 text-sm"
                            placeholder={t("customerNameHint")}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t("description")}</Label>
                          <Input
                            value={editForm.description}
                            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        {editError && (
                          <p className="text-xs text-red-600">{editError}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 gap-1.5 text-xs"
                            onClick={() => saveEdit(rev.id)}
                            disabled={updateRevenue.isPending}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {t("save")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            onClick={cancelEdit}
                            disabled={updateRevenue.isPending}
                          >
                            <X className="h-3.5 w-3.5" />
                            {t("cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {rev.clientName && (
                              <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {rev.clientName}
                              </div>
                            )}
                            {rev.description && (
                              <span className="text-sm text-muted-foreground truncate max-w-[180px]">{rev.description}</span>
                            )}
                            {rev.settlementId && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-50 text-blue-600 border border-blue-200">
                                {t("settled")}
                              </Badge>
                            )}
                            {rev.isDeferred && !rev.settlementId && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-50 text-amber-700 border border-amber-300 gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {t("deferred")}
                              </Badge>
                            )}
                            {rev.isPaid && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-green-50 text-green-700 border border-green-200 gap-1">
                                <BadgeCheck className="h-2.5 w-2.5" />
                                {t("paid")}
                              </Badge>
                            )}
                            {rev.hasSavedInvoice && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => viewSavedInvoice(rev.id)}
                                    className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 hover:bg-emerald-100 transition-colors"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    {t("invoiceLinked")}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">{t("viewSavedInvoice")}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                            {format(new Date(rev.date), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <div className={`flex items-center gap-2 shrink-0 flex-wrap justify-end ${isRtl ? "flex-row-reverse" : ""}`}>
                          <div className="text-right">
                            <p className={`font-bold text-lg leading-none ${rev.isDeferred && !rev.settlementId ? "text-red-700" : "text-green-700"}`}>
                              {rev.isDeferred && !rev.settlementId ? "−" : ""}{fmt(rev.amount)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{t("sar")}</p>
                          </div>
                          {rev.isDeferred && !rev.settlementId && (
                            <Button
                              size="sm"
                              className="gap-1.5 text-xs shrink-0 bg-green-600 hover:bg-green-700"
                              onClick={() => handleRepay(rev.id)}
                              disabled={repayRevenue.isPending}
                            >
                              <BadgeCheck className="h-3.5 w-3.5" />
                              {t("markAsPaid")}
                            </Button>
                          )}
                          {!rev.settlementId && (
                            confirmDeleteId === rev.id ? (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="gap-1 text-xs shrink-0"
                                  onClick={() => handleDelete(rev.id)}
                                  disabled={deleteRevenue.isPending}
                                >
                                  <Check className="h-3 w-3" />
                                  {t("confirm")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-xs shrink-0"
                                  onClick={() => setConfirmDeleteId(null)}
                                  disabled={deleteRevenue.isPending}
                                >
                                  <X className="h-3 w-3" />
                                  {t("cancel")}
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-xs shrink-0"
                                  onClick={() => startEdit(rev)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  {t("editRevenue")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-xs shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                                  onClick={() => setConfirmDeleteId(rev.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {t("deleteRevenue")}
                                </Button>
                              </>
                            )
                          )}
                          {!rev.hasSavedInvoice && (
                            <Link href={`/invoice?revenueId=${rev.id}&clientName=${encodeURIComponent(rev.clientName || "")}&amount=${rev.amount}&date=${rev.date}&description=${encodeURIComponent(rev.description || "")}&driverId=${driverId ?? ""}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs shrink-0 border-primary/30 text-primary hover:bg-primary/5"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                {t("createInvoiceFor")}
                              </Button>
                            </Link>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs shrink-0"
                            onClick={() => printRevenueInvoice(rev, driverName || undefined, undefined)}
                          >
                            <Printer className="h-3.5 w-3.5" />
                            {t("printInvoice")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
