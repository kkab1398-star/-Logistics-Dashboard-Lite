import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useListDrivers, useCreateRevenue, getListDriversQueryKey, getListRevenuesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { useState, useRef } from "react";
import { TrendingUp, CheckCircle, UploadCloud, FileText, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { buildRevenueMessage } from "@/lib/whatsapp";
import { WhatsAppNotifyDialog } from "@/components/whatsapp-notify-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { ClientNameAutocomplete } from "@/components/client-name-autocomplete";


export default function AddRevenue() {
  const { t } = useI18n();
  const { role, driverId: authDriverId } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [driverId, setDriverId] = useState<string>(authDriverId ? String(authDriverId) : "");
  const [amount, setAmount] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [serviceType, setServiceType] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [receiptImageUrl, setReceiptImageUrl] = useState<string>("");
  const [isDeferred, setIsDeferred] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [waMessage, setWaMessage] = useState("");

  const { data: drivers } = useListDrivers({ query: { queryKey: getListDriversQueryKey() } });
  const { mutate: createRevenue, isPending } = useCreateRevenue();

  const effectiveDriverId = authDriverId ? authDriverId : parseInt(driverId);
  const selectedDriver = drivers?.find(d => d.id === effectiveDriverId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReceiptImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const saveRevenue = (mode: "notify" | "invoice") => {
    if (!effectiveDriverId) {
      toast({ title: t("selectDriver"), variant: "destructive" });
      return;
    }
    if (!amount || isNaN(parseFloat(amount))) {
      toast({ title: t("amount"), variant: "destructive" });
      return;
    }
    if (mode === "invoice" && !serviceType) {
      toast({ title: "يرجى اختيار نوع الخدمة / Please select service type", variant: "destructive" });
      return;
    }
    createRevenue({ data: {
      driverId: effectiveDriverId,
      amount: parseFloat(amount),
      clientName: clientName.trim() || null,
      description: description || null,
      receiptImageUrl: receiptImageUrl || null,
      date,
      isDeferred,
    }}, {
      onSuccess: (saved) => {
        queryClient.invalidateQueries({ queryKey: getListRevenuesQueryKey() });
        if (mode === "invoice") {
          const params = new URLSearchParams();
          if (clientName.trim()) params.set("clientName", clientName.trim());
          if (amount) params.set("amount", amount);
          if (date) params.set("date", date);
          if (description) params.set("description", description);
          if (serviceType) params.set("serviceType", serviceType);
          if (effectiveDriverId) params.set("driverId", String(effectiveDriverId));
          params.set("revenueId", String(saved.id));
          setLocation(`/invoice?${params.toString()}`);
          return;
        }
        const msg = buildRevenueMessage({
          driverName: selectedDriver?.name || "Driver",
          vehicleNumber: selectedDriver?.vehicleNumber,
          amount: parseFloat(amount),
          description: clientName ? `${clientName}${description ? " — " + description : ""}` : description || undefined,
          date,
        });
        setWaMessage(msg);
        setWaDialogOpen(true);
      },
      onError: () => toast({ title: "Error saving revenue", variant: "destructive" }),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveRevenue("notify");
  };

  const handleExportInvoice = () => {
    saveRevenue("invoice");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="bg-green-500/10 p-2 rounded-full"><TrendingUp className="h-6 w-6 text-green-600" /></div>
        <h1 className="text-3xl font-bold tracking-tight">{t("addRevenue")}</h1>
      </div>
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

            <ClientNameAutocomplete
              value={clientName}
              onChange={setClientName}
              driverId={effectiveDriverId || null}
            />

            <div className="space-y-2">
              <Label>نوع الخدمة</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="h-12 bg-muted/50">
                  <SelectValue placeholder="اختر نوع الخدمة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="تحميل وتنزيل">تحميل وتنزيل</SelectItem>
                  <SelectItem value="ترتيب مستودع">ترتيب مستودع</SelectItem>
                  <SelectItem value="نقل مستودع">نقل مستودع</SelectItem>
                  <SelectItem value="يومية">يومية</SelectItem>
                  <SelectItem value="أخرى">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("amount")} ({t("sar")})</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                  required className="h-12 bg-muted/50 text-lg font-bold" />
              </div>
              <div className="space-y-2">
                <Label>{t("date")}</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="h-12 bg-muted/50" dir="ltr" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("description")}</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-muted/50 min-h-[80px]" />
            </div>
            <label
              className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                isDeferred
                  ? "border-amber-500 bg-amber-50"
                  : "border-muted-foreground/20 bg-muted/30 hover:bg-muted/50"
              }`}
            >
              <Checkbox
                checked={isDeferred}
                onCheckedChange={(v) => setIsDeferred(v === true)}
                className="mt-0.5"
              />
              <div className="flex-1 select-none">
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${isDeferred ? "text-amber-700" : "text-muted-foreground"}`} />
                  <span className={`font-semibold ${isDeferred ? "text-amber-800" : ""}`}>
                    {t("deferredPayment")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t("deferredPaymentHint")}</p>
              </div>
            </label>

            <div className="space-y-2">
              <Label>{t("uploadInvoice")}</Label>
              <div className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                receiptImageUrl ? "border-green-500 bg-green-50" : "border-muted-foreground/25 hover:bg-muted/50"
              }`} onClick={() => fileInputRef.current?.click()}>
                <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                {receiptImageUrl ? (
                  <div className="space-y-2">
                    <div className="mx-auto w-28 h-28 rounded-md overflow-hidden border shadow-sm">
                      <img src={receiptImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm font-medium text-green-600 flex items-center justify-center gap-2">
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
            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700" disabled={isPending}>
                {t("save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 text-base gap-2 border-primary text-primary hover:bg-primary/5"
                onClick={handleExportInvoice}
                disabled={isPending}
              >
                <FileText className="h-4 w-4" />
                <span>حفظ وتصدير فاتورة / Save & Export Invoice</span>
              </Button>
            </div>
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
