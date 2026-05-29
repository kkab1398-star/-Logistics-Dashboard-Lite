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
  TrendingUp, TrendingDown, ArrowUpFromLine, Scale, CheckCircle2, Receipt, Lock, Share2, Loader2, AlertTriangle, Coins, History, Calendar, Landmark
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { generateSettlementPdf, sharePdf, type SettlementReportData, type SettlementReportOp } from "@/lib/pdf/settlement-report";

interface SettlePageProps {
  driverId: number;
  driverName?: string;
}

export default function SettlePage({ driverId, driverName }: SettlePageProps) {
  const { t, lang } = useI18n();
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = role === "admin";
  const isRtl = lang === "ar" || lang === "ur";

  const { data: cycle, isLoading: cycleLoading } = useGetCycleSummary(
    { driverId },
    { query: { queryKey: getGetCycleSummaryQueryKey({ driverId }) } }
  );

  const { data: pastSettlements, isLoading: settlementsLoading } = useListSettlements(
    { driverId },
    { query: { queryKey: getListSettlementsQueryKey({ driverId }) } }
  );

  const { mutate: createSettlement, isPending } = useCreateSettlement();

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
  const [forceProceedDeferred, setForceProceedDeferred] = useState(false);

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
      toast({ title: "الرجاء الانتظار", description: "جاري تحميل سجلات الدورة الحالية...", variant: "destructive" });
      return;
    }

    if (hasDeferred && !forceProceedDeferred) {
      toast({
        title: "تنبيه المبالغ المؤجلة",
        description: "يوجد عجز مالي معلق مع السائق. يرجى مراجعة تفاصيل الترحيل أدناه.",
        variant: "destructive",
      });
      return;
    }

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
    const driverNameSnap = driverRecord?.name || driverName || `سائق #${driverId}`;
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
        toast({ title: t("settlementConfirmed"), description: `${driverNameSnap} — تم ترحيل وإغلاق الدورة الموعودة.` });
        queryClient.invalidateQueries();
      },
      onError: () => toast({ title: "فشلت عملية الحفظ", variant: "destructive" }),
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
    <div className={`space-y-8 animate-in fade-in duration-500 pb-12 ${isRtl ? "font-arabic" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Upper header block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-xl shadow-slate-900/10">
            <Scale className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t("currentCycle")}</h2>
            {driverName && <p className="text-slate-500 text-xs font-medium mt-1">المحاسبة وتصفية العهد والوقود لـ: <span className="text-blue-600 font-black">{driverName}</span></p>}
          </div>
        </div>
        {hasDeferred && (
          <Badge className="bg-red-500 text-white rounded-xl text-[10px] font-black px-3 py-1.5 shadow-lg shadow-red-500/20 gap-2 animate-pulse">
            <AlertTriangle className="h-4 w-4" /> يشتمل على مبالغ مؤجلة (عجز)
          </Badge>
        )}
      </div>

      {cycleLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {[0,1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      ) : cycle ? (
        <>
          {/* Summary Dash Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden relative group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("totalRevenue")}</span>
                  <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600"><TrendingUp className="h-4 w-4" /></div>
                </div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{fmt(cycle.totalRevenue)}</p>
                <Badge className="bg-emerald-50 text-emerald-700 font-black text-[9px] mt-2 border-none rounded-md px-1.5 py-0.5">{cycle.revenueCount} عمليات سداد</Badge>
              </CardContent>
            </Card>

            <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden relative group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("grossRevenue")}</span>
                  <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><Coins className="h-4 w-4" /></div>
                </div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{fmt(cycle.grossRevenue)}</p>
                <p className="text-[9px] font-bold text-slate-400 mt-2.5">شامل الكاش والآجل (ريال)</p>
              </CardContent>
            </Card>

            <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden relative group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("totalExpenses")}</span>
                  <div className="bg-red-50 p-2 rounded-xl text-red-600"><TrendingDown className="h-4 w-4" /></div>
                </div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{fmt(cycle.totalExpenses)}</p>
                <Badge className="bg-red-50 text-red-600 font-black text-[9px] mt-2 border-none rounded-md px-1.5 py-0.5">{cycle.expenseCount} فواتير تشغيل</Badge>
              </CardContent>
            </Card>

            <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden relative group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("totalTransfers")}</span>
                  <div className="bg-amber-50 p-2 rounded-xl text-amber-600"><ArrowUpFromLine className="h-4 w-4" /></div>
                </div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{fmt(cycle.totalTransfers)}</p>
                <Badge className="bg-amber-50 text-amber-700 font-black text-[9px] mt-2 border-none rounded-md px-1.5 py-0.5">{cycle.transferCount} عهد مقبوضة</Badge>
              </CardContent>
            </Card>

            <Card className={`border-none shadow-xl rounded-2xl overflow-hidden relative transition-all ${hasDeferred ? "bg-red-950 text-white shadow-red-950/20" : "bg-white shadow-slate-200/40"}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${hasDeferred ? "text-red-300" : "text-slate-400"}`}>{t("postponedAmounts")}</span>
                  <div className={`p-2 rounded-xl ${hasDeferred ? "bg-white/10 text-red-400" : "bg-slate-50 text-slate-500"}`}><AlertTriangle className="h-4 w-4" /></div>
                </div>
                <p className={`text-2xl font-black tracking-tight ${hasDeferred ? "text-red-400" : "text-slate-900"}`}>
                  {hasDeferred ? fmt(Math.abs(Number(cycle.postponedBalance))) : fmt(0)}
                </p>
                <p className={`text-[9px] font-bold mt-2.5 ${hasDeferred ? "text-white/60" : "text-slate-400"}`}>
                  {cycle.deferredCount || 0} فواتير آجلة قيد التحصيل
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Warning Bypass Card */}
          {hasDeferred && (
            <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-red-900 text-sm shadow-inner animate-in fade-in zoom-in-95">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-red-950 text-sm">{t("deficitWarning")}</p>
                  <p className="text-xs font-medium text-red-700/90 mt-1">
                    {t("grossRevenue")}: <span className="font-bold">{fmt(cycle.grossRevenue)}</span> ريال &nbsp;·&nbsp;
                    {t("cashRevenue")}: <span className="font-bold">{fmt(cycle.cashRevenue)}</span> ريال &nbsp;·&nbsp;
                    العجز المستهدف للترحيل: <span className="font-black text-red-600">{fmt(cycle.postponedBalance)}</span> ريال
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-red-100 shadow-sm self-end md:self-center">
                <input 
                  type="checkbox" 
                  id="bypass-deferred" 
                  checked={forceProceedDeferred} 
                  onChange={(e) => setForceProceedDeferred(e.target.checked)}
                  className="h-4 w-4 accent-red-600 rounded cursor-pointer"
                />
                <label htmlFor="bypass-deferred" className="text-xs font-black text-red-950 cursor-pointer select-none">الموافقة على ترحيل العجز للمستند القادم</label>
              </div>
            </div>
          )}

          {/* Matrix Breakdown Matrix */}
          {!settlementsLoading && (() => {
            const cycleRevenue = Number(cycle.totalRevenue ?? 0);
            const cycleExpenses = Number(cycle.totalExpenses ?? 0);
            const cycleTransfers = Number(cycle.totalTransfers ?? 0);
            const cycleNet = Number(cycle.netProfit ?? 0);
            const allTimeRevenue = cycleRevenue + (totalSettledRevenue ?? 0);
            const allTimeExpenses = cycleExpenses + (totalSettledExpenses ?? 0);
            const allTimeTransfers = cycleTransfers + (totalSettledTransfers ?? 0);
            const allTimeNet = cycleNet + (totalSettledNetProfit ?? 0);
            const gridCols = "grid grid-cols-[1.5fr_1fr_1fr_1.2fr]";
            return (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2 bg-slate-50/50">
                  <History className="h-4 w-4 text-slate-400" />
                  <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">المقارنة التراكمية للحساب التشغيلي</h4>
                </div>
                <div className={`${gridCols} px-6 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest`}>
                  <div />
                  <div className="text-center">{t("currentCycle")}</div>
                  <div className="text-center">{t("pastSettlements")}</div>
                  <div className="text-center text-slate-900 bg-slate-200/60 rounded-md py-0.5">{t("allTime")}</div>
                </div>

                <div className={`${gridCols} px-6 py-3 border-b border-slate-50 items-center hover:bg-slate-50/50 transition-colors`}>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{t("totalRevenue")}</span>
                  </div>
                  <div className="text-center text-xs font-black text-emerald-600 font-mono">{fmtLocale(cycleRevenue)}</div>
                  <div className="text-center text-xs font-medium text-slate-400 font-mono">{totalSettledRevenue !== null ? fmtLocale(totalSettledRevenue) : "—"}</div>
                  <div className="text-center text-sm font-black text-slate-900 font-mono bg-slate-50 rounded-lg py-1">{fmtLocale(allTimeRevenue)}</div>
                </div>

                <div className={`${gridCols} px-6 py-3 border-b border-slate-50 items-center hover:bg-slate-50/50 transition-colors`}>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span className="truncate">{t("totalExpenses")}</span>
                  </div>
                  <div className="text-center text-xs font-black text-red-600 font-mono">{fmtLocale(cycleExpenses)}</div>
                  <div className="text-center text-xs font-medium text-slate-400 font-mono">{totalSettledExpenses !== null ? fmtLocale(totalSettledExpenses) : "—"}</div>
                  <div className="text-center text-sm font-black text-slate-900 font-mono bg-slate-50 rounded-lg py-1">{fmtLocale(allTimeExpenses)}</div>
                </div>

                <div className={`${gridCols} px-6 py-3 border-b border-slate-50 items-center hover:bg-slate-50/50 transition-colors`}>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <ArrowUpFromLine className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{t("totalTransfers")}</span>
                  </div>
                  <div className="text-center text-xs font-black text-amber-600 font-mono">{fmtLocale(cycleTransfers)}</div>
                  <div className="text-center text-xs font-medium text-slate-400 font-mono">{totalSettledTransfers !== null ? fmtLocale(totalSettledTransfers) : "—"}</div>
                  <div className="text-center text-sm font-black text-slate-900 font-mono bg-slate-50 rounded-lg py-1">{fmtLocale(allTimeTransfers)}</div>
                </div>

                <div className={`${gridCols} px-6 py-4 items-center bg-slate-900 text-white`}>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                    <Landmark className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="truncate">{t("netProfit")}</span>
                  </div>
                  <div className={`text-center text-xs font-black font-mono ${cycleNet >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtLocale(cycleNet)}</div>
                  <div className="text-center text-xs font-medium text-slate-500 font-mono">{totalSettledNetProfit !== null ? fmtLocale(totalSettledNetProfit) : "—"}</div>
                  <div className={`text-center text-sm font-black font-mono bg-white/10 rounded-lg py-1 ${allTimeNet >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtLocale(allTimeNet)}</div>
                </div>
              </div>
            );
          })()}

          {/* Main Settlement Summary Ledger */}
          <Card className={`border-none shadow-xl rounded-3xl overflow-hidden bg-white`}>
            <CardHeader className="pb-4 border-b border-slate-50 p-6">
              <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-slate-900">
                <Scale className="h-4 w-4 text-slate-400" />
                ملخص تصفية الدورة المعتمد
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-50">
                <span className="text-sm font-black text-slate-800">{t("netProfit")}</span>
                <span className={`text-2xl font-black font-mono ${netPositive ? "text-emerald-600" : "text-red-600"}`}>
                  {fmt(cycle.netProfit)} <span className="text-xs font-bold text-slate-400">ريال</span>
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-50/50">
                <span className="text-xs font-bold text-slate-500">{t("driverShare")}</span>
                <Badge className="text-xs font-black bg-slate-100 text-slate-800 rounded-lg px-3 py-1 font-mono">{fmt(cycle.driverShare)} ريال</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-bold text-slate-500">{t("ownerPayout")} <span className="text-[10px] font-medium text-slate-400">(الصافي ÷ 2) − العهد المقبوضة</span></span>
                <Badge className="text-xs font-black bg-blue-600 text-white rounded-lg px-3 py-1 font-mono shadow-md shadow-blue-600/10">{fmt(cycle.ownerPayout)} ريال</Badge>
              </div>

              {isAdmin && pendingShare && (
                <div className="mt-6 p-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 space-y-4 animate-in zoom-in-95">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-black">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {t("settlementConfirmed")} · الرقم المرجعي المالي: #{pendingShare.settlementId.toString().padStart(5, "0")}
                  </div>
                  <Button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    data-testid="button-share-settlement-pdf"
                  >
                    {isSharing ? (
                      <><Loader2 className="h-4 w-4 me-2 animate-spin" /> جاري طباعة وتصدير المستند...</>
                    ) : (
                      <><Share2 className="h-4 w-4 me-2" /> مشاركة وتصدير التقرير المالي (PDF)</>
                    )}
                  </Button>
                </div>
              )}

              {/* Action Trigger Block */}
              {isAdmin ? (
                (Number(cycle.revenueCount) > 0 || Number(cycle.expenseCount) > 0) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full mt-4 h-14 bg-slate-950 hover:bg-slate-900 font-black text-sm rounded-2xl shadow-xl shadow-slate-950/10 text-white transition-all active:scale-[0.99]" disabled={isPending}>
                        <CheckCircle2 className="h-4 w-4 me-2" />
                        اعتماد وإغلاق الدورة المالية الحالية
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[28px] border-none shadow-2xl p-6">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black text-slate-900">هل أنت متأكد من تثبيت وإغلاق الحساب؟</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3 text-slate-600 pt-4">
                          <span className="block border-b pb-2 text-xs font-bold text-slate-700">صافي أرباح الدورة: <strong className="text-slate-950 font-black">{fmt(cycle.netProfit)} ريال</strong></span>
                          <span className="block border-b pb-2 text-xs font-bold text-slate-700">مستحق السائق الحالي: <strong className="text-slate-950 font-black">{fmt(cycle.driverShare)} ريال</strong></span>
                          <span className="block border-b pb-2 text-xs font-bold text-slate-700">صـافي حصـة المـالك: <strong className="text-slate-950 font-black">{fmt(cycle.ownerPayout)} ريال</strong></span>
                          
                          {hasDeferred && (
                            <span className="block mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-red-950">
                              <span className="flex items-center gap-1.5 font-black text-xs text-red-900">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                تنبيه بترحيل الديون المؤجلة
                              </span>
                              <span className="block mt-1.5 text-[11px] font-medium leading-relaxed">
                                {t("settleDeferredCount")
                                  .replace("{count}", String(cycle.deferredCount))
                                  .replace("{total}", fmt(cycle.postponedBalance))}
                              </span>
                              <span className="block mt-2 text-[9px] font-black uppercase tracking-widest text-red-700 bg-red-100 w-fit px-2 py-0.5 rounded-md">
                                سيتم تدوير العجز آلياً لبداية الدورة التشغيلية القادمة
                              </span>
                            </span>
                          )}
                          
                          <span className="block mt-4 text-[11px] text-slate-400 font-medium leading-relaxed">
                            بمجرد الضغط على تأكيد، سيتم أرشفة الفواتير الحالية نهائياً وتصفير العدادات التراكمية في شاشات السائقين لبدء دورة عمل جديدة.
                          </span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2 pt-4">
                        <AlertDialogCancel className="rounded-xl font-bold border-slate-200">{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleSettle}
                          disabled={!recordsReady || isPending || (hasDeferred && !forceProceedDeferred)}
                          className={`rounded-xl font-black ${hasDeferred && !forceProceedDeferred ? "bg-slate-200 text-slate-400 cursor-not-allowed border-none" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                        >
                          {hasDeferred && !forceProceedDeferred ? "يرجى الموافقة على الترحيل أولاً" : t("confirm")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )
              ) : (
                <div className="flex items-center gap-2.5 mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs font-black text-slate-400">
                  <Lock className="h-4 w-4 shrink-0" />
                  {t("adminOnlySettle")}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* History Log Feed */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Calendar className="h-4 w-4 text-slate-400" />
          <h3 className="font-black text-slate-900 text-lg tracking-tight">{t("settlementHistory")}</h3>
        </div>
        
        {settlementsLoading ? (
          <Skeleton className="h-28 w-full rounded-2xl" />
        ) : pastSettlements && pastSettlements.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {[...pastSettlements].reverse().map(s => (
              <Card key={s.id} className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden hover:scale-[1.01] transition-transform duration-300">
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">فترة التقرير المؤرشف</p>
                      <p className="text-xs font-black text-slate-700 mt-1.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 w-fit">
                        {s.periodStart && format(new Date(s.periodStart), "MMM d")} — {s.periodEnd && format(new Date(s.periodEnd), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-mono font-bold text-slate-400 shrink-0 bg-slate-50 border-slate-200 rounded-lg">
                      {format(new Date(s.createdAt), "dd/MM/yyyy HH:mm")}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100/60">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t("netProfit")}</p>
                      <p className="text-base font-black text-slate-900 font-mono mt-0.5">{fmt(s.netProfit)} ريال</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t("driverShare")}</p>
                      <p className="text-base font-black text-blue-600 font-mono mt-0.5">{fmt(s.driverShare)} ريال</p>
                    </div>
                  </div>
                  
                  <div className="text-[10px] font-bold text-slate-400 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100/50 flex justify-between font-mono">
                    <span>إيراد الدورة: {fmt(s.totalRevenue)}</span>
                    <span>تكاليفها: {fmt(s.totalExpenses)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-300 border-2 border-dashed border-slate-100 rounded-[32px] bg-white/50">
            <Receipt className="h-14 w-14 mx-auto mb-3 opacity-10 text-slate-900" />
            <p className="text-sm font-black uppercase tracking-widest">{t("noSettlements")}</p>
          </div>
        )}
      </div>
    </div>
  );
}