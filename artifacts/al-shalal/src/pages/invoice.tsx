import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useListDrivers, getListDriversQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Printer, FileText, Save, CheckCircle, Loader2 } from "lucide-react";
import { ClientNameAutocomplete } from "@/components/client-name-autocomplete";
import { format } from "date-fns";
import QRCode from "react-qr-code";
import { useQueryClient } from "@tanstack/react-query";
import {
  BUSINESS_NAME_EN, BUSINESS_NAME_AR,
  BUSINESS_ADDRESS_EN, BUSINESS_ADDRESS_AR,
  BUSINESS_EMAIL, BUSINESS_PHONES,
  getBusinessConfig,
} from "@/lib/business-config";
import { buildInvoiceMessage } from "@/lib/whatsapp";
import { WhatsAppNotifyDialog } from "@/components/whatsapp-notify-dialog";
import { useToast } from "@/hooks/use-toast";

const NAVY = "#1a3358";
const GOLD = "#c9a227";
const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function generateInvoiceNumber() {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
}

function ForkLiftWatermark() {
  return (
    <svg
      viewBox="0 0 200 140"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "320px",
        height: "220px",
        opacity: 0.04,
        pointerEvents: "none",
        zIndex: 0,
      }}
      fill={NAVY}
    >
      <rect x="60" y="55" width="80" height="55" rx="5" />
      <rect x="75" y="30" width="45" height="35" rx="4" />
      <rect x="82" y="36" width="30" height="20" rx="2" fill="white" />
      <rect x="55" y="10" width="8" height="80" rx="2" />
      <rect x="70" y="10" width="8" height="80" rx="2" />
      <rect x="20" y="88" width="42" height="7" rx="2" />
      <rect x="20" y="100" width="42" height="7" rx="2" />
      <rect x="56" y="84" width="8" height="28" rx="1" />
      <rect x="138" y="65" width="22" height="40" rx="6" />
      <rect x="150" y="50" width="6" height="20" rx="3" />
      <circle cx="85" cy="115" r="14" />
      <circle cx="85" cy="115" r="7" fill="white" />
      <circle cx="135" cy="115" r="14" />
      <circle cx="135" cy="115" r="7" fill="white" />
      <circle cx="40" cy="115" r="10" />
      <circle cx="40" cy="115" r="5" fill="white" />
      <rect x="20" y="70" width="40" height="18" rx="2" opacity="0.6" />
      <rect x="25" y="70" width="5" height="18" rx="1" fill="white" opacity="0.4" />
      <rect x="45" y="70" width="5" height="18" rx="1" fill="white" opacity="0.4" />
      <rect x="10" y="126" width="180" height="4" rx="2" opacity="0.5" />
      <text x="100" y="145" textAnchor="middle" fontSize="14" fontWeight="bold" opacity="0.7">الشلال</text>
    </svg>
  );
}

