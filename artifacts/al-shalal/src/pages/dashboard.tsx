import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  useGetExpenseSummary, useListExpenses, useGetCycleSummary,
  useListRevenues, useListTransfers,
  getGetExpenseSummaryQueryKey, getListExpensesQueryKey, getGetCycleSummaryQueryKey,
  getListRevenuesQueryKey, getListTransfersQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle, Receipt, TrendingDown, TrendingUp, AlertCircle, Scale,
  ArrowUpFromLine, ShieldCheck, Fuel, User, Activity, FileText, CheckCircle, Clock, ChevronLeft, Wallet
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { t, lang } = useI18n();
  const { role, driverId, driverName } = useAuth();
  const isRtl = lang === "ar" || lang === "ur";

  const summaryParams = role === "driver" && driverId
    ? { driverId, activeOnly: true }
    : {};

  const { data: summary, isLoading: isLoadingSummary } = useGetExpenseSummary(
    summaryParams,
    { query: { queryKey: getGetExpenseSummaryQueryKey(summaryParams) } }
  );

  const activeParams = driverId ? { driverId, activeOnly: true } : { activeOnly: true };

  const { data: expenses } = useListExpenses(
    activeParams,
    { query: { queryKey: getListExpensesQueryKey(activeParams), enabled: role === "driver" && !!driverId } }
  );

  const allExpensesParams = driverId ? { driverId } : {};
  const { data: allExpenses } = useListExpenses(
    allExpensesParams,
    { query: { queryKey: getListExpensesQueryKey(allExpensesParams), enabled: role === "driver" && !!driverId } }
  );

  const hasSettledExpenses =
    role === "driver" &&
    Array.isArray(allExpenses) &&
    Array.isArray(expenses) &&
    allExpenses.length > expenses.length;

  const { data: revenues } = useListRevenues(
    activeParams,
    { query: { queryKey: getListRevenuesQueryKey(activeParams), enabled: role === "driver" && !!driverId } }
  );

  const { data: transfers } = useListTransfers(
    activeParams,
    { query: { queryKey: getListTransfersQueryKey(activeParams), enabled: role === "driver" && !!driverId } }
  );

  const cycleParams = driverId ? { driverId } : undefined;
  const { data: cycle, isLoading: cycleLoading } = useGetCycleSummary(
    cycleParams ?? { driverId: 0 },
    {
      query: {
        queryKey: getGetCycleSummaryQueryKey(cycleParams),
        enabled: !!driverId && role === "driver",
      }
    }
  );

  const fmt = (n: number | string | null | undefined) => Number(n || 0).toFixed(2);

  type FeedItem = {
    id: string;
    kind: "revenue" | "expense" | "transfer";
    amount: number;
    label: string;
    subLabel?: string;
    date: string;
    createdAt: string;
    hasSavedInvoice?: boolean;
    revenueId?: number;
  };

  const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

  const viewSavedInvoiceInFeed = async (revenueId: number) => {
    try {
      const res = await fetch(`${BASE_URL}/api/revenues/${revenueId}/invoice`);
      if (!res.ok) return;
      const inv = await res.json();
      const dateStr = inv.date ? format(new Date(inv.date), "dd/MM/yyyy") : "";
      const amount = Number(inv.amount).toFixed(2);
      const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>${inv.invoiceNumber}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#1a3358;direction:rtl}.header{display:flex;justify-content:space-between;border-bottom:3px solid #c9a227;padding-bottom:14px;margin-bottom:18px}h1{font-size:22px;font-weight:900;margin:0 0 3px}h2{font-size:11px;color:#c9a227;margin:0}.badge{background:#1a3358;color:#c9a227;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:800}table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#1a3358;color:#c9a227;padding:9px 12px;font-size:12px;text-align:right}td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13px}.total td{font-weight:800;border-top:2px solid #c9a227;background:#fffbf0}.footer{text-align:center;border-top:1px solid #eee;padding-top:10px;font-size:10px;color:#888;margin-top:14px}.footer strong{color:#1a3358}</style>
</head><body>
<div class="header"><div><h1>مؤسسة الشلال</h1><h2>Al-Shalal Transport & Forklifts</h2></div>
<div><div class="badge">${inv.invoiceNumber}</div><p style="font-size:11px;color:#888;margin:4px 0 0;direction:ltr;">${dateStr}</p>${inv.driverName ? `<p style="font-size:11px;margin:4px 0 0;">${inv.driverName}${inv.vehicleNumber ? ` — ${inv.vehicleNumber}` : ""}</p>` : ""}</div></div>
${inv.clientName ? `<div style="background:#f8f9fa;border-radius:8px;padding:12px 16px;margin-bottom:16px;"><div style="font-size:11px;color:#888;margin-bottom:3px;">العميل / Client</div><div style="font-size:17px;font-weight:700;">${inv.clientName}</div></div>` : ""}
<table><thead><tr><th>الخدمة / Service</th><th style="text-align:center;">المبلغ</th></tr></thead>
<tbody><tr><td>${inv.serviceType}${inv.notes ? `<br/><small style="color:#888;">${inv.notes}</small>` : ""}</td><td style="text-align:center;font-weight:700;">${amount}</td></tr>
<tr class="total"><td>الإجمالي / Total</td><td style="text-align:center;">${amount} ريال</td></tr></tbody></table>
<div class="footer"><strong>مؤسسة الشلال للنقل والرافعات الشوكية</strong></div>
</body></html>`;
      const w = window.open("", "_blank");
      if (w) { w.document.write(html); w.document.close(); w.onload = () => w.print(); }
    } catch { /* ignore */ }
  };

  const feedItems: FeedItem[] = [
    ...(revenues || []).map(r => ({
      id: `rev-${r.id}`,
      kind: "revenue" as const,
      amount: Number(r.amount),
      label: (r as { clientName?: string | null }).clientName || t("revenues"),
      subLabel: (r as { description?: string | null }).description || undefined,
      date: r.date,
      createdAt: r.createdAt,
      hasSavedInvoice: (r as { hasSavedInvoice?: boolean }).hasSavedInvoice ?? false,
      revenueId: r.id,
    })),
    ...(expenses || []).map(e => ({
      id: `exp-${e.id}`,
      kind: "expense" as const,
      amount: Number(e.amount),
      label: t(e.type as Parameters<typeof t>[0]),
      subLabel: e.notes || undefined,
      date: e.date,
      createdAt: e.createdAt,
    })),
    ...(transfers || []).map(tr => ({
      id: `trf-${tr.id}`,
      kind: "transfer" as const,
      amount: Number(tr.amount),
      label: t("transfers"),
      subLabel: tr.description || undefined,
      date: tr.date,
      createdAt: tr.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const kindStyle = {
    revenue: { bg: "bg-emerald-500/10", icon: TrendingUp, iconColor: "text-emerald-600", textColor: "text-emerald-700", border: "border-r-4 border-emerald-500" },
    expense: { bg: "bg-red-500/10", icon: TrendingDown, iconColor: "text-red-600", textColor: "text-red-700", border: "border-r-4 border-red-500" },
    transfer: { bg: "bg-blue-500/10", icon: ArrowUpFromLine, iconColor: "text-blue-600", textColor: "text-blue-700", border: "border-r-4 border-blue-500" },
  };

  return (
    <div className={`space-y-8 animate-in fade-in duration-700 ${isRtl ? "font-arabic" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">{t("dashboard")}</h1>
          <p className="text-slate-500 font-medium mt-1">مرحباً بك مجدداً، <span className="text-blue-600 font-bold">{driverName || "مدير النظام"}</span></p>
        </div>
        {role === "admin" && (
           <Link href="/admin">
            <Button variant="outline" className="rounded-xl border-slate-200 bg-white shadow-sm gap-2 font-bold text-slate-600 hover:bg-slate-50">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              لوحة تحكم الإدارة الشاملة
            </Button>
          </Link>
        )}
      </div>

      {role === "driver" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Action Card */}
          <div className="lg:col-span-2 space-y-6">
            <Link href="/revenues/new" className="block group">
              <Card className="bg-slate-900 border-none shadow-2xl shadow-blue-900/20 overflow-hidden relative transition-all duration-300 active:scale-[0.98]">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none group-hover:bg-blue-500/30 transition-all" />
                <CardContent className="p-8 flex items-center justify-between relative z-10">
                  <div className="space-y-2">
                    <p className="text-blue-400 text-xs font-black uppercase tracking-[0.2em]">تسجيل إيراد جديد</p>
                    <h2 className="text-3xl font-black text-white">{t("addRevenue")}</h2>
                    <p className="text-slate-400 text-sm font-medium">سجل رحلة جديدة أو خدمة نقل فورية</p>
                  </div>
                  <div className="bg-white/10 p-5 rounded-2xl group-hover:bg-blue-600 transition-colors duration-300">
                    <TrendingUp className="h-10 w-10 text-white" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <div className="grid grid-cols-2 gap-4">
               <Link href="/expenses/new">
                <Button className="w-full h-16 rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-900 font-black hover:bg-slate-50 gap-3">
                  <div className="bg-red-50 p-2 rounded-lg"><PlusCircle className="h-5 w-5 text-red-600" /></div>
                  {t("addExpense")}
                </Button>
              </Link>
              <Link href="/transfers/new">
                <Button className="w-full h-16 rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-900 font-black hover:bg-slate-50 gap-3">
                  <div className="bg-amber-50 p-2 rounded-lg"><ArrowUpFromLine className="h-5 w-5 text-amber-600" /></div>
                  {t("addTransfer")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Cycle Quick View */}
          <div className="lg:col-span-1">
            <Card className="h-full border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-white overflow-hidden relative">
              <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Scale className="h-4 w-4 text-blue-600" />
                  {t("currentCycle")}
                </CardTitle>
                <Link href="/settle">
                  <Button variant="ghost" size="sm" className="h-8 rounded-lg text-blue-600 font-bold hover:bg-blue-50">التفاصيل</Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {cycleLoading ? <Skeleton className="h-40 w-full rounded-xl" /> : cycle && (
                  <>
                    <div className="flex justify-between items-end border-b border-slate-50 pb-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("netProfit")}</p>
                        <p className={`text-3xl font-black tracking-tight ${Number(cycle.netProfit) >= 0 ? "text-slate-900" : "text-red-600"}`}>
                          {fmt(cycle.netProfit)} <span className="text-xs font-bold text-slate-400">ريال</span>
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${Number(cycle.netProfit) >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                        {Number(cycle.netProfit) >= 0 ? "دورة رابحة" : "عجز حالي"}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{t("totalRevenue")}</p>
                        <p className="text-sm font-black text-slate-900 mt-1">{fmt(cycle.totalRevenue)}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{t("grossRevenue")}</p>
                        <p className="text-sm font-black text-emerald-600 mt-1">{fmt(cycle.grossRevenue)}</p>
                      </div>
                    </div>

                    {Number(cycle.postponedBalance) < 0 && (
                       <div className="bg-red-950 p-4 rounded-xl shadow-lg shadow-red-900/10 border-l-4 border-red-500">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                          <p className="text-[10px] font-black text-red-200 uppercase tracking-widest">{t("postponedAmounts")}</p>
                        </div>
                        <p className="text-lg font-black text-white">{fmt(cycle.postponedBalance)} <span className="text-[10px] text-red-300">ريال معلق</span></p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Stats Breakdown Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoadingSummary ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
        ) : summary ? (
          <>
            <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-2xl group transition-transform hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-slate-900 p-2 rounded-xl text-white group-hover:bg-blue-600 transition-colors"><TrendingDown className="h-5 w-5" /></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("totalExpenses")}</span>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{fmt(summary.totalAmount)}</div>
                <div className="mt-2 text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                  <Activity className="h-3 w-3" /> {summary.expenseCount} عملية مقيدة
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-2xl group transition-transform hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><Fuel className="h-5 w-5" /></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("diesel")}</span>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{fmt(summary.dieselTotal)}</div>
                <div className="mt-2 text-[10px] font-bold text-blue-600 flex items-center gap-1.5">
                  {fmt(summary.dieselLiters)} {t("liters")} تقريباً
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-2xl group transition-transform hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-red-50 p-2 rounded-xl text-red-600"><AlertCircle className="h-5 w-5" /></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("maintenance")}</span>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{fmt(summary.maintenanceTotal)}</div>
                <div className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest">مصاريف الصيانة والاصلاح</div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-2xl group transition-transform hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600"><Receipt className="h-5 w-5" /></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الزيوت والمتفرقات</span>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {fmt(summary.oilAndMiscTotal ?? 0)}
                </div>
                <div className="mt-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">المصاريف النثرية الأخرى</div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Feed Items (Recent Activity) */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-slate-900 tracking-tight">آخر العمليات المقيدة</h3>
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-0 divide-y divide-slate-100">
            {feedItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">لا توجد عمليات مقيدة حالياً</div>
            ) : (
              feedItems.map((item) => {
                const style = kindStyle[item.kind];
                const Icon = style.icon;
                return (
                  <div key={item.id} className={`p-4 flex items-center justify-between gap-4 transition-colors hover:bg-slate-50/50 ${style.border}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${style.bg} ${style.iconColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{item.label}</p>
                        {item.subLabel && <p className="text-xs text-slate-400 font-medium mt-0.5">{item.subLabel}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <p className={`font-black text-sm ${style.textColor}`}>
                          {item.kind === "expense" ? "-" : "+"}{fmt(item.amount)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          {format(new Date(item.date), "dd/MM/yyyy")}
                        </p>
                      </div>
                      {item.kind === "revenue" && item.hasSavedInvoice && item.revenueId && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 rounded-lg border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 gap-1"
                          onClick={() => viewSavedInvoiceInFeed(item.revenueId!)}
                        >
                          <FileText className="h-3.5 w-3.5 text-blue-500" />
                          الفاتورة
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}