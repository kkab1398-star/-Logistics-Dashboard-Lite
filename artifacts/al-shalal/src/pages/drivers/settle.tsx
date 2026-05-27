import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  useGetCycleSummary, getGetCycleSummaryQueryKey,
  useListSettlements, getListSettlementsQueryKey,
  useCreateSettlement,
  useListRevenues, getListRevenuesQueryKey,
  useListExpenses, getListExpensesQueryKey,
  useListTransfers, getListTransfersQueryKey,
  useListDrivers, getListDriversQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, ArrowUpFromLine, Scale, CheckCircle2, Receipt, Lock, Share2, Loader2, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { generateSettlementPdf, sharePdf, type SettlementReportData, type SettlementReportOp } from "@/lib/pdf/settlement-report";

interface SettlePageProps {
  driverId: number;
  driverName?: string;
}

export default function SettlePage({ driverId, driverName }: SettlePageProps) {
  const { t } = useI18n();
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = role === "admin";

  const { data: cycle, isLoading: cycleLoading } = useGetCycleSummary(
    { driverId },
    { query: { queryKey: getGetCycleSummaryQueryKey({ driverId }) } }
  );

  const { data: pastSettlements, isLoading: settlementsLoading } = useListSettlements(
    { driverId },
    { query: { queryKey: getListSettlementsQueryKey({ driverId }) } }
  );

  const { mutate: createSettlement, isPending } = useCreateSettlement();

  // Records lists for snapshotting at settle time (also useful for the cycle counts)
  const { data: cycleRevenues, isLoading: revLoading } = useListRevenues(
    { driverId, activeOnly: true },
    { query: { queryKey: getListRevenuesQueryKey({ driverId, activeOnly: true }) } }
  );
  const { data: cycleExpenses, isLoading: expLoading } = useListExpenses(
    { driverId, activeOnly: true },
    { query: { queryKey: getListExpensesQueryKey({ driverId, activeOnly: true }) } }
  );
  const { data: cycleTransfers, isLoading: trfLoading } = useListTransfers(
    { driverId, activeOnly: true },
    { query: { queryKey: getListTransfersQueryKey({ driverId, activeOnly: true }) } }
  );
  const recordsReady = !revLoading && !expLoading && !trfLoading;
  const { data: allDrivers } = useListDrivers(
    { query: { queryKey: getListDriversQueryKey() } }
  );
  const driverRecord = allDrivers?.find(d => d.id === driverId);

  const [pendingShare, setPendingShare] = useState<SettlementReportData | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const buildLabels = () => ({
    title: t("reportTitle"),
    establishmentName: "مؤسسة الشلال للنقل والرافعات الشوكية",
    establishmentLocation: t("invoiceHeader"),
    establishmentPhone: "+966 50 000 0000",
    driverName: t("driverName"),
    vehicle: t("vehicle"),
    cycleStart: t("cycleStart"),
    cycleEnd: t("cycleEnd"),
    generated: t("reportGenerated"),
    operationsTable: t("operationsTable"),
    time: t("time"),
    type: t("type"),
    details: t("details"),
    amount: t("amount"),
    totalRevenue: t("totalRevenue"),
    totalExpenses: t("totalExpenses"),
    totalTransfers: t("totalTransfers"),
    netProfit: t("netProfit"),
    driverShare: t("driverShare"),
    ownerPayout: t("ownerPayout"),
    paidAmount: t("paidAmount"),
    balance: t("balance"),
    sar: t("sar"),
    revenue: t("revenue"),
    expense: t("expense"),
    transfer: t("transfer"),
    signatureOwner: t("signatureOwner"),
    signatureDriver: t("signatureDriver"),
  });

  const hasDeferred = Number(cycle?.postponedBalance ?? 0) < 0;

  const handleSettle = () => {
    if (!recordsReady) {
      toast({ title: "Please wait", description: "Loading cycle records...", variant: "destructive" });
      return;
    }

    // BLOCK settlement when deferred amounts exist
    if (hasDeferred) {
      toast({
        title: t("settlementBlocked"),
        description: t("settleWithDeferredWarning"),
        variant: "destructive",
      });
      return;
    }

    // SNAPSHOT NOW — capture into a closure-frozen array before the mutation fires,
    // so cache invalidation / concurrent writes cannot affect what we report.
    const opsSnapshot: SettlementReportOp[] = [];
    (cycleRevenues ?? []).forEach((r) => opsSnapshot.push({
      id: r.id, kind: "revenue", amount: Number(r.amount ?? 0),
      date: r.date, createdAt: r.createdAt,
      label: (r as { clientName?: string | null }).clientName || r.description || null,
    }));
    (cycleExpenses ?? []).forEach((e) => opsSnapshot.push({
      id: e.id, kind: "expense", amount: Number(e.amount ?? 0),
      date: e.date, createdAt: e.createdAt,
      label: (e as { notes?: string | null }).notes || null,
      subtype: e.type ? ((t(e.type as keyof ReturnType<typeof buildLabels>) as string) || e.type) : null,
    }));
    (cycleTransfers ?? []).forEach((tr) => opsSnapshot.push({
      id: tr.id, kind: "transfer", amount: Number(tr.amount ?? 0),
      date: tr.date, createdAt: tr.createdAt,
      label: tr.description || null,
    }));
    opsSnapshot.sort((a, b) => {
      const aT = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
      const bT = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
      return aT - bT;
    });
    const driverNameSnap = driverRecord?.name || driverName || `Driver #${driverId}`;
    const driverVehicleSnap = driverRecord?.vehicleNumber || null;
    const driverPhoneSnap = driverRecord?.phone || null;
    const labels = buildLabels();

    createSettlement({ data: { driverId } }, {
      onSuccess: (settlement) => {
        const reportData: SettlementReportData = {
          settlementId: settlement.id,
          driverName: driverNameSnap,
          driverVehicle: driverVehicleSnap,
          driverPhone: driverPhoneSnap,
          periodStart: settlement.periodStart ?? "",
          periodEnd: settlement.periodEnd ?? "",
          generatedAt: new Date(),
          totalRevenue: Number(settlement.totalRevenue ?? 0),
          totalExpenses: Number(settlement.totalExpenses ?? 0),
          totalTransfers: Number(settlement.totalTransfers ?? 0),
          netProfit: Number(settlement.netProfit ?? 0),
          driverShare: Number(settlement.driverShare ?? 0),
          ownerPayout: Number(settlement.ownerPayout ?? 0),
          operations: opsSnapshot,
          labels,
        };
        setPendingShare(reportData);
        toast({ title: t("settlementConfirmed"), description: `${driverNameSnap} — ${t("currentCycle")}` });
        queryClient.invalidateQueries();
      },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  const handleShare = async () => {
    if (!pendingShare) return;
    setIsSharing(true);
    try {
      const blob = await generateSettlementPdf(pendingShare);
      const filename = `settlement-${pendingShare.driverName.replace(/\s+/g, "_")}-${pendingShare.settlementId}.pdf`;
      const waText = `${t("reportTitle")} — ${pendingShare.driverName} (${pendingShare.periodStart} → ${pendingShare.periodEnd})`;
      await sharePdf(blob, filename, waText);
      toast({ title: t("pdfReady") });
    } catch (err) {
      console.error("PDF generation failed", err);
      toast({ title: t("pdfFailed"), variant: "destructive" });
    } finally {
      setIsSharing(false);
    }
  };

  const fmt = (n: number | string | undefined | null) => Number(n || 0).toFixed(2);
  const fmtLocale = (n: number | string | undefined | null) =>
    Number(n || 0).toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const netPositive = Number(cycle?.netProfit ?? 0) >= 0;

  const totalSettledRevenue = pastSettlements
    ? pastSettlements.reduce((sum, s) => sum + Number(s.totalRevenue ?? 0), 0)
    : null;

  const totalSettledExpenses = pastSettlements
    ? pastSettlements.reduce((sum, s) => sum + Number(s.totalExpenses ?? 0), 0)
    : null;

  const totalSettledNetProfit = pastSettlements
    ? pastSettlements.reduce((sum, s) => sum + Number(s.netProfit ?? 0), 0)
    : null;

  const totalSettledTransfers = pastSettlements
    ? pastSettlements.reduce((sum, s) => sum + Number(s.totalTransfers ?? 0), 0)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-full"><Scale className="h-6 w-6 text-primary" /></div>
        <div>
          <h2 className="text-2xl font-bold">{t("currentCycle")}</h2>
          {driverName && <p className="text-muted-foreground text-sm">{driverName}</p>}
        </div>
      </div>

      {cycleLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : cycle ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">{t("totalRevenue")}</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{fmt(cycle.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">{t("sar")} · {cycle.revenueCount} {t("revenueCount")}</p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-muted-foreground">{t("grossRevenue")}</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{fmt(cycle.grossRevenue)}</p>
                <p className="text-xs text-muted-foreground">{t("sar")} · {t("allEntries")}</p>
              </CardContent>
            </Card>

            <Card className="bg-red-500/5 border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-muted-foreground">{t("totalExpenses")}</span>
                </div>
                <p className="text-2xl font-bold text-red-700">{fmt(cycle.totalExpenses)}</p>
                <p className="text-xs text-muted-foreground">{t("sar")} · {cycle.expenseCount} {t("expenseCount")}</p>
              </CardContent>
            </Card>

            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpFromLine className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-muted-foreground">{t("totalTransfers")}</span>
                </div>
                <p className="text-2xl font-bold text-amber-700">{fmt(cycle.totalTransfers)}</p>
                <p className="text-xs text-muted-foreground">{t("sar")} · {cycle.transferCount} {t("transferCount")}</p>
              </CardContent>
            </Card>

            <Card className={`border-2 ${Number(cycle.postponedBalance) < 0 ? "border-red-400 bg-red-50" : "bg-card border-border"}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`h-4 w-4 ${Number(cycle.postponedBalance) < 0 ? "text-red-600" : "text-muted-foreground"}`} />
                  <span className="text-sm text-muted-foreground">{t("postponedAmounts")}</span>
                </div>
                <p className={`text-2xl font-bold ${Number(cycle.postponedBalance) < 0 ? "text-red-700" : "text-muted-foreground"}`}>
                  {Number(cycle.postponedBalance) < 0 ? fmt(cycle.postponedBalance) : fmt(0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("sar")} · {cycle.deferredCount || 0} {t("revenues")}
                </p>
              </CardContent>
            </Card>
          </div>

          {hasDeferred && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3 text-red-800 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">{t("deficitWarning")}</p>
                <p className="text-xs text-red-600 mt-0.5">
                  {t("grossRevenue")}: {fmt(cycle.grossRevenue)} {t("sar")} &nbsp;|&nbsp;
                  {t("cashRevenue")}: {fmt(cycle.cashRevenue)} {t("sar")} &nbsp;|&nbsp;
                  {t("postponedAmounts")}: {fmt(cycle.postponedBalance)} {t("sar")}
                </p>
              </div>
            </div>
          )}

          {/* All-time breakdown: current cycle vs. past settled vs. all-time */}
          {!settlementsLoading && (() => {
            const cycleRevenue = Number(cycle.totalRevenue ?? 0);
            const cycleExpenses = Number(cycle.totalExpenses ?? 0);
            const cycleTransfers = Number(cycle.totalTransfers ?? 0);
            const cycleNet = Number(cycle.netProfit ?? 0);
            const allTimeRevenue = cycleRevenue + (totalSettledRevenue ?? 0);
            const allTimeExpenses = cycleExpenses + (totalSettledExpenses ?? 0);
            const allTimeTransfers = cycleTransfers + (totalSettledTransfers ?? 0);
            const allTimeNet = cycleNet + (totalSettledNetProfit ?? 0);
            const gridCols = "grid grid-cols-[1.3fr_1fr_1fr_1.05fr]";
            return (
              <div className="rounded-xl border bg-card overflow-hidden">
                {/* Column headers */}
                <div className={`${gridCols} px-3 py-1.5 bg-muted/30 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide`}>
                  <div />
                  <div className="text-center">{t("currentCycle")}</div>
                  <div className="text-center">{t("pastSettlements")}</div>
                  <div className="text-center text-foreground bg-primary/10 rounded-md py-0.5">{t("allTime")}</div>
                </div>

                {/* Revenue row */}
                <div className={`${gridCols} px-3 py-2 border-b items-center`}>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <TrendingUp className="h-3 w-3 text-green-600 shrink-0" />
                    <span className="truncate">{t("totalRevenue")}</span>
                  </div>
                  <div className="text-center text-[12px] font-bold text-green-700 font-mono">
                    {fmtLocale(cycleRevenue)}
                  </div>
                  <div className="text-center text-[12px] font-bold text-green-600/70 font-mono">
                    {totalSettledRevenue !== null ? fmtLocale(totalSettledRevenue) : "—"}
                  </div>
                  <div className="text-center text-[13px] font-extrabold text-green-800 font-mono bg-primary/5 rounded-md py-0.5">
                    {fmtLocale(allTimeRevenue)}
                  </div>
                </div>

                {/* Expenses row */}
                <div className={`${gridCols} px-3 py-2 border-b items-center`}>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <TrendingDown className="h-3 w-3 text-red-500 shrink-0" />
                    <span className="truncate">{t("totalExpenses")}</span>
                  </div>
                  <div className="text-center text-[12px] font-bold text-red-600 font-mono">
                    {fmtLocale(cycleExpenses)}
                  </div>
                  <div className="text-center text-[12px] font-bold text-red-400 font-mono">
                    {totalSettledExpenses !== null ? fmtLocale(totalSettledExpenses) : "—"}
                  </div>
                  <div className="text-center text-[13px] font-extrabold text-red-800 font-mono bg-primary/5 rounded-md py-0.5">
                    {fmtLocale(allTimeExpenses)}
                  </div>
                </div>

                {/* Transfers row */}
                <div className={`${gridCols} px-3 py-2 border-b items-center`}>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <ArrowUpFromLine className="h-3 w-3 text-amber-600 shrink-0" />
                    <span className="truncate">{t("totalTransfers")}</span>
                  </div>
                  <div className="text-center text-[12px] font-bold text-amber-700 font-mono">
                    {fmtLocale(cycleTransfers)}
                  </div>
                  <div className="text-center text-[12px] font-bold text-amber-500 font-mono">
                    {totalSettledTransfers !== null ? fmtLocale(totalSettledTransfers) : "—"}
                  </div>
                  <div className="text-center text-[13px] font-extrabold text-amber-800 font-mono bg-primary/5 rounded-md py-0.5">
                    {fmtLocale(allTimeTransfers)}
                  </div>
                </div>

                {/* Net profit row */}
                <div className={`${gridCols} px-3 py-2 items-center bg-primary/3`}>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
                    <Scale className="h-3 w-3 text-primary shrink-0" />
                    <span className="truncate">{t("netProfit")}</span>
                  </div>
                  <div className={`text-center text-[12px] font-bold font-mono ${cycleNet >= 0 ? "text-primary" : "text-destructive"}`}>
                    {fmtLocale(cycleNet)}
                  </div>
                  <div className="text-center text-[12px] font-bold text-blue-600 font-mono">
                    {totalSettledNetProfit !== null ? fmtLocale(totalSettledNetProfit) : "—"}
                  </div>
                  <div className={`text-center text-[13px] font-extrabold font-mono bg-primary/10 rounded-md py-0.5 ${allTimeNet >= 0 ? "text-primary" : "text-destructive"}`}>
                    {fmtLocale(allTimeNet)}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Settlement breakdown */}
          <Card className={`border-2 ${netPositive ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Scale className="h-5 w-5" />
                {t("settlementSummary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">{t("netProfit")}</span>
                <span className={`text-xl font-bold ${netPositive ? "text-primary" : "text-destructive"}`}>
                  {fmt(cycle.netProfit)} {t("sar")}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm">{t("driverShare")}</span>
                <Badge variant="secondary" className="text-base px-3 py-1">{fmt(cycle.driverShare)} {t("sar")}</Badge>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm">{t("ownerPayout")} = (Net÷2) − {t("totalTransfers")}</span>
                <Badge className="text-base px-3 py-1">{fmt(cycle.ownerPayout)} {t("sar")}</Badge>
              </div>

              {/* Share PDF button — visible immediately after a successful settlement */}
              {isAdmin && pendingShare && (
                <div className="mt-4 p-3 rounded-lg border-2 border-green-500/40 bg-green-500/5 space-y-2">
                  <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("settlementConfirmed")} · #{pendingShare.settlementId.toString().padStart(6, "0")}
                  </div>
                  <Button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
                    data-testid="button-share-settlement-pdf"
                  >
                    {isSharing ? (
                      <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("generatingPdf")}</>
                    ) : (
                      <><Share2 className="h-4 w-4 me-2" />{t("sharePdfReport")}</>
                    )}
                  </Button>
                </div>
              )}

              {/* ADMIN-ONLY settle button */}
              {isAdmin ? (
                (Number(cycle.revenueCount) > 0 || Number(cycle.expenseCount) > 0) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full mt-4 h-12 text-base" disabled={isPending}>
                        <CheckCircle2 className="h-5 w-5 me-2" />
                        {t("settle")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmSettlement")}</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-1 text-sm">
                          <span className="block">{t("netProfit")}: <strong>{fmt(cycle.netProfit)} {t("sar")}</strong></span>
                          <span className="block">{t("driverShare")}: <strong>{fmt(cycle.driverShare)} {t("sar")}</strong></span>
                          <span className="block">{t("ownerPayout")}: <strong>{fmt(cycle.ownerPayout)} {t("sar")}</strong></span>
                          {hasDeferred && (
                            <span className="block mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-800">
                              <span className="flex items-center gap-1.5 font-semibold">
                                <AlertTriangle className="h-4 w-4" />
                                {t("settlementBlocked")}
                              </span>
                              <span className="block mt-1 text-xs">
                                {t("settleDeferredCount")
                                  .replace("{count}", String(cycle.deferredCount))
                                  .replace("{total}", fmt(cycle.postponedBalance))}
                              </span>
                              <span className="block mt-1 text-[10px] font-semibold uppercase tracking-wide">
                                {t("settlementCannotProceed")}
                              </span>
                            </span>
                          )}
                          {!hasDeferred && (
                            <span className="block mt-2 text-xs text-muted-foreground">
                              All revenue, expenses and transfers for this cycle will be archived with a timestamp.
                              Dashboard counters will reset to zero.
                            </span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleSettle}
                          disabled={!recordsReady || isPending || hasDeferred}
                          className={hasDeferred ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          {hasDeferred ? t("settlementBlocked") : t("confirm")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )
              ) : (
                <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 shrink-0" />
                  {t("adminOnlySettle")}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Settlement history */}
      <div>
        <h3 className="font-semibold text-lg mb-3">{t("settlementHistory")}</h3>
        {settlementsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : pastSettlements && pastSettlements.length > 0 ? (
          <div className="space-y-3">
            {[...pastSettlements].reverse().map(s => (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("period")}: {s.periodStart && format(new Date(s.periodStart), "MMM d")} — {s.periodEnd && format(new Date(s.periodEnd), "MMM d, yyyy")}
                      </p>
                      <p className="text-sm mt-1">
                        {t("netProfit")}: <span className="font-semibold">{fmt(s.netProfit)} {t("sar")}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("driverShare")}: {fmt(s.driverShare)} · {t("ownerPayout")}: {fmt(s.ownerPayout)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("totalRevenue")}: {fmt(s.totalRevenue)} · {t("totalExpenses")}: {fmt(s.totalExpenses)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {format(new Date(s.createdAt), "dd/MM/yyyy HH:mm")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
            <Receipt className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">{t("noSettlements")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
