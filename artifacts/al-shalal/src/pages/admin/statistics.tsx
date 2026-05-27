import { useState, Fragment } from "react";
import { useI18n } from "@/lib/i18n";
import { useListDrivers, getListDriversQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  BarChart2, TrendingUp, TrendingDown, FileDown, FileText,
  Users, RefreshCw, ChevronDown, ChevronRight, Building2, Filter, X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BUSINESS_NAME_AR, BUSINESS_NAME_EN,
  BUSINESS_PHONES, BUSINESS_EMAIL, getBusinessConfig,
} from "@/lib/business-config";
import { format } from "date-fns";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface TimeseriesPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface ClientStat {
  clientName: string;
  totalRevenue: number;
  entryCount: number;
}

interface ClientTimeseriesPoint {
  month: string;
  revenue: number;
  entryCount: number;
}

function exportCsv(data: TimeseriesPoint[], filename: string, isAr: boolean) {
  const header = isAr
    ? ["الشهر", "الإيرادات", "المصروفات", "صافي الربح"]
    : ["Month", "Revenue", "Expenses", "Net Profit"];
  const rows = data.map(d => [d.month, d.revenue.toFixed(2), d.expenses.toFixed(2), d.profit.toFixed(2)]);
  const csv = [header, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPdf(
  data: TimeseriesPoint[],
  title: string,
  driverName: string | null,
  isAr: boolean
) {
  const cfg = getBusinessConfig();
  const phones = BUSINESS_PHONES.slice(0, 3).join(" | ");
  const fmt = (n: number) => n.toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const now = format(new Date(), "dd/MM/yyyy HH:mm");

  const rows = data.map(d => `
    <tr>
      <td dir="ltr">${d.month}</td>
      <td class="rev" dir="ltr">${fmt(d.revenue)}</td>
      <td class="exp" dir="ltr">${fmt(d.expenses)}</td>
      <td class="${d.profit >= 0 ? "net" : "exp"}" dir="ltr">${fmt(d.profit)}</td>
    </tr>`).join("");

  const totalRev = data.reduce((s, d) => s + d.revenue, 0);
  const totalExp = data.reduce((s, d) => s + d.expenses, 0);
  const totalProfit = data.reduce((s, d) => s + d.profit, 0);

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  @media print { @page { margin: 15mm; } }
  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1a3358; direction: rtl; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #c9a227; padding-bottom: 14px; margin-bottom: 18px; }
  .logo-block h1 { font-size: 22px; font-weight: 900; color: #1a3358; margin: 0 0 3px; }
  .logo-block h2 { font-size: 11px; color: #c9a227; margin: 0; font-weight: 700; }
  .report-title { background: #1a3358; color: #c9a227; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 800; }
  .meta { background: #f8f9fa; border: 1px solid #ddd; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; }
  .meta strong { color: #1a3358; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
  .sum-card { background: #f8f9fa; border-radius: 8px; padding: 10px 14px; text-align: center; }
  .sum-card p { margin: 2px 0; font-size: 11px; color: #888; }
  .sum-card .val { font-size: 18px; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1a3358; color: #c9a227; font-size: 12px; padding: 9px 12px; text-align: right; }
  td { padding: 9px 12px; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
  tr:last-child td { border-bottom: none; }
  .rev { color: #166534; font-weight: 700; }
  .exp { color: #991b1b; font-weight: 700; }
  .net { color: #1e40af; font-weight: 700; }
  .total-row td { font-weight: 800; background: #fffbf0; border-top: 2px solid #c9a227; }
  .footer { text-align: center; border-top: 1px solid #eee; padding-top: 10px; font-size: 10px; color: #888; margin-top: 16px; }
  .footer strong { color: #1a3358; }
</style>
</head>
<body>
<div class="header">
  <div class="logo-block">
    <h1>${BUSINESS_NAME_AR}</h1>
    <h2>${BUSINESS_NAME_EN}</h2>
  </div>
  <div class="report-title">${title}</div>
</div>

<div class="meta">
  ${driverName ? `<strong>${isAr ? "السائق" : "Driver"}:</strong> ${driverName} &nbsp;&nbsp;` : ""}
  <strong>${isAr ? "تاريخ التقرير" : "Report Date"}:</strong> ${now} &nbsp;&nbsp;
  <strong>${isAr ? "إجمالي الأشهر" : "Months"}:</strong> ${data.length}
</div>

<div class="summary">
  <div class="sum-card">
    <p>${isAr ? "إجمالي الإيرادات" : "Total Revenue"}</p>
    <div class="val rev" dir="ltr">${fmt(totalRev)}</div>
    <p>${isAr ? "ريال" : "SAR"}</p>
  </div>
  <div class="sum-card">
    <p>${isAr ? "إجمالي المصروفات" : "Total Expenses"}</p>
    <div class="val exp" dir="ltr">${fmt(totalExp)}</div>
    <p>${isAr ? "ريال" : "SAR"}</p>
  </div>
  <div class="sum-card">
    <p>${isAr ? "صافي الربح" : "Net Profit"}</p>
    <div class="val net" dir="ltr">${fmt(totalProfit)}</div>
    <p>${isAr ? "ريال" : "SAR"}</p>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>${isAr ? "الشهر" : "Month"}</th>
      <th>${isAr ? "الإيرادات (ريال)" : "Revenue (SAR)"}</th>
      <th>${isAr ? "المصروفات (ريال)" : "Expenses (SAR)"}</th>
      <th>${isAr ? "صافي الربح (ريال)" : "Net Profit (SAR)"}</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td>${isAr ? "الإجمالي" : "Total"}</td>
      <td class="rev" dir="ltr">${fmt(totalRev)}</td>
      <td class="exp" dir="ltr">${fmt(totalExp)}</td>
      <td class="${totalProfit >= 0 ? "net" : "exp"}" dir="ltr">${fmt(totalProfit)}</td>
    </tr>
  </tbody>
</table>

<div class="footer">
  <strong>${BUSINESS_NAME_AR}</strong> | ${phones}${BUSINESS_EMAIL ? ` | ${BUSINESS_EMAIL}` : ""}${cfg.ownerWhatsApp ? ` | واتساب: ${cfg.ownerWhatsApp}` : ""}
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

export default function StatisticsPage() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar" || lang === "ur";
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);

  const [clientFromInput, setClientFromInput] = useState("");
  const [clientToInput,   setClientToInput]   = useState("");
  const [clientDateFilter, setClientDateFilter] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  const { data: drivers } = useListDrivers({ query: { queryKey: getListDriversQueryKey() } });

  const { data: globalSeries, isLoading: globalLoading, refetch: refetchGlobal } = useQuery<TimeseriesPoint[]>({
    queryKey: ["stats-timeseries-global"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/stats/timeseries`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: clientStats, isLoading: clientsLoading, isError: clientsError, refetch: refetchClients } = useQuery<ClientStat[]>({
    queryKey: ["stats-clients", clientDateFilter.from, clientDateFilter.to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientDateFilter.from) params.set("startDate", clientDateFilter.from);
      if (clientDateFilter.to)   params.set("endDate",   clientDateFilter.to);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${BASE_URL}/api/admin/stats/clients${qs}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: clientTimeseries, isLoading: clientTsLoading } = useQuery<ClientTimeseriesPoint[]>({
    queryKey: ["stats-client-timeseries", expandedClient],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/stats/clients/${encodeURIComponent(expandedClient!)}/timeseries`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: expandedClient !== null,
  });

  const { data: driverSeries, isLoading: driverLoading } = useQuery<TimeseriesPoint[]>({
    queryKey: ["stats-timeseries-driver", selectedDriverId],
    queryFn: async () => {
      const url = `${BASE_URL}/api/admin/stats/timeseries${selectedDriverId ? `?driverId=${selectedDriverId}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: selectedDriverId !== null,
  });

  const selectedDriver = drivers?.find(d => d.id === selectedDriverId);
  const chartSeries = selectedDriverId !== null ? driverSeries : undefined;

  const fmt = (n: number) => Number(n).toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalRev = (globalSeries ?? []).reduce((s, d) => s + d.revenue, 0);
  const totalExp = (globalSeries ?? []).reduce((s, d) => s + d.expenses, 0);
  const totalProfit = totalRev - totalExp;

  const tooltipFormatter = (val: number) => `${fmt(val)} ${isAr ? "ريال" : "SAR"}`;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-full">
            <BarChart2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("statistics")}</h1>
            <p className="text-sm text-muted-foreground">{t("generalAnalytics")}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => { refetchGlobal(); refetchClients(); }}>
            <RefreshCw className="h-3.5 w-3.5" />
            {isAr ? "تحديث" : "Refresh"}
          </Button>
          {globalSeries && globalSeries.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => exportCsv(
                  globalSeries,
                  `al-shalal-statistics-${format(new Date(), "yyyy-MM-dd")}.csv`,
                  isAr
                )}
              >
                <FileDown className="h-3.5 w-3.5" />
                {t("exportCsv")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => exportPdf(
                  globalSeries,
                  isAr ? "تقرير إحصائي شامل" : "General Statistics Report",
                  null,
                  isAr
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                {t("exportData")} PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Global KPI summary cards */}
      {globalLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">{t("totalRevenue")}</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{fmt(totalRev)}</p>
              <p className="text-xs text-muted-foreground">{t("sar")}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-xs text-muted-foreground">{t("totalExpenses")}</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{fmt(totalExp)}</p>
              <p className="text-xs text-muted-foreground">{t("sar")}</p>
            </CardContent>
          </Card>
          <Card className={`${totalProfit >= 0 ? "bg-blue-500/5 border-blue-500/20" : "bg-red-500/5 border-red-500/20"}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">{t("netProfit")}</span>
              </div>
              <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-blue-700" : "text-red-700"}`}>{fmt(totalProfit)}</p>
              <p className="text-xs text-muted-foreground">{t("sar")}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── GENERAL ANALYTICS ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("generalAnalytics")} — {t("monthlyBreakdown")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {globalLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : !globalSeries || globalSeries.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              {t("noChartData")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={globalSeries} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} width={60} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" name={isAr ? "إيرادات" : "Revenue"} fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name={isAr ? "مصروفات" : "Expenses"} fill="#dc2626" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name={isAr ? "صافي الربح" : "Net Profit"} fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Revenue trend line chart */}
      {globalSeries && globalSeries.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-green-600" />
              {t("activityTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={globalSeries} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} width={60} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="revenue" name={isAr ? "إيرادات" : "Revenue"} stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="expenses" name={isAr ? "مصروفات" : "Expenses"} stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="profit" name={isAr ? "صافي الربح" : "Net Profit"} stroke="#2563eb" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── TOP CLIENTS BY REVENUE ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-primary" />
              {isAr ? "أبرز العملاء حسب الإيرادات" : "Top Clients by Revenue"}
              {(clientDateFilter.from || clientDateFilter.to) && (
                <span className="text-xs font-normal text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                  {isAr ? "مُصفَّى" : "Filtered"}
                </span>
              )}
            </CardTitle>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{isAr ? "من" : "From"}</span>
                <Input
                  type="date"
                  value={clientFromInput}
                  onChange={e => setClientFromInput(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{isAr ? "إلى" : "To"}</span>
                <Input
                  type="date"
                  value={clientToInput}
                  onChange={e => setClientToInput(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setClientDateFilter({ from: clientFromInput, to: clientToInput })}
              >
                <Filter className="h-3 w-3" />
                {isAr ? "تصفية" : "Filter"}
              </Button>
              {(clientDateFilter.from || clientDateFilter.to) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => {
                    setClientFromInput("");
                    setClientToInput("");
                    setClientDateFilter({ from: "", to: "" });
                  }}
                >
                  <X className="h-3 w-3" />
                  {isAr ? "مسح الفلتر" : "Clear"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clientsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : clientsError ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2 text-sm">
              <p className="text-red-600 font-medium">{isAr ? "تعذّر تحميل بيانات العملاء" : "Failed to load client data"}</p>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => refetchClients()}>
                <RefreshCw className="h-3.5 w-3.5 me-1.5" />
                {isAr ? "إعادة المحاولة" : "Retry"}
              </Button>
            </div>
          ) : !clientStats || clientStats.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              {isAr ? "لا توجد بيانات إيرادات بعد" : "No revenue data yet"}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Horizontal bar chart for top 10 */}
              <ResponsiveContainer width="100%" height={Math.max(160, Math.min(clientStats.length, 10) * 44)}>
                <BarChart
                  data={clientStats.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} width={60} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="clientName" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip
                    formatter={(val: number) => [`${fmt(val)} ${isAr ? "ريال" : "SAR"}`, isAr ? "الإيرادات" : "Revenue"]}
                  />
                  <Bar dataKey="totalRevenue" name={isAr ? "الإيرادات" : "Revenue"} fill="#c9a227" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Ranked table */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground text-xs">
                      <th className="px-3 py-2 text-start font-medium w-8">#</th>
                      <th className="px-3 py-2 text-start font-medium">{isAr ? "العميل" : "Client"}</th>
                      <th className="px-3 py-2 text-end font-medium">{isAr ? "عدد الرحلات" : "Trips"}</th>
                      <th className="px-3 py-2 text-end font-medium">{isAr ? "إجمالي الإيرادات" : "Total Revenue"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientStats.map((c, i) => {
                      const maxRev = clientStats[0]?.totalRevenue || 1;
                      const pct = (c.totalRevenue / maxRev) * 100;
                      const isExpanded = expandedClient === c.clientName;
                      return (
                        <Fragment key={c.clientName}>
                          <tr
                            className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => setExpandedClient(isExpanded ? null : c.clientName)}
                          >
                            <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{i + 1}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                {isExpanded
                                  ? <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                }
                                <div className="flex flex-col gap-1">
                                  <span className={`font-medium ${isExpanded ? "text-primary" : ""}`}>{c.clientName}</span>
                                  <div className="h-1.5 rounded-full bg-muted overflow-hidden w-full max-w-[180px]">
                                    <div
                                      className="h-full rounded-full bg-amber-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-end text-muted-foreground">
                              {c.entryCount}
                            </td>
                            <td className="px-3 py-2.5 text-end font-bold text-green-700 font-mono">
                              {fmt(c.totalRevenue)}
                              <span className="text-xs font-normal text-muted-foreground ms-1">{isAr ? "ريال" : "SAR"}</span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${c.clientName}-detail`} className="bg-muted/20 border-t border-border">
                              <td colSpan={4} className="px-4 py-3">
                                {clientTsLoading ? (
                                  <Skeleton className="h-32 rounded-lg" />
                                ) : !clientTimeseries || clientTimeseries.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    {isAr ? "لا توجد بيانات شهرية لهذا العميل" : "No monthly data for this client"}
                                  </p>
                                ) : (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                      {isAr ? `السجل الشهري — ${c.clientName}` : `Monthly history — ${c.clientName}`}
                                    </p>
                                    <ResponsiveContainer width="100%" height={160}>
                                      <BarChart data={clientTimeseries} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                                        <Tooltip formatter={(val: number) => [`${fmt(val)} ${isAr ? "ريال" : "SAR"}`, isAr ? "الإيرادات" : "Revenue"]} />
                                        <Bar dataKey="revenue" name={isAr ? "الإيرادات" : "Revenue"} fill="#c9a227" radius={[3, 3, 0, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── DRIVER-SPECIFIC ANALYTICS ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" />
              {t("driverAnalytics")}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {chartSeries && chartSeries.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => exportCsv(
                      chartSeries,
                      `driver-${selectedDriverId}-${format(new Date(), "yyyy-MM-dd")}.csv`,
                      isAr
                    )}
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => exportPdf(
                      chartSeries,
                      isAr ? `تقرير السائق — ${selectedDriver?.name}` : `Driver Report — ${selectedDriver?.name}`,
                      selectedDriver?.name ?? null,
                      isAr
                    )}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-xs min-w-[160px]">
                    <Users className="h-3.5 w-3.5" />
                    {selectedDriver ? selectedDriver.name : (isAr ? "اختر سائقاً" : "Select Driver")}
                    <ChevronDown className="h-3.5 w-3.5 ms-auto" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {drivers?.map(d => (
                    <DropdownMenuItem
                      key={d.id}
                      onClick={() => setSelectedDriverId(d.id)}
                      className={selectedDriverId === d.id ? "bg-muted" : ""}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{d.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{d.vehicleNumber}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedDriverId === null ? (
            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <Users className="h-8 w-8 opacity-20" />
              <p>{isAr ? "اختر سائقاً من القائمة لعرض إحصائياته" : "Select a driver from the dropdown to view their stats"}</p>
            </div>
          ) : driverLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : !chartSeries || chartSeries.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              {t("noChartData")}
            </div>
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartSeries} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} width={60} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" name={isAr ? "إيرادات" : "Revenue"} fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name={isAr ? "مصروفات" : "Expenses"} fill="#dc2626" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name={isAr ? "صافي الربح" : "Net Profit"} fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {chartSeries.length > 1 && (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartSeries} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} width={60} />
                    <Tooltip formatter={tooltipFormatter} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="revenue" name={isAr ? "إيرادات" : "Revenue"} stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="expenses" name={isAr ? "مصروفات" : "Expenses"} stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
