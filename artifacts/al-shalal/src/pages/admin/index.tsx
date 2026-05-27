import { useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import {
  useGetAnalytics, getGetAnalyticsQueryKey,
  useListDrivers, getListDriversQueryKey,
  useDeleteRevenue, useDeleteExpense, useDeleteTransfer,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ShieldCheck, TrendingUp, TrendingDown, Users, Receipt,
  Filter, Activity, Truck, RefreshCw, Zap,
  ArrowUpFromLine, Clock, Trash2, Check, X,
  Globe, Wallet, Banknote,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { format } from "date-fns";

const POLL_MS = 10_000;
// All-time global totals change rarely and are read from a cached row, but
// there's no need to hammer the endpoint every 10s for a number that only
// moves when someone records a revenue/expense/settlement.
const GLOBAL_SUMMARY_POLL_MS = 60_000;
const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type ActivityData = {
  revenues: Array<{ id: number; amount: string; clientName?: string | null; description?: string | null; date: string; createdAt: string }>;
  expenses: Array<{ id: number; amount: string; type: string; notes?: string | null; date: string; createdAt: string }>;
  transfers: Array<{ id: number; amount: string; description?: string | null; date: string; createdAt: string }>;
  summary: { totalRevenue: number; totalExpenses: number; totalTransfers: number; net: number };
};

type TimelineEntry =
  | { kind: "revenue";  id: number; amount: number; label: string; note: string; date: string; ts: Date }
  | { kind: "expense";  id: number; amount: number; label: string; note: string; date: string; ts: Date }
  | { kind: "transfer"; id: number; amount: number; label: string; note: string; date: string; ts: Date };

function buildTimeline(data: ActivityData, tFn: (k: string) => string): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...data.revenues.map(r => ({
      kind: "revenue" as const,
      id: r.id,
      amount: Number(r.amount),
      label: r.clientName || "—",
      note: r.description || "",
      date: r.date,
      ts: new Date(r.createdAt),
    })),
    ...data.expenses.map(e => ({
      kind: "expense" as const,
      id: e.id,
      amount: Number(e.amount),
      label: tFn(e.type) || e.type,
      note: e.notes || "",
      date: e.date,
      ts: new Date(e.createdAt),
    })),
    ...data.transfers.map(tr => ({
      kind: "transfer" as const,
      id: tr.id,
      amount: Number(tr.amount),
      label: tFn("transfers"),
      note: tr.description || "",
      date: tr.date,
      ts: new Date(tr.createdAt),
    })),
  ];
  return entries.sort((a, b) => b.ts.getTime() - a.ts.getTime());
}

async function fetchActivity(driverId: number, startDate: string, endDate: string): Promise<ActivityData> {
  const params = new URLSearchParams({ driverId: String(driverId), startDate, endDate });
  const res = await fetch(`${BASE_URL}/api/admin/activity?${params}`);
  if (!res.ok) throw new Error("Failed to fetch activity");
  return res.json();
}

type GlobalSummary = {
  totalRevenues: number;
  totalExpenses: number;
  totalOwnerProfit: number;
  totalDriverEarnings: number;
};

async function fetchGlobalSummary(): Promise<GlobalSummary> {
  const res = await fetch(`${BASE_URL}/api/admin/global-summary`);
  if (!res.ok) throw new Error("Failed to fetch global summary");
  return res.json();
}

