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

  const params = driverId ? { driverId, activeOnly: !allTime } : { activeOnly: !allTime };

  const { data: revenues, isLoading } = useListRevenues(params, {
    query: { queryKey: getListRevenuesQueryKey(params) },
  });

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
      const status =
        (err as { response?: { status?: number }; status?: number })?.response?.status ??
        (err as { status?: number })?.status;
      const settled = status === 409;
      const msg = settled
        ? lang === "ar"
          ? "تمت تسوية هذا الإيراد بالفعل."
          : lang === "ur"
          ? "یہ آمدنی پہلے ہی طے ہو چکی ہے۔"
          : "This revenue is already settled."
        : lang === "ar"
        ? "فشل تأكيد الدفع. حاول مجدداً."
        : lang === "ur"
        ? "ادائیگی کی تصدیق ناکام ہوئی۔ دوبارہ کوشش کریں۔"
        : "Failed to confirm payment. Please try again.";
      setRepayError(msg);
      setTimeout(() => setRepayError(null), 4000);
    }
  }

  async function handleEdit(rev: RevenueWithInvoice) {
    setEditingId(rev.id);
    setEditForm({
      amount: String(rev.amount),
      clientName: rev.clientName || "",
      description: rev.description || "",
      date: rev.date?.slice(0, 10) || "",
    });
    setEditError(null);
    setEditSuccess(false);
  }

  async function handleEditSave(id: number) {
    setEditError(null);
    try {
      await updateRevenue.mutateAsync({
        id,
        data: {
          amount: editForm.amount,
          clientName: editForm.clientName || null,
          description: editForm.description || null,
          date: editForm.date,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListRevenuesQueryKey(params) });
      setEditSuccess(true);
      setEditingId(null);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch {
      setEditError(
        lang === "ar"
          ? "فشل تعديل الإيراد."
          : lang === "ur"
          ? "آمدنی میں ترمیم ناکام رہی۔"
          : "Failed to update revenue."
      );
    }
  }

  async function handleDelete(id: number) {
    setDeleteError(null);
    try {
      await deleteRevenue.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getListRevenuesQueryKey(params) });
      setConfirmDeleteId(null);
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
    } catch {
      setDeleteError(
        lang === "ar"
          ? "فشل حذف الإيراد."
          : lang === "ur"
          ? "آمدنی حذف کرنا ناکام رہا۔"
          : "Failed to delete revenue."
      );
    }
  }

  const fmt = (n: number | string | null | undefined) => Number(n || 0).toFixed(2);

  const sorted = [...(revenues || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ) as RevenueWithInvoice[];

  return (
    <div
      className={`space-y-8 animate-in fade-in duration-500 pb-10 ${isRtl ? "font-arabic" : ""}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-emerald-600 p-2 rounded-xl">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t("revenues")}</h1>
          </div>
          <p className="text-slate-500 text-xs font-medium">
            {lang === "ar"
              ? "سجل الإيرادات والرحلات المنجزة"
              : lang === "ur"
              ? "آمدنی اور مکمل سفر کا ریکارڈ"
              : "Revenue and completed trips record"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className={`rounded-xl border-slate-200 font-bold text-xs gap-2 ${allTime ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600"}`}
            onClick={() => setAllTime((v) => !v)}
          >
            <ListFilter className="h-3.5 w-3.5" />
            {allTime
              ? lang === "ar" ? "الكل" : lang === "ur" ? "سب" : "All"
              : lang === "ar" ? "النشطة فقط" : lang === "ur" ? "صرف فعال" : "Active only"}
          </Button>
          <Link href="/revenues/new">
            <Button
              size="lg"
              className="h-11 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xl shadow-emerald-600/20 gap-2 transition-all active:scale-95"
            >
              <TrendingUp className="h-4 w-4" />
              {t("addRevenue")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Feedback banners */}
      {editSuccess && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm font-bold">
          <CheckCircle className="h-4 w-4" />
          {lang === "ar" ? "تم تعديل الإيراد بنجاح" : lang === "ur" ? "آمدنی کامیابی سے تبدیل ہوئی" : "Revenue updated successfully"}
        </div>
      )}
      {deleteSuccess && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-bold">
          <Trash2 className="h-4 w-4" />
          {lang === "ar" ? "تم حذف الإيراد" : lang === "ur" ? "آمدنی حذف ہوگئی" : "Revenue deleted"}
        </div>
      )}
      {repaySuccess && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 text-sm font-bold">
          <BadgeCheck className="h-4 w-4" />
          {lang === "ar" ? "تم تأكيد الدفع بنجاح" : lang === "ur" ? "ادائیگی کامیابی سے تصدیق ہوئی" : "Payment confirmed successfully"}
        </div>
      )}
      {repayError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-bold">
          <X className="h-4 w-4" />
          {repayError}
        </div>
      )}
      {deleteError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-bold">
          <X className="h-4 w-4" />
          {deleteError}
        </div>
      )}

      {/* Revenue List */}
      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-0 divide-y divide-slate-100">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : sorted.length === 0 ? (
            <div className="py-20 text-center">
              <Receipt className="h-16 w-16 mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-black text-lg">
                {lang === "ar" ? "لا توجد إيرادات مسجلة" : lang === "ur" ? "کوئی آمدنی درج نہیں" : "No revenues recorded"}
              </p>
              <p className="text-slate-300 text-sm font-medium mt-1">
                {lang === "ar" ? "ابدأ بتسجيل إيراد جديد" : lang === "ur" ? "نئی آمدنی درج کریں" : "Start by adding a new revenue"}
              </p>
            </div>
          ) : (
            sorted.map((rev) => {
              const isEditing = editingId === rev.id;
              const isSettled = !!rev.settlementId;
              const isDeferred = rev.isDeferred;
              const isPaid = rev.isPaid;

              return (
                <div key={rev.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                  {isEditing ? (
                    /* Edit Mode */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {t("amount")}
                          </Label>
                          <Input
                            type="number"
                            value={editForm.amount}
                            onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                            className="h-10 rounded-xl border-slate-200 font-bold text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {t("date")}
                          </Label>
                          <Input
                            type="date"
                            value={editForm.date}
                            onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                            className="h-10 rounded-xl border-slate-200 font-bold text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {t("clientName")}
                        </Label>
                        <Input
                          value={editForm.clientName}
                          onChange={(e) => setEditForm((f) => ({ ...f, clientName: e.target.value }))}
                          className="h-10 rounded-xl border-slate-200 font-bold text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {t("description")}
                        </Label>
                        <Input
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          className="h-10 rounded-xl border-slate-200 font-bold text-sm"
                        />
                      </div>
                      {editError && (
                        <p className="text-red-500 text-xs font-bold">{editError}</p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black gap-1"
                          onClick={() => handleEditSave(rev.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {lang === "ar" ? "حفظ" : lang === "ur" ? "محفوظ" : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-xl border-slate-200 font-bold gap-1"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                          {t("cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2.5 rounded-xl mt-0.5 ${isDeferred && !isPaid ? "bg-amber-50" : "bg-emerald-50"}`}>
                          {isDeferred && !isPaid ? (
                            <Clock className="h-5 w-5 text-amber-600" />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-black text-slate-900 text-sm truncate">
                              {rev.clientName || t("revenues")}
                            </p>
                            {isSettled && (
                              <Badge className="bg-slate-100 text-slate-500 border-none rounded-md text-[9px] font-black uppercase tracking-widest">
                                {lang === "ar" ? "مسوَّى" : lang === "ur" ? "طے شدہ" : "Settled"}
                              </Badge>
                            )}
                            {isDeferred && !isPaid && (
                              <Badge className="bg-amber-100 text-amber-700 border-none rounded-md text-[9px] font-black uppercase tracking-widest">
                                {lang === "ar" ? "مؤجل" : lang === "ur" ? "موخر" : "Deferred"}
                              </Badge>
                            )}
                            {isDeferred && isPaid && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-none rounded-md text-[9px] font-black uppercase tracking-widest">
                                <BadgeCheck className="h-3 w-3 inline mr-0.5" />
                                {lang === "ar" ? "مدفوع" : lang === "ur" ? "ادا شدہ" : "Paid"}
                              </Badge>
                            )}
                            {rev.hasSavedInvoice && (
                              <Badge className="bg-blue-50 text-blue-600 border-none rounded-md text-[9px] font-black uppercase tracking-widest">
                                <FileText className="h-3 w-3 inline mr-0.5" />
                                {lang === "ar" ? "فاتورة" : lang === "ur" ? "رسید" : "Invoice"}
                              </Badge>
                            )}
                          </div>
                          {rev.description && (
                            <p className="text-xs text-slate-400 font-medium truncate">{rev.description}</p>
                          )}
                          <p className="text-[10px] text-slate-300 font-bold mt-1 flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {format(new Date(rev.date), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <p className="font-black text-emerald-600 text-base">
                          +{fmt(rev.amount)}
                          <span className="text-[10px] font-bold text-slate-400 mr-1">ريال</span>
                        </p>

                        {/* Action buttons */}
                        {!isSettled && (
                          <div className="flex items-center gap-1.5">
                            {isDeferred && !isPaid && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                    onClick={() => handleRepay(rev.id)}
                                  >
                                    <Coins className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {lang === "ar" ? "تأكيد الدفع" : lang === "ur" ? "ادائیگی تصدیق" : "Confirm Payment"}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100"
                                  onClick={() => handleEdit(rev)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("edit")}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                                  onClick={() => setConfirmDeleteId(rev.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("delete")}</TooltipContent>
                            </Tooltip>
                          </div>
                        )}

                        {/* Print / Invoice buttons */}
                        <div className="flex items-center gap-1.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100"
                                onClick={() => printRevenueInvoice(rev, driverName || undefined)}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {lang === "ar" ? "طباعة فاتورة" : lang === "ur" ? "رسید پرنٹ" : "Print Invoice"}
                            </TooltipContent>
                          </Tooltip>
                          {rev.hasSavedInvoice && rev.id && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100"
                                  onClick={() => viewSavedInvoice(rev.id)}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {lang === "ar" ? "عرض الفاتورة المحفوظة" : lang === "ur" ? "محفوظ رسید دیکھیں" : "View saved invoice"}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delete confirm inline */}
                  {confirmDeleteId === rev.id && (
                    <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                      <p className="text-sm font-black text-red-700">
                        {lang === "ar"
                          ? "هل أنت متأكد من حذف هذا الإيراد؟"
                          : lang === "ur"
                          ? "کیا آپ واقعی اس آمدنی کو حذف کرنا چاہتے ہیں؟"
                          : "Are you sure you want to delete this revenue?"}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black"
                          onClick={() => handleDelete(rev.id)}
                        >
                          {lang === "ar" ? "حذف" : lang === "ur" ? "حذف کریں" : "Delete"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-xl border-slate-200 font-bold"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          {t("cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}