export default function InvoicePage() {
  const { t, lang } = useI18n();
  const { role, driverId: authDriverId, driverName: authDriverName } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: drivers } = useListDrivers({ query: { queryKey: getListDriversQueryKey() } });

  const searchParams = new URLSearchParams(window.location.search);
  const urlRevenueId = searchParams.get("revenueId") ? Number(searchParams.get("revenueId")) : null;
  const urlClientName = searchParams.get("clientName") || "";
  const urlAmount = searchParams.get("amount") || "";
  const urlDate = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
  const urlDescription = searchParams.get("description") || "";
  const urlServiceType = searchParams.get("serviceType") || "";
  const urlDriverId = searchParams.get("driverId") || (authDriverId ? String(authDriverId) : "");

  const [driverId, setDriverId] = useState<string>(urlDriverId);
  const [clientName, setClientName] = useState(urlClientName);
  const [serviceType, setServiceType] = useState(urlServiceType || urlDescription || "");
  const [amount, setAmount] = useState(urlAmount);
  const [date, setDate] = useState(urlDate);
  const [notes, setNotes] = useState("");
  const [invoiceNumber] = useState(generateInvoiceNumber);
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [waMessage, setWaMessage] = useState("");
  const [generated, setGenerated] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const config = getBusinessConfig();

  const selectedDriver = drivers?.find(d => String(d.id) === driverId)
    || (authDriverId ? drivers?.find(d => d.id === authDriverId) : null);

  useEffect(() => {
    if (urlRevenueId && urlDescription && !serviceType) {
      setServiceType(urlDescription);
    }
  }, []);

  const amountValid = amount !== "" && parseFloat(amount) > 0;
  const serviceTypeValid = !!serviceType;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!serviceTypeValid || !amountValid) return;
    setIsGenerating(true);
    setTimeout(() => {
      setGenerated(true);
      setIsGenerating(false);
      toast({
        title: t("invoiceCreated"),
        className: "bg-green-50 border-green-200 text-green-800",
      });
    }, 250);
  };

  const handlePrint = () => window.print();

  const handleSaveInvoice = async () => {
    if (isSaving || savedInvoiceId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber,
          driverId: selectedDriver?.id ?? (driverId ? Number(driverId) : null),
          revenueId: urlRevenueId ?? null,
          clientName: clientName || null,
          serviceType,
          amount: parseFloat(amount),
          date,
          notes: notes || null,
          driverName: selectedDriver?.name ?? authDriverName ?? null,
          vehicleNumber: selectedDriver?.vehicleNumber ?? null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();
      setSavedInvoiceId(saved.id);
      toast({ title: t("invoiceSaved"), className: "bg-green-50 border-green-200 text-green-800" });
      if (urlRevenueId) {
        queryClient.invalidateQueries({ queryKey: ["revenues"] });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save invoice", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareWhatsApp = () => {
    const msg = buildInvoiceMessage({
      invoiceNumber,
      clientName: clientName || undefined,
      serviceType,
      amount: parseFloat(amount),
      date,
      phone: BUSINESS_PHONES[0],
      email: BUSINESS_EMAIL,
      driverName: selectedDriver?.name || authDriverName || undefined,
      vehicleNumber: selectedDriver?.vehicleNumber || undefined,
      notes: notes || undefined,
    });
    setWaMessage(msg);
    setWaDialogOpen(true);
  };

  const qrData = [
    `مؤسسة الشلال للنقل والرافعات الشوكية`,
    `رقم الفاتورة: ${invoiceNumber}`,
    `التاريخ: ${format(new Date(date), "dd/MM/yyyy")}`,
    `المبلغ: ${Number(amount || 0).toFixed(2)} ريال`,
    `shalal4rentalforkleft@gmail.com`,
  ].join("\n");

  const formattedDate = format(new Date(date), "dd/MM/yyyy");
  const isAr = lang === "ar";

  if (!generated) {
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full" style={{ background: `${NAVY}15` }}>
            <FileText className="h-6 w-6" style={{ color: NAVY }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t("createInvoice")}</h1>
            {urlRevenueId && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr ? `مرتبطة بالإيراد #${urlRevenueId}` : `Linked to Revenue #${urlRevenueId}`}
              </p>
            )}
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleGenerate} noValidate className="space-y-5">
              {role === "admin" && (
                <div className="space-y-2">
                  <Label>{t("driverName")}</Label>
                  <Select value={driverId} onValueChange={setDriverId}>
                    <SelectTrigger className="h-12 bg-muted/50">
                      <SelectValue placeholder={t("selectDriver")} />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers?.map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name} ({d.vehicleNumber})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <ClientNameAutocomplete
                value={clientName}
                onChange={setClientName}
                driverId={selectedDriver?.id ?? (driverId ? Number(driverId) : null)}
              />
              <div className="space-y-2">
                <Label>{t("date")}</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)}
                  required className="h-12 bg-muted/50" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{t("serviceType")}</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger
                    className={`h-12 bg-muted/50 ${submitted && !serviceTypeValid ? "border-red-500 ring-1 ring-red-500" : ""}`}
                    aria-invalid={submitted && !serviceTypeValid}
                  >
                    <SelectValue placeholder={t("serviceType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="تحميل وتنزيل">تحميل وتنزيل</SelectItem>
                    <SelectItem value="ترتيب مستودع">ترتيب مستودع</SelectItem>
                    <SelectItem value="نقل مستودع">نقل مستودع</SelectItem>
                    <SelectItem value="يومية">يومية</SelectItem>
                    <SelectItem value="أخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>
                {submitted && !serviceTypeValid && (
                  <p className="text-sm font-medium text-red-600" role="alert">
                    {t("errorSelectServiceType")}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t("amount")} ({t("sar")})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  className={`h-12 bg-muted/50 text-lg font-bold ${submitted && !amountValid ? "border-red-500 ring-1 ring-red-500" : ""}`}
                  aria-invalid={submitted && !amountValid}
                />
                {submitted && !amountValid && (
                  <p className="text-sm font-medium text-red-600" role="alert">
                    {t("errorEnterAmount")}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t("notes")}</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="bg-muted/50" placeholder={t("notes")} rows={2} />
              </div>
              <Button
                type="submit"
                disabled={isGenerating}
                className="w-full h-12 text-base font-semibold gap-2"
                style={{ background: NAVY }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("generating")}
                  </>
                ) : (
                  t("generateInvoice")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Action bar */}
      <div className="flex gap-2 justify-end flex-wrap print:hidden">
        <Button variant="outline" onClick={() => setGenerated(false)}>{t("cancel")}</Button>
        <Button
          className="gap-2 font-semibold text-white"
          style={{ background: NAVY }}
          onClick={handlePrint}
        >
          <Printer className="h-4 w-4" />
          {t("printPdf")}
        </Button>
        <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={handleShareWhatsApp}>
          <MessageCircle className="h-4 w-4" />
          {t("shareWhatsApp")}
        </Button>
        {savedInvoiceId ? (
          <Button variant="outline" className="gap-2 border-green-500 text-green-700 bg-green-50 cursor-default" disabled>
            <CheckCircle className="h-4 w-4" />
            {t("invoiceLinked")}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="gap-2 border-primary text-primary hover:bg-primary/5"
            onClick={handleSaveInvoice}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? t("saving") : t("saveInvoice")}
          </Button>
        )}
      </div>

      {urlRevenueId && !savedInvoiceId && (
        <div className="print:hidden flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <FileText className="h-3.5 w-3.5 shrink-0" />
          {isAr ? `هذه الفاتورة ستُربط بالإيراد #${urlRevenueId} عند الحفظ` : `This invoice will be linked to Revenue #${urlRevenueId} when saved`}
        </div>
      )}

      {/* ── INVOICE DOCUMENT ── */}
      <div
        ref={invoiceRef}
        className="bg-white shadow-xl print:shadow-none"
        style={{ borderRadius: "12px", overflow: "hidden", border: `1px solid #e2e8f0`, fontFamily: "'Noto Kufi Arabic', sans-serif" }}
      >
        <div style={{ background: GOLD, height: "6px" }} />

        <div style={{ background: NAVY, color: "white", padding: "28px 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <div style={{ background: GOLD, borderRadius: "8px", padding: "6px 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 32 22" width="36" height="24" fill="white">
                    <rect x="10" y="8" width="14" height="10" rx="1.5" />
                    <rect x="12" y="4" width="9" height="7" rx="1.2" />
                    <rect x="13" y="5.5" width="6" height="4" rx="0.8" fill={GOLD} />
                    <rect x="7" y="1" width="2" height="14" rx="0.8" />
                    <rect x="10" y="1" width="2" height="14" rx="0.8" />
                    <rect x="1" y="15" width="10" height="1.8" rx="0.8" />
                    <rect x="1" y="18" width="10" height="1.8" rx="0.8" />
                    <rect x="8" y="13.5" width="2" height="6" rx="0.5" />
                    <rect x="22" y="10" width="5" height="7" rx="1.5" />
                    <circle cx="14" cy="20" r="2.5" />
                    <circle cx="14" cy="20" r="1.2" fill={NAVY} />
                    <circle cx="22" cy="20" r="2.5" />
                    <circle cx="22" cy="20" r="1.2" fill={NAVY} />
                    <circle cx="5" cy="20" r="1.8" />
                    <circle cx="5" cy="20" r="0.9" fill={NAVY} />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: "800", lineHeight: 1.2 }}>مؤسسة الشلال</div>
                  <div style={{ fontSize: "11px", opacity: 0.7, lineHeight: 1.2 }}>للنقل والرافعات الشوكية</div>
                </div>
              </div>
              <div style={{ fontSize: "12px", opacity: 0.75, marginTop: "6px" }}>
                {isAr ? BUSINESS_ADDRESS_AR : BUSINESS_ADDRESS_EN}
              </div>
              <div style={{ marginTop: "8px", fontSize: "11px", opacity: 0.65 }}>
                <div>📞 {BUSINESS_PHONES.slice(0, 3).join(" · ")}</div>
                <div>📞 {BUSINESS_PHONES.slice(3).join(" · ")}</div>
                <div>📧 {BUSINESS_EMAIL}</div>
              </div>
            </div>

            <div style={{ textAlign: "right", minWidth: "120px" }}>
              <div style={{ background: GOLD, color: NAVY, borderRadius: "6px", padding: "4px 12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "8px", textTransform: "uppercase" }}>
                {t("invoice")} / فاتورة
              </div>
              <div style={{ fontFamily: "monospace", fontWeight: "800", fontSize: "15px", letterSpacing: "0.5px" }}>{invoiceNumber}</div>
              <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>{formattedDate}</div>
            </div>
          </div>
        </div>

        <div style={{ background: GOLD, height: "2px" }} />

        <div style={{ padding: "28px 32px", position: "relative", background: "white" }}>
          <ForkLiftWatermark />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
              <div>
                <div style={{ fontSize: "9px", fontWeight: 700, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px", borderBottom: `2px solid ${GOLD}`, paddingBottom: "3px", display: "inline-block" }}>
                  {isAr ? "من" : "FROM"}
                </div>
                <div style={{ fontWeight: "700", fontSize: "13px" }}>{isAr ? BUSINESS_NAME_AR : BUSINESS_NAME_EN}</div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>{isAr ? BUSINESS_ADDRESS_AR : BUSINESS_ADDRESS_EN}</div>
              </div>
              {clientName && (
                <div>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: NAVY, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px", borderBottom: `2px solid ${NAVY}`, paddingBottom: "3px", display: "inline-block" }}>
                    {isAr ? "إلى" : "TO"}
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "13px" }}>{clientName}</div>
                  {selectedDriver && (
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                      {selectedDriver.name} · {selectedDriver.vehicleNumber}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginBottom: "24px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: NAVY, color: "white" }}>
                    <th style={{ padding: "10px 14px", textAlign: "start", fontWeight: 600, fontSize: "11px", letterSpacing: "0.05em" }}>
                      {t("serviceType")} / نوع الخدمة
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "end", fontWeight: 600, fontSize: "11px", letterSpacing: "0.05em", width: "160px" }}>
                      {t("amount")} / المبلغ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "14px 14px" }}>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>{serviceType}</div>
                      {notes && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>{notes}</div>}
                    </td>
                    <td style={{ padding: "14px 14px", textAlign: "end", fontWeight: "800", fontSize: "17px", color: NAVY }}>
                      {Number(amount).toFixed(2)}
                      <span style={{ fontSize: "12px", fontWeight: "500", marginLeft: "4px", color: "#64748b" }}>{t("sar")}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                <div style={{ padding: "8px", border: `2px solid ${GOLD}`, borderRadius: "8px", background: "white" }}>
                  <QRCode
                    value={qrData}
                    size={80}
                    fgColor={NAVY}
                    bgColor="white"
                    style={{ display: "block" }}
                  />
                </div>
                <div style={{ fontSize: "8px", color: "#94a3b8", textAlign: "center", maxWidth: "96px" }}>
                  {isAr ? "امسح للتحقق" : "Scan to verify"}
                </div>
              </div>

              <div style={{ minWidth: "220px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "12px", borderBottom: "1px dashed #e2e8f0" }}>
                  <span style={{ color: "#64748b" }}>Subtotal / المجموع</span>
                  <span>{Number(amount).toFixed(2)} {t("sar")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "12px", borderBottom: "1px dashed #e2e8f0" }}>
                  <span style={{ color: "#64748b" }}>{t("vatZero")}</span>
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>0.00 {t("sar")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", marginTop: "8px", background: NAVY, borderRadius: "8px", color: "white" }}>
                  <span style={{ fontWeight: 700, fontSize: "14px" }}>{t("total")} / الإجمالي</span>
                  <span style={{ fontWeight: "800", fontSize: "18px", color: GOLD }}>
                    {Number(amount).toFixed(2)} <span style={{ fontSize: "12px" }}>{t("sar")}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "#f8fafc", borderTop: `3px solid ${GOLD}`, padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ fontSize: "10px", color: "#475569" }}>
            <span style={{ fontWeight: 700, color: NAVY }}>{BUSINESS_NAME_AR}</span>
            <span style={{ margin: "0 8px", color: GOLD }}>·</span>
            <span>{isAr ? BUSINESS_ADDRESS_AR : BUSINESS_ADDRESS_EN}</span>
          </div>
          <div style={{ fontSize: "10px", color: "#64748b", textAlign: "right" }}>
            {BUSINESS_PHONES.join(" · ")}
          </div>
        </div>

        <div style={{ background: GOLD, height: "4px" }} />
      </div>

      <WhatsAppNotifyDialog
        open={waDialogOpen}
        onClose={() => setWaDialogOpen(false)}
        message={waMessage}
      />
    </div>
  );
}
