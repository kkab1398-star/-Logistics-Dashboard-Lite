import { useState, useEffect, useRef, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Archive, Receipt, TrendingDown, TrendingUp, DollarSign, Download, FileDown, Filter, ChevronDown, ChevronUp, User, Search } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import {
  BUSINESS_NAME_EN, BUSINESS_NAME_AR,
  BUSINESS_ADDRESS_EN, BUSINESS_ADDRESS_AR,
  BUSINESS_EMAIL, BUSINESS_PHONES,
  getBusinessConfig,
} from "@/lib/business-config";

interface ArchiveEntry {
  id: number;
  driverId: number;
  driverName: string;
  vehicleNumber: string;
  totalRevenue: string;
  totalExpenses: string;
  netProfit: string;
  driverShare: string;
  ownerPayout: string;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}

interface Operations {
  settlement: ArchiveEntry & { periodStart: string | null; periodEnd: string | null } | null;
  revenues: Array<{ id: number; amount: string; clientName?: string | null; description?: string | null; date: string }>;
  expenses: Array<{ id: number; type: string; amount: string; notes?: string | null; date: string }>;
  transfers: Array<{ id: number; amount: string; description?: string | null; date: string }>;
}

interface Driver {
  id: number;
  name: string;
  vehicleNumber: string;
}

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function buildMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = format(d, "MMMM yyyy");
    options.push({ value, label });
  }
  return options;
}

