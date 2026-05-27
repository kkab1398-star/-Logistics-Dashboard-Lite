import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCreateExpense, useListDrivers, getListDriversQueryKey, CreateExpenseBodyType } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Calculator, CheckCircle, UploadCloud, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { buildExpenseMessage } from "@/lib/whatsapp";
import { WhatsAppNotifyDialog } from "@/components/whatsapp-notify-dialog";

export default function AddExpense() {
  const { t } = useI18n();
  const { role, driverId: authDriverId } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [driverId, setDriverId] = useState<string>(authDriverId ? String(authDriverId) : "");
  const [type, setType] = useState<string>(CreateExpenseBodyType.diesel);
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState<string>("");
  const [invoiceImageUrl, setInvoiceImageUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [waMessage, setWaMessage] = useState("");

  const { data: drivers } = useListDrivers({ query: { queryKey: getListDriversQueryKey() } });
  const { mutate: createExpense, isPending } = useCreateExpense();

  const DIESEL_PRICE = 1.79;

  // REVERSE LOGIC: amount is primary, liters = amount / price
  const calculatedLiters = type === CreateExpenseBodyType.diesel && amount && !isNaN(parseFloat(amount))
    ? (parseFloat(amount) / DIESEL_PRICE)
    : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setInvoiceImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const effectiveDriverId = authDriverId ? authDriverId : parseInt(driverId);
  const selectedDriver = drivers?.find(d => d.id === effectiveDriverId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveDriverId) {
      toast({ title: t("selectDriver"), variant: "destructive" });
      return;
    }
    if (!amount || isNaN(parseFloat(amount))) {
      toast({ title: "Error", description: "Invalid amount", variant: "destructive" });
      return;
    }

    createExpense({ data: {
      driverId: effectiveDriverId,
      type: type as CreateExpenseBodyType,
      amount: parseFloat(amount),
      liters: calculatedLiters != null ? calculatedLiters : undefined,
      date: new Date(date).toISOString(),
      notes: notes || undefined,
      invoiceImageUrl: invoiceImageUrl || undefined,
    }}, {
      onSuccess: () => {
        // Build WhatsApp notification message
        const msg = buildExpenseMessage({
          driverName: selectedDriver?.name || authDriverId?.toString() || "Driver",
          vehicleNumber: selectedDriver?.vehicleNumber,
          type: t(type as any),
          amount: parseFloat(amount),
          liters: calculatedLiters,
          date,
          notes: notes || undefined,
        });
        setWaMessage(msg);
        setWaDialogOpen(true);
      },
      onError: () => toast({ title: "Error", description: "Failed to save", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">{t("addExpense")}</h1>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("expenseType")}</Label>
                <Select value={type} onValueChange={v => { setType(v); setAmount(""); }}>
                  <SelectTrigger className="h-12 bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CreateExpenseBodyType.diesel}>{t("diesel")}</SelectItem>
                    <SelectItem value={CreateExpenseBodyType.oil}>{t("oil")}</SelectItem>
                    <SelectItem value={CreateExpenseBodyType.maintenance}>{t("maintenance")}</SelectItem>
                    <SelectItem value={CreateExpenseBodyType.other}>{t("other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("date")}</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="h-12 bg-muted/50" dir="ltr" />
              </div>
            </div>

            {/* DIESEL: amount is primary, liters auto-calculated */}
            {type === CreateExpenseBodyType.diesel ? (
              <div className="bg-accent/10 rounded-lg p-4 border border-accent/20 space-y-3">
                <div className="space-y-2">
                  <Label className="font-semibold text-accent-foreground">
                    {t("amount")} ({t("sar")}) — {t("diesel")}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                    className="h-14 text-2xl font-bold border-accent/40 focus-visible:ring-accent"
                    placeholder="0.00"
                  />
                </div>
                {calculatedLiters !== null && (
                  <div className="flex items-center justify-between bg-background rounded-md px-4 py-3 border shadow-sm">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span>{amount} ÷ {DIESEL_PRICE} SAR/L</span>
                    </div>
                    <div className="font-bold text-primary text-lg">
                      {calculatedLiters.toFixed(2)} {t("liters")}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t("amount")} ({t("sar")})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  className="h-12 bg-muted/50 text-lg font-bold"
                />
              </div>
            )}

            {/* Invoice upload */}
            <div className="space-y-2">
              <Label>{t("uploadInvoice")}</Label>
              <div className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                invoiceImageUrl ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/50"
              }`} onClick={() => fileInputRef.current?.click()}>
                <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                {invoiceImageUrl ? (
                  <div className="space-y-2">
                    <div className="mx-auto w-28 h-28 rounded-md overflow-hidden border shadow-sm">
                      <img src={invoiceImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm font-medium text-primary flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4" /> Attached — click to change
                    </p>
                  </div>
                ) : (
                  <div className="py-4 space-y-2">
                    <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">{t("uploadInvoice")}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("notes")}</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="bg-muted/50 min-h-[80px]" />
            </div>

            <Button type="submit" className="w-full h-12 text-base" disabled={isPending}>{t("save")}</Button>
          </form>
        </CardContent>
      </Card>

      <WhatsAppNotifyDialog
        open={waDialogOpen}
        message={waMessage}
        onClose={() => { setWaDialogOpen(false); setLocation("/"); }}
      />
    </div>
  );
}