export default function AdminDashboard() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [applied, setApplied] = useState<{ startDate?: string; endDate?: string }>({});
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Instant Activity state
  const today = format(new Date(), "yyyy-MM-dd");
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityDriverId, setActivityDriverId] = useState<number | null>(null);
  const [activityDriverName, setActivityDriverName] = useState("");
  const [activityStart, setActivityStart] = useState(today);
  const [activityEnd, setActivityEnd] = useState(today);
  const [appliedActivity, setAppliedActivity] = useState({ start: today, end: today });

  // Delete state for instant activity timeline rows
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteFlash, setDeleteFlash] = useState(false);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const deleteRevenue = useDeleteRevenue();
  const deleteExpense = useDeleteExpense();
  const deleteTransfer = useDeleteTransfer();

  const params = {
    ...(applied.startDate ? { startDate: applied.startDate } : {}),
    ...(applied.endDate ? { endDate: applied.endDate } : {}),
  };

  const { data: analytics, isLoading, refetch } = useGetAnalytics(
    params,
    {
      query: {
        queryKey: getGetAnalyticsQueryKey(params),
        refetchInterval: POLL_MS,
      }
    }
  );

  const { data: drivers } = useListDrivers(
    {
      query: {
        queryKey: getListDriversQueryKey(),
        refetchInterval: POLL_MS,
      }
    }
  );

  const { data: globalSummary, isLoading: isGlobalLoading } = useQuery<GlobalSummary>({
    queryKey: ["admin-global-summary"],
    queryFn: fetchGlobalSummary,
    refetchInterval: GLOBAL_SUMMARY_POLL_MS,
  });

  const { data: activityData, isLoading: isActivityLoading, refetch: refetchActivity } = useQuery<ActivityData>({
    queryKey: ["admin-activity", activityDriverId, appliedActivity.start, appliedActivity.end],
    queryFn: () => fetchActivity(activityDriverId!, appliedActivity.start, appliedActivity.end),
    enabled: !!activityDriverId && activityOpen,
    refetchInterval: activityOpen ? 15_000 : false,
  });

  const handleFilter = () => {
    setApplied({ startDate: startDate || undefined, endDate: endDate || undefined });
    setLastRefresh(new Date());
  };

  const handleManualRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  const openActivity = useCallback((driverId: number, driverName: string) => {
    const t = format(new Date(), "yyyy-MM-dd");
    setActivityDriverId(driverId);
    setActivityDriverName(driverName);
    setActivityStart(t);
    setActivityEnd(t);
    setAppliedActivity({ start: t, end: t });
    setActivityOpen(true);
  }, []);

  const applyActivityFilter = () => {
    setAppliedActivity({ start: activityStart, end: activityEnd });
  };

  const handleDeleteEntry = useCallback(
    async (entry: TimelineEntry) => {
      const key = `${entry.kind}-${entry.id}`;
      setPendingDeleteKey(key);
      setDeleteError(null);
      try {
        if (entry.kind === "revenue") {
          await deleteRevenue.mutateAsync({ id: entry.id });
        } else if (entry.kind === "expense") {
          await deleteExpense.mutateAsync({ id: entry.id });
        } else {
          await deleteTransfer.mutateAsync({ id: entry.id });
        }
        await Promise.all([
          refetchActivity(),
          queryClient.invalidateQueries({ queryKey: getGetAnalyticsQueryKey(params) }),
        ]);
        setConfirmDeleteKey(null);
        setDeleteFlash(true);
        setTimeout(() => setDeleteFlash(false), 2500);
      } catch {
        setDeleteError(t("adminDeleteFailed"));
        setTimeout(() => setDeleteError(null), 4000);
      } finally {
        setPendingDeleteKey(null);
      }
    },
    [deleteRevenue, deleteExpense, deleteTransfer, refetchActivity, queryClient, params, t],
  );

  const fmt = (n: number | undefined | null) => Number(n || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const isAr = lang === "ar" || lang === "ur";

  const totalEntries = (activityData?.revenues.length ?? 0) +
    (activityData?.expenses.length ?? 0) +
    (activityData?.transfers.length ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">{t("masterDashboard")}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">{t("liveUpdates")}</span>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleManualRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
          {isAr ? "تحديث" : "Refresh"}
        </Button>
      </div>

      {/* All-Time Global Summary (ignores date filter) */}
      <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-primary/10 p-1.5 rounded-full">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-bold tracking-wide uppercase text-primary">
            {t("allTimeGlobalSummary")}
          </h2>
        </div>
        {isGlobalLoading || !globalSummary ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-green-500/5 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">{t("totalRevenues")}</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{fmt(globalSummary.totalRevenues)}</p>
                <p className="text-xs text-muted-foreground">{t("sar")}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/5 border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-xs text-muted-foreground">{t("totalExpenses")}</span>
                </div>
                <p className="text-2xl font-bold text-red-700">{fmt(globalSummary.totalExpenses)}</p>
                <p className="text-xs text-muted-foreground">{t("sar")}</p>
              </CardContent>
            </Card>
            <Card className="bg-violet-500/5 border-violet-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="h-4 w-4 text-violet-600" />
                  <span className="text-xs text-muted-foreground">{t("totalOwnerProfit")}</span>
                </div>
                <p className="text-2xl font-bold text-violet-700">{fmt(globalSummary.totalOwnerProfit)}</p>
                <p className="text-xs text-muted-foreground">{t("sar")}</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/5 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">{t("totalDriverEarnings")}</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{fmt(globalSummary.totalDriverEarnings)}</p>
                <p className="text-xs text-muted-foreground">{t("sar")}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Date filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1 flex-1 min-w-[140px]">
              <Label className="text-xs">{t("from")}</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1 flex-1 min-w-[140px]">
              <Label className="text-xs">{t("to")}</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-10" />
            </div>
            <Button onClick={handleFilter} variant="outline" className="h-10 gap-2">
              <Filter className="h-4 w-4" /> {t("filter")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Global KPIs */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">{t("totalRevenue")}</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{fmt(analytics.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">{t("sar")}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/5 border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-xs text-muted-foreground">{t("totalExpenses")}</span>
                </div>
                <p className="text-2xl font-bold text-red-700">{fmt(analytics.totalExpenses)}</p>
                <p className="text-xs text-muted-foreground">{t("sar")}</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">{t("netProfit")}</span>
                </div>
                <p className={`text-2xl font-bold ${analytics.netProfit >= 0 ? "text-blue-700" : "text-red-700"}`}>
                  {fmt(analytics.netProfit)}
                </p>
                <p className="text-xs text-muted-foreground">{t("sar")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t("driverCount")}</span>
                </div>
                <p className="text-2xl font-bold">{analytics.driverCount}</p>
                <p className="text-xs text-muted-foreground">{analytics.settlementCount} {t("settlements")}</p>
              </CardContent>
            </Card>
          </div>

          {/* ── DRIVER GRID ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{t("perDriver")}</h2>
              <Badge variant="secondary" className="text-xs">{analytics.perDriver?.length ?? 0}</Badge>
            </div>

            {analytics.perDriver && analytics.perDriver.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {analytics.perDriver.map(d => {
                  const driverInfo = drivers?.find(dr => dr.id === d.driverId);
                  const isFrozen = driverInfo?.status === "frozen";
                  const profit = Number(d.netProfit);
                  const revenue = Number(d.totalRevenue);
                  const expenses = Number(d.totalExpenses);
                  const pctExpenses = revenue > 0 ? Math.min(100, (expenses / revenue) * 100) : 0;

                  const chartData = [
                    { name: isAr ? "إيرادات" : "Revenue", value: revenue, fill: "#16a34a" },
                    { name: isAr ? "مصروفات" : "Expenses", value: expenses, fill: "#dc2626" },
                    { name: isAr ? "الصافي" : "Net", value: Math.max(0, profit), fill: "#2563eb" },
                  ];

                  return (
                    <Card
                      key={d.driverId}
                      className={`overflow-hidden transition-shadow hover:shadow-md ${isFrozen ? "opacity-70 border-amber-300" : ""}`}
                    >
                      {/* Card header stripe */}
                      <div className={`px-4 py-3 flex items-center justify-between gap-2 ${isFrozen ? "bg-amber-50 border-b border-amber-200" : "bg-primary/5 border-b"}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-full shrink-0 ${isFrozen ? "bg-amber-200" : "bg-primary/15"}`}>
                            <Truck className={`h-4 w-4 ${isFrozen ? "text-amber-700" : "text-primary"}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{d.driverName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{d.vehicleNumber}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                          {isFrozen ? (
                            <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-50">
                              {t("frozen")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-green-400 text-green-700 bg-green-50">
                              {t("active")}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {d.settlementCount} {isAr ? "تسوية" : "settle"}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-4 space-y-3">
                        {/* Revenue / Expenses / Net / Gross / Postponed row */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                          <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                            <p className="text-[10px] text-green-700 font-medium mb-0.5">{t("totalRevenue")}</p>
                            <p className="font-bold text-sm text-green-800">{fmt(revenue)}</p>
                          </div>
                          <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                            <p className="text-[10px] text-emerald-700 font-medium mb-0.5">{t("grossRevenue")}</p>
                            <p className="font-bold text-sm text-emerald-800">{fmt(Number(d.grossRevenue ?? 0))}</p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-2 border border-red-100">
                            <p className="text-[10px] text-red-700 font-medium mb-0.5">{t("totalExpenses")}</p>
                            <p className="font-bold text-sm text-red-800">{fmt(expenses)}</p>
                          </div>
                          <div className={`rounded-lg p-2 border ${profit >= 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"}`}>
                            <p className={`text-[10px] font-medium mb-0.5 ${profit >= 0 ? "text-blue-700" : "text-red-700"}`}>
                              {t("netShare")}
                            </p>
                            <p className={`font-bold text-sm ${profit >= 0 ? "text-blue-800" : "text-red-800"}`}>
                              {fmt(profit)}
                            </p>
                          </div>
                          <div className={`rounded-lg p-2 border ${Number(d.postponedBalance ?? 0) < 0 ? "bg-red-50 border-red-200" : "bg-muted/30 border-border"}`}>
                            <p className={`text-[10px] font-medium mb-0.5 ${Number(d.postponedBalance ?? 0) < 0 ? "text-red-700" : "text-muted-foreground"}`}>
                              {t("postponedAmounts")}
                            </p>
                            <p className={`font-bold text-sm ${Number(d.postponedBalance ?? 0) < 0 ? "text-red-800" : "text-muted-foreground"}`}>
                              {fmt(Number(d.postponedBalance ?? 0) < 0 ? d.postponedBalance : 0)}
                            </p>
                          </div>
                        </div>

                        {/* Mini bar chart — Revenue vs Expenses vs Net */}
                        {revenue > 0 && (
                          <div>
                            <CardHeader className="p-0 pb-1">
                              <CardTitle className="text-[10px] text-muted-foreground font-medium">
                                {t("revenueVsExpenses")}
                              </CardTitle>
                            </CardHeader>
                            <ResponsiveContainer width="100%" height={80}>
                              <BarChart data={chartData} barSize={20} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                                <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 8 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                  formatter={(val: number) => [`${Number(val).toFixed(2)} ${isAr ? "ريال" : "SAR"}`, ""]}
                                  contentStyle={{ fontSize: 11 }}
                                />
                                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                                  {chartData.map((entry, index) => (
                                    <Cell key={index} fill={entry.fill} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Expense ratio bar */}
                        {revenue > 0 && (
                          <div>
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                              <span>{isAr ? "نسبة المصروفات" : "Expense ratio"}</span>
                              <span>{pctExpenses.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pctExpenses > 80 ? "bg-red-500" : pctExpenses > 50 ? "bg-amber-500" : "bg-green-500"}`}
                                style={{ width: `${pctExpenses}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* ── Instant Activity button ── */}
                        <Button
                          size="sm"
                          className="w-full gap-2 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white border-0"
                          onClick={() => openActivity(d.driverId, d.driverName)}
                        >
                          <Zap className="h-3.5 w-3.5" />
                          {t("instantActivity")}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">{t("noData")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : null}

      {/* ── INSTANT ACTIVITY SHEET ── */}
      <Sheet
        open={activityOpen}
        onOpenChange={(open) => {
          setActivityOpen(open);
          if (!open) {
            setConfirmDeleteKey(null);
            setDeleteError(null);
            setDeleteFlash(false);
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="h-[88vh] sm:h-[92vh] overflow-hidden flex flex-col p-0 rounded-t-2xl"
        >
          {/* Sheet header */}
          <div className="flex-none px-5 pt-5 pb-4 border-b bg-orange-500 text-white rounded-t-2xl">
            <SheetHeader className="text-start">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-2">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <SheetTitle className="text-white text-base font-bold leading-tight">
                      {t("instantActivity")} — {activityDriverName}
                    </SheetTitle>
                    <SheetDescription className="text-orange-100 text-xs mt-0.5">
                      {t("instantActivityDesc")}
                    </SheetDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  onClick={() => { refetchActivity(); }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </SheetHeader>

            {/* Date range picker */}
            <div className="mt-4 flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[130px] space-y-1">
                <label className="text-xs text-orange-100">{t("from")}</label>
                <Input
                  type="date"
                  value={activityStart}
                  onChange={e => setActivityStart(e.target.value)}
                  className="h-9 bg-white/15 border-white/30 text-white placeholder:text-white/50 text-sm"
                  dir="ltr"
                />
              </div>
              <div className="flex-1 min-w-[130px] space-y-1">
                <label className="text-xs text-orange-100">{t("to")}</label>
                <Input
                  type="date"
                  value={activityEnd}
                  onChange={e => setActivityEnd(e.target.value)}
                  className="h-9 bg-white/15 border-white/30 text-white placeholder:text-white/50 text-sm"
                  dir="ltr"
                />
              </div>
              <Button
                size="sm"
                onClick={applyActivityFilter}
                className="h-9 bg-white text-orange-600 hover:bg-orange-50 font-semibold gap-1.5 shrink-0"
              >
                <Filter className="h-3.5 w-3.5" />
                {t("filter")}
              </Button>
            </div>
          </div>

          {/* Delete flash banners */}
          {(deleteFlash || deleteError) && (
            <div className="flex-none px-4 pt-3">
              {deleteFlash && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 flex items-center gap-2">
                  <Check className="h-3.5 w-3.5" />
                  {t("adminEntryDeleted")}
                </div>
              )}
              {deleteError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-center gap-2">
                  <X className="h-3.5 w-3.5" />
                  {deleteError}
                </div>
              )}
            </div>
          )}

          {/* Scrollable content — unified chronological timeline */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {isActivityLoading ? (
              <div className="space-y-2 pt-2">
                {[0, 1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : totalEntries === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Activity className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">{t("noActivityFound")}</p>
                <p className="text-xs mt-1 opacity-60">
                  {appliedActivity.start === appliedActivity.end
                    ? appliedActivity.start
                    : `${appliedActivity.start} → ${appliedActivity.end}`}
                </p>
              </div>
            ) : (() => {
              const timeline = buildTimeline(activityData!, t as (k: string) => string);
              return (
                <>
                  {/* Timeline header count */}
                  <div className="flex items-center gap-2 px-1 pb-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold text-muted-foreground">
                      {isAr ? `${timeline.length} عملية — ترتيب زمني` : `${timeline.length} entries — newest first`}
                    </p>
                  </div>

                  {/* Unified timeline entries */}
                  {timeline.map((entry, idx) => {
                    const isRevenue  = entry.kind === "revenue";
                    const isExpense  = entry.kind === "expense";
                    const isTransfer = entry.kind === "transfer";

                    const colors = isRevenue
                      ? { bg: "bg-green-50", border: "border-green-100", icon: "bg-green-100", iconText: "text-green-700", text: "text-green-900", sub: "text-green-700/70", amount: "text-green-700", ts: "text-green-600/70" }
                      : isExpense
                      ? { bg: "bg-red-50",   border: "border-red-100",   icon: "bg-red-100",   iconText: "text-red-700",   text: "text-red-900",   sub: "text-red-700/70",   amount: "text-red-700",   ts: "text-red-600/70" }
                      : { bg: "bg-amber-50", border: "border-amber-100", icon: "bg-amber-100", iconText: "text-amber-700", text: "text-amber-900", sub: "text-amber-700/70", amount: "text-amber-700", ts: "text-amber-600/70" };

                    const Icon = isRevenue ? TrendingUp : isExpense ? TrendingDown : ArrowUpFromLine;

                    const timeStr = format(entry.ts, "hh:mm a");
                    const dateStr = format(new Date(entry.date + "T12:00:00"), "dd/MM");

                    const rowKey = `${entry.kind}-${entry.id}`;
                    const isConfirming = confirmDeleteKey === rowKey;
                    const isDeleting = pendingDeleteKey === rowKey;

                    return (
                      <div
                        key={`${entry.kind}-${entry.id}-${idx}`}
                        className={`flex items-center gap-3 ${colors.bg} border ${colors.border} rounded-xl px-3 py-2.5`}
                      >
                        <div className={`${colors.icon} rounded-full p-1.5 shrink-0`}>
                          <Icon className={`h-3.5 w-3.5 ${colors.iconText}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${colors.text} truncate`}>
                            {entry.label}
                          </p>
                          {entry.note && (
                            <p className={`text-xs ${colors.sub} truncate`}>{entry.note}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-bold ${colors.amount} text-sm`}>{fmt(entry.amount)}</p>
                          <div className={`flex items-center justify-end gap-0.5 ${colors.ts}`} dir="ltr">
                            <Clock className="h-2.5 w-2.5" />
                            <span className="text-[10px]">{timeStr}</span>
                            <span className="text-[10px] mx-0.5">·</span>
                            <span className="text-[10px]">{dateStr}</span>
                          </div>
                        </div>
                        {isConfirming ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-[10px] gap-1"
                              onClick={() => handleDeleteEntry(entry)}
                              disabled={isDeleting}
                              aria-label={t("adminDeleteConfirm")}
                            >
                              <Check className="h-3 w-3" />
                              {t("confirm")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => setConfirmDeleteKey(null)}
                              disabled={isDeleting}
                              aria-label={t("cancel")}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setDeleteError(null);
                              setConfirmDeleteKey(rowKey);
                            }}
                            aria-label={t("adminDeleteEntry")}
                            title={t("adminDeleteEntry")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>

          {/* Summary footer */}
          {activityData && totalEntries > 0 && (
            <div className="flex-none border-t bg-muted/30 px-4 py-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {isAr ? "ملخص الفترة" : "Period Summary"}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-green-700 font-medium mb-1">{t("totalDailyRevenue")}</p>
                  <p className="font-bold text-green-800 text-base leading-none">{fmt(activityData.summary.totalRevenue)}</p>
                  <p className="text-[10px] text-green-600/70 mt-0.5">{t("sar")}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-red-700 font-medium mb-1">{t("totalDailyExpenses")}</p>
                  <p className="font-bold text-red-800 text-base leading-none">{fmt(activityData.summary.totalExpenses)}</p>
                  <p className="text-[10px] text-red-600/70 mt-0.5">{t("sar")}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-amber-700 font-medium mb-1">{t("ownerTransfers")}</p>
                  <p className="font-bold text-amber-800 text-base leading-none">{fmt(activityData.summary.totalTransfers)}</p>
                  <p className="text-[10px] text-amber-600/70 mt-0.5">{t("sar")}</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${activityData.summary.net >= 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"}`}>
                  <p className={`text-[10px] font-medium mb-1 ${activityData.summary.net >= 0 ? "text-blue-700" : "text-red-700"}`}>
                    {t("netAmount")}
                  </p>
                  <p className={`font-bold text-base leading-none ${activityData.summary.net >= 0 ? "text-blue-800" : "text-red-800"}`}>
                    {fmt(activityData.summary.net)}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${activityData.summary.net >= 0 ? "text-blue-600/70" : "text-red-600/70"}`}>{t("sar")}</p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
