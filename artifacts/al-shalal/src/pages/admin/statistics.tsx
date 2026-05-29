import { useState, Fragment } from "react";
import { useI18n } from "@/lib/i18n";
import { useListDrivers, getListDriversQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  BarChart2, TrendingUp, TrendingDown, FileDown, FileText,
  Users, RefreshCw, ChevronDown, ChevronRight, Building2, Filter, X, LayoutDashboard, Coins
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
    <div className={`space-y-8 pb-12 animate-in fade-in duration-500 ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-xl shadow-slate-900/10">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t("statistics")}</h1>
            <p className="text-slate-500 text-xs font-medium mt-1">الرؤية الاستراتيجية والأداء المالي لمؤسسة الشلال</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap w-full md:w-auto">
          <Button variant="outline" size="sm" className="flex-1 md:flex-none h-10 rounded-xl font-bold border-slate-200 text-slate-600 gap-2 hover:bg-slate-50 transition-all" onClick={() => { refetchGlobal(); refetchClients(); }}>
            <RefreshCw className="h-4 w-4" />
            {isAr ? "تحديث البيانات" : "Refresh"}
          </Button>
          {globalSeries && globalSeries.length > 0 && (
            <div className="flex gap-2 flex-1 md:flex-none">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none h-10 rounded-xl font-bold border-slate-200 text-slate-600 gap-2 hover:bg-slate-50 transition-all"
                onClick={() => exportCsv(
                  globalSeries,
                  `al-shalal-statistics-${format(new Date(), "yyyy-MM-dd")}.csv`,
                  isAr
                )}
              >
                <FileDown className="h-4 w-4 text-blue-500" />
                {t("exportCsv")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none h-10 rounded-xl font-bold border-slate-200 text-slate-600 gap-2 hover:bg-slate-50 transition-all"
                onClick={() => exportPdf(
                  globalSeries,
                  isAr ? "تقرير إحصائي شامل للمؤسسة" : "General Statistics Report",
                  null,
                  isAr
                )}
              >
                <FileText className="h-4 w-4 text-red-500" />
                PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Global KPI Summary cards */}
      {globalLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-32 rounded-3xl shadow-sm" />)}
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
          <Card className="border-none bg-white shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("totalRevenue")}</p>
                <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-600"><TrendingUp className="h-5 w-5" /></div>
              </div>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{fmt(totalRev)}</p>
              <p className="text-xs font-bold text-emerald-600/70 mt-2">إجمالي الدخل المحقق (ريال)</p>
            </CardContent>
          </Card>
          
          <Card className="border-none bg-white shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("totalExpenses")}</p>
                <div className="bg-red-50 p-2.5 rounded-2xl text-red-600"><TrendingDown className="h-5 w-5" /></div>
              </div>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{fmt(totalExp)}</p>
              <p className="text-xs font-bold text-red-600/70 mt-2">تكاليف التشغيل والوقود (ريال)</p>
            </CardContent>
          </Card>
          
          <Card className={`border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all ${totalProfit >= 0 ? "bg-blue-600 text-white" : "bg-red-600 text-white"}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black opacity-60 uppercase tracking-widest text-white">{t("netProfit")}</p>
                <div className="bg-white/20 p-2.5 rounded-2xl text-white"><Coins className="h-5 w-5" /></div>
              </div>
              <p className="text-3xl font-black tracking-tighter">{fmt(totalProfit)}</p>
              <p className="text-xs font-bold opacity-70 mt-2">صافي الفائدة المرجوة (ريال)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── GENERAL ANALYTICS GRAPHS ── */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-3xl overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
              <BarChart2 className="h-4 w-4 text-blue-500" />
              توزيع الأرباح والنمو الشهري
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {globalLoading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : !globalSeries || globalSeries.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-slate-100 rounded-3xl">
                {t("noChartData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={globalSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700 }} width={60} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    formatter={tooltipFormatter} 
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                  <Bar dataKey="revenue" name={isAr ? "إيرادات" : "Revenue"} fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" name={isAr ? "مصروفات" : "Expenses"} fill="#ef4444" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" name={isAr ? "صافي الربح" : "Net Profit"} fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {globalSeries && globalSeries.length > 1 && (
          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-3xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
              <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                مؤشر المسار التشغيلي (Trend)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={globalSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700 }} width={60} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    formatter={tooltipFormatter} 
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="revenue" name={isAr ? "إيرادات" : "Revenue"} stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="expenses" name={isAr ? "مصروفات" : "Expenses"} stroke="#ef4444" strokeWidth={4} dot={{ r: 6, fill: "#ef4444", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── TOP CLIENTS BY REVENUE ── */}
      <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-3xl overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
              <Building2 className="h-4 w-4 text-blue-500" />
              أبرز العملاء والشركات المتعاملة
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
               <div className="flex items-center bg-white rounded-xl ring-1 ring-slate-200 px-3 py-1.5 shadow-sm">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter me-2">من</span>
                 <Input type="date" value={clientFromInput} onChange={e => setClientFromInput(e.target.value)} className="h-6 w-28 border-none p-0 text-[10px] font-black focus-visible:ring-0" />
               </div>
               <div className="flex items-center bg-white rounded-xl ring-1 ring-slate-200 px-3 py-1.5 shadow-sm">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter me-2">إلى</span>
                 <Input type="date" value={clientToInput} onChange={e => setClientToInput(e.target.value)} className="h-6 w-28 border-none p-0 text-[10px] font-black focus-visible:ring-0" />
               </div>
               <Button size="sm" className="h-9 rounded-xl font-black text-[10px] px-4 bg-slate-900 hover:bg-slate-800" onClick={() => setClientDateFilter({ from: clientFromInput, to: clientToInput })}>
                  تطبيق الفلتر
               </Button>
               {(clientDateFilter.from || clientDateFilter.to) && (
                 <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl text-red-500 hover:bg-red-50" onClick={() => { setClientFromInput(""); setClientToInput(""); setClientDateFilter({ from: "", to: "" }); }}>
                   <X className="h-4 w-4" />
                 </Button>
               )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {clientsLoading ? (
            <div className="p-8 space-y-4">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
            </div>
          ) : !clientStats || clientStats.length === 0 ? (
            <div className="p-20 text-center text-slate-300">
              <Building2 className="h-16 w-16 mx-auto mb-4 opacity-10" />
              <p className="text-sm font-black uppercase tracking-widest">لا توجد بيانات عملاء في هذه الفترة</p>
            </div>
          ) : (
            <div className="p-6 md:p-8 space-y-8">
              <ResponsiveContainer width="100%" height={Math.max(200, Math.min(clientStats.length, 10) * 50)}>
                <BarChart data={clientStats.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="clientName" tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="totalRevenue" name="الإيرادات" fill="#c9a227" radius={[0, 8, 8, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>

              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-6 py-3 text-start w-12 font-black">#</th>
                      <th className="px-6 py-3 text-start font-black">العميل المستفيد</th>
                      <th className="px-6 py-3 text-center font-black">العمليات</th>
                      <th className="px-6 py-3 text-end font-black">القيمة الكلية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {clientStats.map((c, i) => {
                      const maxRev = clientStats[0]?.totalRevenue || 1;
                      const pct = (c.totalRevenue / maxRev) * 100;
                      const isExpanded = expandedClient === c.clientName;
                      return (
                        <Fragment key={c.clientName}>
                          <tr className="hover:bg-slate-50/80 transition-all cursor-pointer group" onClick={() => setExpandedClient(isExpanded ? null : c.clientName)}>
                            <td className="px-6 py-4 text-xs font-black text-slate-300 font-mono">{i + 1}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl transition-colors ${isExpanded ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className={`h-3 w-3 ${isRtl ? "rotate-180" : ""}`} />}
                                </div>
                                <div className="space-y-1.5 w-full max-w-[240px]">
                                  <span className={`text-sm font-black ${isExpanded ? "text-blue-600" : "text-slate-900"}`}>{c.clientName}</span>
                                  <div className="h-1 rounded-full bg-slate-100 overflow-hidden w-full">
                                    <div className="h-full rounded-full bg-blue-500/40" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                               <Badge className="bg-slate-50 text-slate-400 border-none font-black text-[9px] px-2 py-0.5">{c.entryCount} رحلة</Badge>
                            </td>
                            <td className="px-6 py-4 text-end">
                              <span className="text-sm font-black text-slate-900 font-mono">{fmt(c.totalRevenue)}</span>
                              <span className="text-[10px] font-bold text-slate-300 ms-1 uppercase tracking-widest">ريال</span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-blue-50/30 animate-in slide-in-from-top-2 duration-300">
                              <td colSpan={4} className="px-8 py-6">
                                {clientTsLoading ? (
                                  <Skeleton className="h-32 rounded-2xl" />
                                ) : (
                                  <div className="space-y-4">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">تحليل التدفق المالي للعميل</p>
                                    <ResponsiveContainer width="100%" height={180}>
                                      <BarChart data={clientTimeseries} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="month" tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis hide />
                                        <Tooltip 
                                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                                          formatter={(val: number) => [`${fmt(val)} ريال`, "الإيراد الشهرى"]} 
                                        />
                                        <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
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
      <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden border-t-4 border-blue-600">
        <CardHeader className="p-6 border-b border-slate-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
              <Users className="h-4 w-4 text-blue-500" />
              تحليل الأداء الفردي للسائقين
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {chartSeries && chartSeries.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-9 rounded-xl text-[10px] font-black px-3 text-slate-500 hover:bg-slate-50" onClick={() => exportCsv(chartSeries, `driver-${selectedDriverId}.csv`, isAr)}>
                    تصدير CSV
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 rounded-xl text-[10px] font-black px-3 text-slate-500 hover:bg-slate-50" onClick={() => exportPdf(chartSeries, `تقرير السائق ${selectedDriver?.name}`, selectedDriver?.name ?? null, isAr)}>
                    تصدير PDF
                  </Button>
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl font-black text-xs border-slate-200 text-slate-700 bg-slate-50 hover:bg-white transition-all shadow-sm flex-1 sm:flex-none justify-between gap-4 min-w-[200px]">
                    <span className="truncate">{selectedDriver ? selectedDriver.name : "اختر سائقاً من القائمة"}</span>
                    <ChevronDown className="h-4 w-4 opacity-30" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-2xl border-slate-100 shadow-2xl p-2">
                  {drivers?.map(d => (
                    <DropdownMenuItem key={d.id} onClick={() => setSelectedDriverId(d.id)} className={`rounded-xl p-3 mb-1 cursor-pointer transition-all ${selectedDriverId === d.id ? "bg-blue-600 text-white" : "hover:bg-slate-50"}`}>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-black text-sm">{d.name}</span>
                        <span className={`text-[10px] font-bold font-mono opacity-60 ${selectedDriverId === d.id ? "text-white" : "text-slate-400"}`}>{d.vehicleNumber}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          {selectedDriverId === null ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
              <Users className="h-16 w-16 opacity-5" />
              <p className="text-xs font-black uppercase tracking-[0.2em]">بانتظار تحديد السائق لمباشرة التحليل</p>
            </div>
          ) : driverLoading ? (
            <Skeleton className="h-80 w-full rounded-3xl" />
          ) : !chartSeries || chartSeries.length === 0 ? (
            <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs border-2 border-dashed border-slate-100 rounded-3xl">
              {t("noChartData")}
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700 }} width={60} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    formatter={tooltipFormatter} 
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                  <Bar dataKey="revenue" name="إيرادات السائق" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" name="مصاريف التشغيل" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              
              {chartSeries.length > 1 && (
                <div className="pt-8 border-t border-slate-50">
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-6">مسار نمو الإيراد الصافي للسائق</p>
                   <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartSeries} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                        formatter={tooltipFormatter} 
                      />
                      <Line type="monotone" dataKey="revenue" name="الإيرادات" stroke="#10b981" strokeWidth={4} dot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} />
                      <Line type="monotone" dataKey="profit" name="الربح الصافي" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}