function downloadSettlementPdf(entry: ArchiveEntry) {
  const cfg = getBusinessConfig();
  const phones = BUSINESS_PHONES.slice(0, 3).join(" | ");
  const settleDate = format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm");
  const period = entry.periodStart && entry.periodEnd
    ? `${format(new Date(entry.periodStart), "d/M/yyyy")} — ${format(new Date(entry.periodEnd), "d/M/yyyy")}`
    : settleDate;

  const fmt = (n: string | number) => Number(n).toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<title>تسوية #${entry.id}</title>
<style>
  @media print { @page { margin: 15mm; } }
  body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; color: #1a3358; direction: rtl; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #c9a227; padding-bottom: 16px; margin-bottom: 20px; }
  .logo-block h1 { font-size: 24px; font-weight: 900; color: #1a3358; margin: 0 0 4px; }
  .logo-block h2 { font-size: 12px; color: #c9a227; margin: 0; font-weight: 700; }
  .logo-block p { font-size: 11px; color: #666; margin: 2px 0 0; }
  .settle-label { background: #1a3358; color: #c9a227; padding: 6px 14px; border-radius: 6px; font-size: 14px; font-weight: 800; direction: ltr; }
  .info-box { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; }
  .info-box div { font-size: 13px; }
  .info-box .label { font-size: 11px; color: #888; margin-bottom: 3px; }
  .info-box .value { font-weight: 700; color: #1a3358; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1a3358; color: #c9a227; font-size: 12px; padding: 10px 14px; text-align: right; }
  td { padding: 11px 14px; font-size: 13px; border-bottom: 1px solid #eee; }
  .rev { color: #166534; font-weight: 700; }
  .exp { color: #991b1b; font-weight: 700; }
  .net { color: #1e40af; font-weight: 700; }
  .share-row td { background: #fffbf0; font-weight: 800; font-size: 15px; border-top: 2px solid #c9a227; }
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
  </div>
  <div class="settle-label">وثيقة التسوية #${entry.id}</div>
</div>

<div class="info-box">
  <div>
    <div class="label">السائق / Driver</div>
    <div class="value">${entry.driverName}</div>
    <div style="font-size:12px; color:#666; margin-top:3px;">${entry.vehicleNumber}</div>
  </div>
  <div style="text-align:left; direction:ltr;">
    <div class="label">الفترة / Period</div>
    <div class="value" style="font-size:13px;">${period}</div>
    <div style="font-size:11px; color:#888; margin-top:3px;">تاريخ التسوية: ${settleDate}</div>
  </div>
</div>

<table>
  <thead><tr><th>البند</th><th style="text-align:left; direction:ltr;">المبلغ (ريال)</th></tr></thead>
  <tbody>
    <tr><td>إجمالي الإيرادات / Total Revenue</td><td class="rev" style="direction:ltr;">${fmt(entry.totalRevenue)}</td></tr>
    <tr><td>إجمالي المصروفات / Total Expenses</td><td class="exp" style="direction:ltr;">( ${fmt(entry.totalExpenses)} )</td></tr>
    <tr><td>صافي الربح / Net Profit</td><td class="net" style="direction:ltr;">${fmt(entry.netProfit)}</td></tr>
    <tr class="share-row">
      <td>حصة السائق (50%) / Driver Share</td>
      <td style="direction:ltr; color:#166534;">${fmt(entry.driverShare)}</td>
    </tr>
    <tr class="share-row">
      <td>مستحقات المالك / Owner Payout</td>
      <td style="direction:ltr; color:#1e40af;">${fmt(entry.ownerPayout)}</td>
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

async function exportOperationsPdf(entry: ArchiveEntry) {
  const cfg = getBusinessConfig();
  const phones = BUSINESS_PHONES.slice(0, 3).join(" | ");
  const settleDate = format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm");
  const period = entry.periodStart && entry.periodEnd
    ? `${format(new Date(entry.periodStart), "d/M/yyyy")} — ${format(new Date(entry.periodEnd), "d/M/yyyy")}`
    : settleDate;

  const fmt = (n: string | number) => Number(n).toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const res = await fetch(`${BASE_URL}/api/admin/archive/${entry.id}/operations`);
  if (!res.ok) return;
  const ops: Operations = await res.json();

  const revenueRows = ops.revenues.map(r =>
    `<tr><td>${format(new Date(r.date), "d/M/yyyy")}</td><td>${r.clientName || "—"}</td><td>${r.description || "—"}</td><td class="rev" dir="ltr">${fmt(r.amount)}</td></tr>`
  ).join("");

  const expenseRows = ops.expenses.map(e =>
    `<tr><td>${format(new Date(e.date), "d/M/yyyy")}</td><td>${e.type}</td><td>${e.notes || "—"}</td><td class="exp" dir="ltr">(${fmt(e.amount)})</td></tr>`
  ).join("");

  const transferRows = ops.transfers.map(tr =>
    `<tr><td>${format(new Date(tr.date), "d/M/yyyy")}</td><td colspan="2">${tr.description || "تحويل إلى المالك"}</td><td class="net" dir="ltr">${fmt(tr.amount)}</td></tr>`
  ).join("");

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<title>تقرير تفصيلي #${entry.id}</title>
<style>
  @media print { @page { margin: 12mm; size: A4; } }
  body { font-family: Arial, sans-serif; margin: 0; padding: 16px; color: #1a3358; direction: rtl; font-size: 13px; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #c9a227; padding-bottom: 14px; margin-bottom: 18px; }
  .logo-block h1 { font-size: 22px; font-weight: 900; color: #1a3358; margin: 0 0 3px; }
  .logo-block h2 { font-size: 11px; color: #c9a227; margin: 0; font-weight: 700; }
  .settle-label { background: #1a3358; color: #c9a227; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 800; }
  .info-box { background: #f8f9fa; border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; }
  .label { font-size: 10px; color: #888; margin-bottom: 2px; }
  .value { font-weight: 700; color: #1a3358; }
  h3 { font-size: 14px; color: #1a3358; border-bottom: 2px solid #eee; padding-bottom: 6px; margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #1a3358; color: #c9a227; font-size: 11px; padding: 8px 12px; text-align: right; }
  td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
  .rev { color: #166534; font-weight: 700; }
  .exp { color: #991b1b; font-weight: 700; }
  .net { color: #1e40af; font-weight: 700; }
  .summary-row td { background: #fffbf0; font-weight: 800; border-top: 2px solid #c9a227; }
  .footer { text-align: center; border-top: 1px solid #eee; padding-top: 10px; font-size: 10px; color: #888; margin-top: 16px; }
  .footer strong { color: #1a3358; }
  .no-data { color: #aaa; font-style: italic; font-size: 12px; padding: 8px 12px; }
</style>
</head>
<body>
<div class="header">
  <div class="logo-block">
    <h1>${BUSINESS_NAME_AR}</h1>
    <h2>${BUSINESS_NAME_EN}</h2>
  </div>
  <div class="settle-label">التقرير التفصيلي — تسوية #${entry.id}</div>
</div>

<div class="info-box">
  <div>
    <div class="label">السائق / Driver</div>
    <div class="value">${entry.driverName}</div>
    <div style="font-size:11px; color:#666; margin-top:2px;">${entry.vehicleNumber}</div>
  </div>
  <div style="text-align:left; direction:ltr;">
    <div class="label">الفترة / Period</div>
    <div class="value" style="font-size:12px;">${period}</div>
    <div style="font-size:10px; color:#888; margin-top:2px;">تسوية: ${settleDate}</div>
  </div>
</div>

<h3>الإيرادات / Revenues (${ops.revenues.length})</h3>
<table>
  <thead><tr><th>التاريخ</th><th>العميل</th><th>الوصف</th><th>المبلغ (ريال)</th></tr></thead>
  <tbody>
    ${revenueRows || `<tr><td colspan="4" class="no-data">لا توجد إيرادات</td></tr>`}
    <tr class="summary-row"><td colspan="3">الإجمالي</td><td class="rev" dir="ltr">${fmt(entry.totalRevenue)}</td></tr>
  </tbody>
</table>

<h3>المصروفات / Expenses (${ops.expenses.length})</h3>
<table>
  <thead><tr><th>التاريخ</th><th>النوع</th><th>ملاحظات</th><th>المبلغ (ريال)</th></tr></thead>
  <tbody>
    ${expenseRows || `<tr><td colspan="4" class="no-data">لا توجد مصروفات</td></tr>`}
    <tr class="summary-row"><td colspan="3">الإجمالي</td><td class="exp" dir="ltr">(${fmt(entry.totalExpenses)})</td></tr>
  </tbody>
</table>

${ops.transfers.length > 0 ? `
<h3>التحويلات للمالك / Owner Transfers (${ops.transfers.length})</h3>
<table>
  <thead><tr><th>التاريخ</th><th colspan="2">الوصف</th><th>المبلغ (ريال)</th></tr></thead>
  <tbody>
    ${transferRows}
  </tbody>
</table>
` : ""}

<table>
  <tbody>
    <tr class="summary-row"><td>صافي الربح / Net Profit</td><td class="net" dir="ltr">${fmt(entry.netProfit)}</td></tr>
    <tr class="summary-row"><td>حصة السائق / Driver Share</td><td class="rev" dir="ltr">${fmt(entry.driverShare)}</td></tr>
    <tr class="summary-row"><td>مستحقات المالك / Owner Payout</td><td class="net" dir="ltr">${fmt(entry.ownerPayout)}</td></tr>
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

function SettlementRevenueDetails({ entryId, fmt, highlightClient }: { entryId: number; fmt: (n: string | number) => string; highlightClient?: string }) {
  const { t } = useI18n();
  const { data: ops, isLoading } = useQuery<Operations>({
    queryKey: ["settlement-ops", entryId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/archive/${entryId}/operations`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="px-4 py-3 border-t space-y-2">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-8 w-full rounded" />)}
      </div>
    );
  }

  if (!ops || ops.revenues.length === 0) {
    return (
      <div className="px-4 py-3 border-t text-xs text-muted-foreground italic">
        {t("noRevenues")}
      </div>
    );
  }

  const searchTerm = highlightClient?.trim().toLowerCase() ?? "";

  return (
    <div className="border-t bg-green-500/3">
      <div className="px-4 pt-2 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-green-700 mb-2">
          {t("revenueCount")} ({ops.revenues.length})
        </p>
        <div className="space-y-1.5">
          {ops.revenues.map(r => {
            const isMatch = !!searchTerm && !!r.clientName?.toLowerCase().includes(searchTerm);
            return (
              <div
                key={r.id}
                className={`flex items-center justify-between gap-3 py-1.5 px-2 rounded-md border transition-colors ${
                  isMatch
                    ? "bg-amber-50 border-amber-300 ring-1 ring-amber-300/70"
                    : "bg-green-50/60 border-green-100"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className={`h-3 w-3 shrink-0 ${isMatch ? "text-amber-600" : "text-green-600"}`} />
                  <span className={`text-xs font-medium truncate ${isMatch ? "text-amber-900 font-bold" : "text-green-800"}`}>
                    {r.clientName || <span className="text-muted-foreground italic font-normal">{t("noClient")}</span>}
                  </span>
                  {isMatch && (
                    <span className="text-[9px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                      {t("matched") || "✓"}
                    </span>
                  )}
                  {r.description && (
                    <span className="text-[10px] text-muted-foreground truncate hidden sm:block">
                      — {r.description}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {format(new Date(r.date), "d/M/yy")}
                  </span>
                  <span className={`text-xs font-bold font-mono ${isMatch ? "text-amber-700" : "text-green-700"}`}>
                    {fmt(r.amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ArchivePage() {
  const { t } = useI18n();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const params = new URLSearchParams(search);
  const selectedDriverId = params.get("driverId") || "";
  const selectedMonth = params.get("month") || "";
  const selectedClientName = params.get("clientName") || "";

  const [clientNameInput, setClientNameInput] = useState(selectedClientName);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setClientNameInput(selectedClientName);
  }, [selectedClientName]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(search);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setLocation(`/archive?${next.toString()}`);
  }

  function handleClientNameChange(value: string) {
    setClientNameInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParam("clientName", value.trim());
    }, 400);
  }

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["drivers-list"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/drivers`);
      if (!res.ok) throw new Error("Failed to fetch drivers");
      return res.json();
    },
  });

  const { data: knownClients } = useQuery<{ clientName: string }[]>({
    queryKey: ["stats-clients-names"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/stats/clients`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60_000,
    select: (rows) => rows.filter(r => r.clientName !== "Unknown"),
  });

  const archiveUrl = (() => {
    const p = new URLSearchParams();
    if (selectedDriverId) p.set("driverId", selectedDriverId);
    if (selectedMonth) p.set("month", selectedMonth);
    if (selectedClientName) p.set("clientName", selectedClientName);
    const qs = p.toString();
    return `${BASE_URL}/api/admin/archive${qs ? `?${qs}` : ""}`;
  })();

  const { data, isLoading } = useQuery<ArchiveEntry[]>({
    queryKey: ["admin-archive", selectedDriverId, selectedMonth, selectedClientName],
    queryFn: async () => {
      const res = await fetch(archiveUrl);
      if (!res.ok) throw new Error("Failed to fetch archive");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  // Track the filter value for which we last triggered auto-expansion.
  // This prevents re-opening manually collapsed cards on polling refetches.
  const lastAutoExpandedFilterRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedClientName) {
      if (selectedClientName !== lastAutoExpandedFilterRef.current) {
        // Filter changed to a new value — attempt auto-expand.
        // Only commit the ref when data is actually available so that if data
        // arrives after the filter is set, the next effect run still auto-expands.
        if (data && data.length > 0) {
          lastAutoExpandedFilterRef.current = selectedClientName;
          setExpandedIds(new Set(data.map(e => e.id)));
        }
      }
      // If filter unchanged but data re-fetched (polling), preserve user toggles.
    } else {
      lastAutoExpandedFilterRef.current = null;
      setExpandedIds(new Set());
    }
  }, [selectedClientName, data]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [currentCycleExpanded, setCurrentCycleExpanded] = useState(false);
  const [currentCycleExpensesExpanded, setCurrentCycleExpensesExpanded] = useState(false);
  const [cycleRevenueSearch, setCycleRevenueSearch] = useState("");
  const [cycleRevenueSort, setCycleRevenueSort] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const [cycleExpenseSearch, setCycleExpenseSearch] = useState("");
  const [cycleExpenseSort, setCycleExpenseSort] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  const { data: currentCycleRevenues, isLoading: currentCycleLoading } = useQuery<Array<{ id: number; amount: string; clientName?: string | null; description?: string | null; date: string; settlementId?: number | null }>>({
    queryKey: ["driver-current-revenues", selectedDriverId],
    queryFn: async () => {
      const p = new URLSearchParams({ driverId: selectedDriverId, activeOnly: "true" });
      const res = await fetch(`${BASE_URL}/api/revenues?${p.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch current revenues");
      return res.json();
    },
    enabled: !!selectedDriverId && !selectedMonth,
    staleTime: 30_000,
  });

  const { data: currentCycleExpenses, isLoading: currentCycleExpensesLoading } = useQuery<Array<{ id: number; amount: string; type: string; notes?: string | null; date: string }>>({
    queryKey: ["driver-current-expenses", selectedDriverId],
    queryFn: async () => {
      const p = new URLSearchParams({ driverId: selectedDriverId, activeOnly: "true" });
      const res = await fetch(`${BASE_URL}/api/expenses?${p.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch current expenses");
      return res.json();
    },
    enabled: !!selectedDriverId && !selectedMonth,
    staleTime: 30_000,
  });

  const fmt = (n: string | number | undefined) => Number(n || 0).toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const monthOptions = buildMonthOptions();

  const totals = data
    ? {
        totalRevenue: data.reduce((s, e) => s + Number(e.totalRevenue), 0),
        totalExpenses: data.reduce((s, e) => s + Number(e.totalExpenses), 0),
        netProfit: data.reduce((s, e) => s + Number(e.netProfit), 0),
        driverShare: data.reduce((s, e) => s + Number(e.driverShare), 0),
        ownerPayout: data.reduce((s, e) => s + Number(e.ownerPayout), 0),
      }
    : null;

  const currentCycleTotal = currentCycleRevenues
    ? currentCycleRevenues.reduce((sum, r) => sum + Number(r.amount), 0)
    : null;

  const filteredCycleRevenues = useMemo(() => {
    if (!currentCycleRevenues) return [];
    const needle = cycleRevenueSearch.trim().toLowerCase();
    let list = needle
      ? currentCycleRevenues.filter(r => (r.clientName || "").toLowerCase().includes(needle))
      : [...currentCycleRevenues];
    list = list.sort((a, b) => {
      if (cycleRevenueSort === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (cycleRevenueSort === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (cycleRevenueSort === "amount-desc") return Number(b.amount) - Number(a.amount);
      return Number(a.amount) - Number(b.amount);
    });
    return list;
  }, [currentCycleRevenues, cycleRevenueSearch, cycleRevenueSort]);

  const currentCycleExpensesTotal = currentCycleExpenses
    ? currentCycleExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
    : null;

  const filteredCycleExpenses = useMemo(() => {
    if (!currentCycleExpenses) return [];
    const needle = cycleExpenseSearch.trim().toLowerCase();
    let list = needle
      ? currentCycleExpenses.filter(e => {
          const typeKey = (e.type || "").toLowerCase();
          const typeLabel = String(t(e.type as Parameters<typeof t>[0]) || "").toLowerCase();
          const notes = (e.notes || "").toLowerCase();
          return typeKey.includes(needle) || typeLabel.includes(needle) || notes.includes(needle);
        })
      : [...currentCycleExpenses];
    list = list.sort((a, b) => {
      if (cycleExpenseSort === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (cycleExpenseSort === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (cycleExpenseSort === "amount-desc") return Number(b.amount) - Number(a.amount);
      return Number(a.amount) - Number(b.amount);
    });
    return list;
  }, [currentCycleExpenses, cycleExpenseSearch, cycleExpenseSort, t]);

  const settledTotal = data
    ? data.reduce((s, e) => s + Number(e.totalRevenue), 0)
    : null;

  const showBreakdown = !!selectedDriverId && !selectedMonth && !isLoading && data !== undefined;

  const hasFilter = !!selectedDriverId || !!selectedMonth || !!selectedClientName;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2.5 rounded-full">
          <Archive className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("archive")}</h1>
          <p className="text-sm text-muted-foreground">{t("settlementHistory")}</p>
        </div>
      </div>

      {/* Filter controls */}
      <Card className="border border-border/60">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              className="flex-1 min-w-[140px] h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedDriverId}
              onChange={e => setParam("driverId", e.target.value)}
            >
              <option value="">{t("allDrivers")}</option>
              {drivers?.map(d => (
                <option key={d.id} value={String(d.id)}>
                  {d.name} — {d.vehicleNumber}
                </option>
              ))}
            </select>
            <select
              className="flex-1 min-w-[140px] h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedMonth}
              onChange={e => setParam("month", e.target.value)}
            >
              <option value="">{t("allMonths")}</option>
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                list="archive-client-datalist"
                placeholder={t("filterByClient")}
                className="w-full h-9 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={clientNameInput}
                onChange={e => handleClientNameChange(e.target.value)}
              />
              <datalist id="archive-client-datalist">
                {(knownClients ?? []).map(c => (
                  <option key={c.clientName} value={c.clientName} />
                ))}
              </datalist>
            </div>
            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  setClientNameInput("");
                  setLocation("/archive");
                }}
              >
                ✕
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current cycle vs settled breakdown — only when a single driver is selected without month filter */}
      {showBreakdown && (
        (currentCycleLoading || currentCycleExpensesLoading) ? (
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {/* Current-cycle revenue */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <button
                className="w-full text-start p-3 space-y-1 hover:bg-green-50/50 transition-colors"
                onClick={() => setCurrentCycleExpanded(v => !v)}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">{t("currentCycle")}</p>
                  {currentCycleExpanded ? (
                    <ChevronUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <p className="text-base font-bold text-green-700 leading-none">
                  {currentCycleTotal !== null ? fmt(currentCycleTotal) : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">{t("sar")}</p>
              </button>
              {currentCycleExpanded && (
                <div className="border-t bg-green-500/3">
                  {!currentCycleRevenues || currentCycleRevenues.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] text-muted-foreground italic">{t("noRevenues")}</p>
                  ) : (
                    <>
                      <div className="px-2 pt-2 pb-1 flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <Search className="absolute start-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                          <input
                            type="text"
                            value={cycleRevenueSearch}
                            onChange={e => setCycleRevenueSearch(e.target.value)}
                            placeholder={t("filterByClient")}
                            className="w-full text-[11px] ps-6 pe-2 py-1 rounded border border-green-200 bg-white/80 focus:outline-none focus:ring-1 focus:ring-green-400 placeholder:text-muted-foreground"
                          />
                        </div>
                        <select
                          value={cycleRevenueSort}
                          onChange={e => setCycleRevenueSort(e.target.value as typeof cycleRevenueSort)}
                          className="text-[10px] rounded border border-green-200 bg-white/80 py-1 px-1 focus:outline-none focus:ring-1 focus:ring-green-400 text-muted-foreground shrink-0"
                        >
                          <option value="date-desc">↓ {t("date")}</option>
                          <option value="date-asc">↑ {t("date")}</option>
                          <option value="amount-desc">↓ {t("amount")}</option>
                          <option value="amount-asc">↑ {t("amount")}</option>
                        </select>
                      </div>
                      <div className="px-2 pb-2 space-y-1">
                        {filteredCycleRevenues.length === 0 ? (
                          <p className="py-1.5 px-2 text-[11px] text-muted-foreground italic">{t("noRevenues")}</p>
                        ) : (
                          filteredCycleRevenues.map(r => (
                            <div key={r.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md bg-green-50/60 border border-green-100">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <User className="h-3 w-3 text-green-600 shrink-0" />
                                <span className="text-[11px] font-medium text-green-800 truncate">
                                  {r.clientName || <span className="text-muted-foreground italic font-normal">{t("noClient")}</span>}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {format(new Date(r.date), "d/M/yy")}
                                </span>
                                <span className="text-[11px] font-bold text-green-700 font-mono">
                                  {fmt(r.amount)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Current-cycle expenses */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <button
                className="w-full text-start p-3 space-y-1 hover:bg-red-50/50 transition-colors"
                onClick={() => setCurrentCycleExpensesExpanded(v => !v)}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">{t("expenses")}</p>
                  {currentCycleExpensesExpanded ? (
                    <ChevronUp className="h-3 w-3 text-red-500" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <p className="text-base font-bold text-red-600 leading-none">
                  {currentCycleExpensesTotal !== null ? fmt(currentCycleExpensesTotal) : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">{t("sar")}</p>
              </button>
              {currentCycleExpensesExpanded && (
                <div className="border-t bg-red-500/3">
                  {!currentCycleExpenses || currentCycleExpenses.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] text-muted-foreground italic">{t("noExpenses")}</p>
                  ) : (
                    <>
                      <div className="px-2 pt-2 pb-1 flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <Search className="absolute start-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                          <input
                            type="text"
                            value={cycleExpenseSearch}
                            onChange={e => setCycleExpenseSearch(e.target.value)}
                            placeholder={t("filterByExpense")}
                            className="w-full text-[11px] ps-6 pe-2 py-1 rounded border border-red-200 bg-white/80 focus:outline-none focus:ring-1 focus:ring-red-400 placeholder:text-muted-foreground"
                          />
                        </div>
                        <select
                          value={cycleExpenseSort}
                          onChange={e => setCycleExpenseSort(e.target.value as typeof cycleExpenseSort)}
                          className="text-[10px] rounded border border-red-200 bg-white/80 py-1 px-1 focus:outline-none focus:ring-1 focus:ring-red-400 text-muted-foreground shrink-0"
                        >
                          <option value="date-desc">↓ {t("date")}</option>
                          <option value="date-asc">↑ {t("date")}</option>
                          <option value="amount-desc">↓ {t("amount")}</option>
                          <option value="amount-asc">↑ {t("amount")}</option>
                        </select>
                      </div>
                      <div className="px-2 pb-2 space-y-1">
                        {filteredCycleExpenses.length === 0 ? (
                          <p className="py-1.5 px-2 text-[11px] text-muted-foreground italic">{t("noExpenses")}</p>
                        ) : (
                          filteredCycleExpenses.map(e => (
                            <div key={e.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md bg-red-50/60 border border-red-100">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <TrendingDown className="h-3 w-3 text-red-500 shrink-0" />
                                <span className="text-[11px] font-medium text-red-800 truncate">
                                  {t(e.type as Parameters<typeof t>[0]) || e.type}
                                  {e.notes && (
                                    <span className="text-muted-foreground font-normal"> — {e.notes}</span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {format(new Date(e.date), "d/M/yy")}
                                </span>
                                <span className="text-[11px] font-bold text-red-600 font-mono">
                                  {fmt(e.amount)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Past settled revenue */}
            <div className="rounded-xl border bg-card p-3 space-y-1">
              <p className="text-[11px] text-muted-foreground">{t("pastSettlements")}</p>
              <p className="text-base font-bold text-blue-700 leading-none">
                {settledTotal !== null ? fmt(settledTotal) : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">{t("sar")}</p>
            </div>
          </div>
        )
      )}

      {/* 3 Summary cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : totals && data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">{t("totalIncome")}</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{fmt(totals.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">{t("sar")}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-xs text-muted-foreground">{t("totalExpenses")}</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{fmt(totals.totalExpenses)}</p>
              <p className="text-xs text-muted-foreground">{t("sar")}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">{t("ownerWithdrawals")}</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{fmt(totals.ownerPayout)}</p>
              <p className="text-xs text-muted-foreground">{t("sar")}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed rounded-xl">
          <Receipt className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">{t("noSettlements")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...data].reverse().map(entry => (
            <Card key={entry.id} className="overflow-hidden border border-border/60">
              <CardContent className="p-0">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {entry.driverName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-none">{entry.driverName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.vehicleNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-end">
                      <Badge variant="outline" className="text-xs mb-1 block">
                        {format(new Date(entry.createdAt), "dd/MM/yyyy")}
                      </Badge>
                      {entry.periodStart && entry.periodEnd && (
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(entry.periodStart), "d/M")} — {format(new Date(entry.periodEnd), "d/M/yy")}
                        </p>
                      )}
                    </div>
                    {/* Export detailed operations */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
                      title={t("exportOperations")}
                      onClick={() => exportOperationsPdf(entry)}
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      {t("exportData")}
                    </Button>
                    {/* Summary PDF */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      title={t("downloadPdf")}
                      onClick={() => downloadSettlementPdf(entry)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 divide-x rtl:divide-x-reverse">
                  <div className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("totalRevenue")}</span>
                    </div>
                    <p className="font-bold text-green-700 text-sm">{fmt(entry.totalRevenue)}</p>
                    <p className="text-[10px] text-muted-foreground">{t("sar")}</p>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("totalExpenses")}</span>
                    </div>
                    <p className="font-bold text-red-600 text-sm">{fmt(entry.totalExpenses)}</p>
                    <p className="text-[10px] text-muted-foreground">{t("sar")}</p>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DollarSign className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("profitShared")}</span>
                    </div>
                    <p className={`font-bold text-sm ${Number(entry.driverShare) >= 0 ? "text-primary" : "text-destructive"}`}>
                      {fmt(entry.driverShare)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t("sar")}</p>
                  </div>
                </div>

                {/* Expand/collapse revenue details */}
                <button
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 border-t text-[10px] text-muted-foreground hover:text-green-700 hover:bg-green-50/40 transition-colors"
                  onClick={() => toggleExpand(entry.id)}
                >
                  {expandedIds.has(entry.id) ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      {t("hideRevenueDetails")}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      {t("showRevenueDetails")}
                    </>
                  )}
                </button>

                {/* Revenue line items */}
                {expandedIds.has(entry.id) && (
                  <SettlementRevenueDetails entryId={entry.id} fmt={fmt} highlightClient={selectedClientName} />
                )}
              </CardContent>
            </Card>
          ))}

          {/* Summary row */}
          {totals && data.length >= 1 && (
            <Card className="overflow-hidden border border-primary/30 bg-primary/5">
              <CardContent className="p-0">
                <div className="px-4 py-2.5 bg-primary/10 border-b flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">{t("filteredSummary")}</span>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    {data.length} {t("totalEntries")}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 divide-x rtl:divide-x-reverse">
                  <div className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("totalRevenue")}</span>
                    </div>
                    <p className="font-bold text-green-700 text-sm">{fmt(totals.totalRevenue)}</p>
                    <p className="text-[10px] text-muted-foreground">{t("sar")}</p>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("totalExpenses")}</span>
                    </div>
                    <p className="font-bold text-red-600 text-sm">{fmt(totals.totalExpenses)}</p>
                    <p className="text-[10px] text-muted-foreground">{t("sar")}</p>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DollarSign className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("profitShared")}</span>
                    </div>
                    <p className={`font-bold text-sm ${totals.driverShare >= 0 ? "text-primary" : "text-destructive"}`}>
                      {fmt(totals.driverShare)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t("sar")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
