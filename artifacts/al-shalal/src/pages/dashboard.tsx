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
  ArrowUpFromLine, ShieldCheck, Fuel, User, Activity, FileText, CheckCircle, Clock,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { t, lang } = useI18n();
  const { role, driverId } = useAuth();
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
    revenue: { bg: "bg-green-500/10", icon: TrendingUp, iconColor: "text-green-600", textColor: "text-green-700", border: "border-l-4 border-green-500" },
    expense: { bg: "bg-red-500/10", icon: TrendingDown, iconColor: "text-red-600", textColor: "text-red-700", border: "border-l-4 border-red-500" },
    transfer: { bg: "bg-amber-500/10", icon: ArrowUpFromLine, iconColor: "text-amber-600", textColor: "text-amber-700", border: "border-l-4 border-amber-500" },
  };

  return (
    <div className="space-y-6">
      {role === "driver" ? (
        <>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("dashboard")}</h1>
          </div>
          <Link href="/revenues/new" className="block">
            <Button
              size="lg"
              className="w-full h-20 text-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30 gap-3"
            >
              <TrendingUp className="h-7 w-7" />
              {t("addRevenue")}
            </Button>
          </Link>
          <div className="flex gap-2 flex-wrap -mt-2">
            <Link href="/expenses/new" className="flex-1 min-w-[140px]">
              <Button size="sm" variant="outline" className="w-full">
                <PlusCircle className={`h-4 w-4 ${isRtl ? "ml-1.5" : "mr-1.5"}`} />
                {t("addExpense")}
              </Button>
            </Link>
            <Link href="/transfers/new" className="flex-1 min-w-[140px]">
              <Button size="sm" variant="outline" className="w-full border-amber-500 text-amber-700 hover:bg-amber-50">
                <ArrowUpFromLine className={`h-4 w-4 ${isRtl ? "ml-1.5" : "mr-1.5"}`} />
                {t("addTransfer")}
              </Button>
            </Link>
          </div>
        </>
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("dashboard")}</h1>
            {role === "admin" && (
              <Link href="/admin">
                <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("globalAnalytics")}
                </Button>
              </Link>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/expenses/new">
              <Button size="sm" variant="outline">
                <PlusCircle className={`h-4 w-4 ${isRtl ? "ml-1.5" : "mr-1.5"}`} />
                {t("addExpense")}
              </Button>
            </Link>
            <Link href="/revenues/new">
              <Button size="sm" variant="outline" className="border-green-500 text-green-700 hover:bg-green-50">
                <TrendingUp className={`h-4 w-4 ${isRtl ? "ml-1.5" : "mr-1.5"}`} />
                {t("addRevenue")}
              </Button>
            </Link>
            <Link href="/transfers/new">
              <Button size="sm" variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-50">
                <ArrowUpFromLine className={`h-4 w-4 ${isRtl ? "ml-1.5" : "mr-1.5"}`} />
                {t("addTransfer")}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Expense summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoadingSummary ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))
        ) : summary ? (
          <>
            <Card className="bg-primary text-primary-foreground">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-primary-foreground/80">{t("totalExpenses")}</CardTitle>
                <TrendingDown className="h-4 w-4 text-primary-foreground/80" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(summary.totalAmount)} <span className="text-sm font-normal opacity-80">{t("sar")}</span></div>
                {hasSettledExpenses && summary.expenseCount === 0 ? (
                  <p className="text-xs text-primary-foreground/60 mt-1 italic">{t("noCurrentCycleExpenses")}</p>
                ) : (
                  <p className="text-xs text-primary-foreground/60 mt-1">{summary.expenseCount} {t("expenses")}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("diesel")}</CardTitle>
                <Fuel className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(summary.dieselTotal)} <span className="text-sm font-normal text-muted-foreground">{t("sar")}</span></div>
                <p className="text-xs text-muted-foreground mt-1">{fmt(summary.dieselLiters)} {t("liters")} @ 1.79</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("maintenance")}</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(summary.maintenanceTotal)} <span className="text-sm font-normal text-muted-foreground">{t("sar")}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("oil")} & {t("other")}</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(Number(summary.oilTotal) + Number(summary.otherTotal)).toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground"> {t("sar")}</span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Cycle summary (driver only) */}
      {role === "driver" && driverId && (
        <Card className="border-2 border-primary/20 bg-primary/3">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              {t("currentCycle")}
            </CardTitle>
            <Link href="/settle">
              <Button size="sm" className="gap-1.5">
                <Scale className="h-4 w-4" />
                {t("settle")}
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {cycleLoading ? (
              <div className="grid gap-3 md:grid-cols-3">
                {[0,1,2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : cycle ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("totalRevenue")}</p>
                  <p className="text-xl font-bold text-green-700">{fmt(cycle.totalRevenue)} {t("sar")}</p>
                  <p className="text-xs text-muted-foreground">{cycle.revenueCount} entries</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("netProfit")}</p>
                  <p className={`text-xl font-bold ${Number(cycle.netProfit) >= 0 ? "text-primary" : "text-destructive"}`}>
                    {fmt(cycle.netProfit)} {t("sar")}
                  </p>
                  <Badge variant="outline" className="text-xs">{t("driverShare")}: {fmt(cycle.driverShare)}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("totalTransfers")}</p>
                  {Number(cycle.totalTransfers) === 0 ? (
                    <p className="text-sm text-muted-foreground italic leading-snug">{t("noCurrentCycleTransfers")}</p>
                  ) : (
                    <>
                      <p className="text-xl font-bold text-amber-700">{fmt(cycle.totalTransfers)} {t("sar")}</p>
                      <p className="text-xs text-muted-foreground">{cycle.transferCount} entries</p>
                    </>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("grossRevenue")}</p>
                  <p className="text-xl font-bold text-green-700">{fmt(cycle.grossRevenue)} {t("sar")}</p>
                </div>
                <div className={`space-y-1 rounded-lg p-3 -m-1 ${
                  Number(cycle.postponedBalance) < 0
                    ? "bg-red-50 border border-red-200"
                    : "border border-transparent"
                }`}>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {t("postponedAmounts")}
                  </p>
                  {Number(cycle.postponedBalance) < 0 ? (
                    <>
                      <p className="text-xl font-bold text-red-700">{fmt(cycle.postponedBalance)} {t("sar")}</p>
                      <p className="text-xs text-red-600">{cycle.deferredCount} {t("revenues")}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic leading-snug">{t("postponedDesc")}</p>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Unified Recent Activity Feed (driver only) */}
      {role === "driver" && driverId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {t("recentActivity")}
            </CardTitle>
            <Link href="/revenues">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {t("revenues")}
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {feedItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Activity className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">{t("noActivity")}</p>
              </div>
            ) : (
              <div className="divide-y">
                {feedItems.slice(0, 15).map(item => {
                  const s = kindStyle[item.kind];
                  const Icon = s.icon;
                  return (
                    <div key={item.id} className={`flex items-center justify-between p-4 hover:bg-muted/30 transition-colors ${s.border}`}>
                      <div className="flex items-center gap-3">
                        <div className={`${s.bg} p-2 rounded-full shrink-0`}>
                          <Icon className={`h-4 w-4 ${s.iconColor}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm leading-none">{item.label}</p>
                            {item.hasSavedInvoice && item.kind === "revenue" && item.revenueId && (
                              <button
                                onClick={() => viewSavedInvoiceInFeed(item.revenueId!)}
                                title={t("viewSavedInvoice")}
                                className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 hover:bg-emerald-100 transition-colors shrink-0"
                              >
                                <CheckCircle className="h-2.5 w-2.5" />
                                {t("invoiceLinked")}
                              </button>
                            )}
                          </div>
                          {item.subLabel && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.subLabel}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono" dir="ltr">
                            {format(new Date(item.createdAt), "yyyy-MM-dd")} | {format(new Date(item.createdAt), "HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold ${s.textColor}`}>
                          {item.kind === "expense" ? "−" : item.kind === "transfer" ? "↑" : "+"}
                          {Number(item.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">{t("sar")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin: show simple recent expenses */}
      {role !== "driver" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <CardTitle>{t("recentExpenses")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-8 text-center text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <Link href="/admin">
                <Button variant="link" className="gap-1">
                  <ShieldCheck className="h-4 w-4" />
                  {t("adminDashboard")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
