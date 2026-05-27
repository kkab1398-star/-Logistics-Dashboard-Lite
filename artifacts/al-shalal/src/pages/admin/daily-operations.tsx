import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import {
  useListDrivers, getListDriversQueryKey,
  useListRevenues, getListRevenuesQueryKey,
  useListExpenses, getListExpensesQueryKey,
  useListTransfers, getListTransfersQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, TrendingUp, TrendingDown, ArrowUpFromLine, Truck, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

const REFETCH_MS = 30_000;

function localTodayYmd() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type Op = {
  id: number;
  kind: "revenue" | "expense" | "transfer";
  driverId: number;
  amount: string;
  date: string;
  createdAt: string;
  label: string;
};

export default function DailyOperationsPage() {
  const { t } = useI18n();
  const today = localTodayYmd();

  const { data: drivers, isLoading: driversLoading } = useListDrivers(
    { query: { queryKey: getListDriversQueryKey() } }
  );
  const { data: revenues } = useListRevenues(
    { activeOnly: true },
    { query: { queryKey: getListRevenuesQueryKey({ activeOnly: true }), refetchInterval: REFETCH_MS } }
  );
  const { data: expenses } = useListExpenses(
    { activeOnly: true },
    { query: { queryKey: getListExpensesQueryKey({ activeOnly: true }), refetchInterval: REFETCH_MS } }
  );
  const { data: transfers } = useListTransfers(
    { activeOnly: true },
    { query: { queryKey: getListTransfersQueryKey({ activeOnly: true }), refetchInterval: REFETCH_MS } }
  );

  const opsByDriver = useMemo(() => {
    const map = new Map<number, Op[]>();
    // Strict: use the recorded operation date field (YYYY-MM-DD) — single source of truth.
    const isToday = (date?: string | null) =>
      !!date && date.slice(0, 10) === today;
    const push = (op: Op) => {
      const arr = map.get(op.driverId) ?? [];
      arr.push(op);
      map.set(op.driverId, arr);
    };

    (revenues ?? []).forEach((r: any) => {
      if (!isToday(r.date)) return;
      push({
        id: r.id, kind: "revenue", driverId: r.driverId,
        amount: String(r.amount ?? 0), date: r.date, createdAt: r.createdAt,
        label: r.clientName || r.description || "—",
      });
    });
    (expenses ?? []).forEach((e: any) => {
      if (!isToday(e.date)) return;
      push({
        id: e.id, kind: "expense", driverId: e.driverId,
        amount: String(e.amount ?? 0), date: e.date, createdAt: e.createdAt,
        label: e.type ? t(e.type as any) || String(e.type) : (e.notes || "—"),
      });
    });
    (transfers ?? []).forEach((tr: any) => {
      if (!isToday(tr.date)) return;
      push({
        id: tr.id, kind: "transfer", driverId: tr.driverId,
        amount: String(tr.amount ?? 0), date: tr.date, createdAt: tr.createdAt,
        label: tr.description || "—",
      });
    });

    // sort each driver's ops newest first
    map.forEach(arr => arr.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
    return map;
  }, [revenues, expenses, transfers, today, t]);

  const fmt = (n: number) => n.toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6" dir="auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full"><Activity className="h-6 w-6 text-primary" /></div>
          <div>
            <h2 className="text-2xl font-bold">{t("dailyOperations")}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3 animate-spin-slow" />
              {t("liveAutoRefresh")}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs font-mono">
          {format(new Date(), "EEE, dd MMM yyyy")}
        </Badge>
      </div>

      {driversLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : !drivers || drivers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
          <Truck className="h-10 w-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">{t("noOpsToday")}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {drivers.map(driver => {
            const ops = opsByDriver.get(driver.id) ?? [];
            const totRev = ops.filter(o => o.kind === "revenue").reduce((s, o) => s + Number(o.amount), 0);
            const totExp = ops.filter(o => o.kind === "expense").reduce((s, o) => s + Number(o.amount), 0);
            const totTrf = ops.filter(o => o.kind === "transfer").reduce((s, o) => s + Number(o.amount), 0);
            const hasOps = ops.length > 0;
            return (
              <Card key={driver.id} className={hasOps ? "border-primary/30" : "opacity-70"}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        {driver.name}
                      </CardTitle>
                      {driver.vehicleNumber && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("vehicle")}: <span className="font-mono">{driver.vehicleNumber}</span>
                        </p>
                      )}
                    </div>
                    <Badge variant={hasOps ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {ops.length} {t("opsCountToday")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {hasOps ? (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-md bg-green-500/10 p-2">
                          <p className="text-[10px] text-muted-foreground uppercase">{t("revenue")}</p>
                          <p className="text-sm font-bold text-green-700 font-mono">{fmt(totRev)}</p>
                        </div>
                        <div className="rounded-md bg-red-500/10 p-2">
                          <p className="text-[10px] text-muted-foreground uppercase">{t("expense")}</p>
                          <p className="text-sm font-bold text-red-700 font-mono">{fmt(totExp)}</p>
                        </div>
                        <div className="rounded-md bg-amber-500/10 p-2">
                          <p className="text-[10px] text-muted-foreground uppercase">{t("transfer")}</p>
                          <p className="text-sm font-bold text-amber-700 font-mono">{fmt(totTrf)}</p>
                        </div>
                      </div>
                      <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                        {ops.map(op => {
                          const Icon = op.kind === "revenue" ? TrendingUp : op.kind === "expense" ? TrendingDown : ArrowUpFromLine;
                          const color = op.kind === "revenue" ? "text-green-600" : op.kind === "expense" ? "text-red-600" : "text-amber-600";
                          return (
                            <li key={`${op.kind}-${op.id}`} className="flex items-center gap-2 text-xs border-b last:border-0 pb-1.5">
                              <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                              <span className="flex-1 truncate" title={op.label}>{op.label}</span>
                              <span className={`font-mono font-semibold ${color}`}>{fmt(Number(op.amount))}</span>
                              <span className="text-[10px] text-muted-foreground font-mono shrink-0 tabular-nums">
                                {format(new Date(op.createdAt), "HH:mm")}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">{t("driverHasNoOpsToday")}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
