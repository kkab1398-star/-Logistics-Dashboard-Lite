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
import { TrendingUp, CheckCircle, UploadCloud, FileText, Clock, AlertCircle, Calendar, Landmark, HelpCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { buildRevenueMessage } from "@/lib/whatsapp";
import { WhatsAppNotifyDialog } from "@/components/whatsapp-notify-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { ClientNameAutocomplete } from "@/components/client-name-autocomplete";

export default function AddRevenue() {
  const { t, lang } = useI18n();
  const { role, driverId: authDriverId } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isRtl = lang === "ar" || lang === "ur";

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
      onError: () => toast({ title: "حدث خطأ أثناء حفظ الإيراد", variant: "destructive" }),
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
    <div className={`space-y-6 max-w-2xl mx-auto animate-in fade-in duration-500 ${isRtl ? "font-arabic" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      {/* Header View */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t("addRevenue")}</h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">تقييد عمليات النقل، العوائد، وإصدار فواتير مؤسسة الشلال الحيّة</p>
        </div>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/60 bg-white rounded-3xl overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Admin Driver Selection Control */}
            {role === "admin" && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-400">{t("driverName")}</Label>
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger className="h-13 bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-slate-900 rounded-xl transition-all text-sm font-semibold text-slate-800">
                    <SelectValue placeholder={t("selectDriver")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-slate-200">
                    {drivers?.map(d => (
                      <SelectItem key={d.id} value={String(d.id)} className="rounded-lg py-2.5 font-medium">{d.name} ({d.vehicleNumber})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Client Autocomplete Component Input Wrapper */}
            <div className="bg-slate-50/50 p-1 rounded-2xl border border-slate-100">
              <ClientNameAutocomplete
                value={clientName}
                onChange={setClientName}
                driverId={effectiveDriverId || null}
              />
            </div>

            {/* Service Selection input option */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-400">نوع الخدمة / التشغيل بالرافعة</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="h-13 bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-slate-900 rounded-xl transition-all text-sm font-semibold text-slate-800">
                  <SelectValue placeholder="اختر نوع الخدمة" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl border-slate-200">
                  <SelectItem value="تحميل وتنزيل" className="rounded-lg py-2.5">تحميل وتنزيل / Loading & Unloading</SelectItem>
                  <SelectItem value="ترتيب مستودع" className="rounded-lg py-2.5">ترتيب مستودع / Warehouse Organizing</SelectItem>
                  <SelectItem value="نقل مستودع" className="rounded-lg py-2.5">نقل مستودع / Relocation Services</SelectItem>
                  <SelectItem value="يومية" className="rounded-lg py-2.5">يومية وعقود تشغيل / Daily Contract</SelectItem>
                  <SelectItem value="أخرى" className="rounded-lg py-2.5">أخرى / Other Services</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount and Date Form Layout Grids */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-400">{t("amount")} ({t("sar")})</Label>
                <div className="relative">
                  <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                    required className="h-13 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl text-xl font-black text-slate-900 transition-all text-center" placeholder="0.00" />
                  <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-400">{t("date")}</Label>
                <div className="relative">
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="h-13 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900 rounded-xl transition-all font-bold text-slate-800 text-center" dir="ltr" />
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Operational Notes and Description input options */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-400">{t("description")} / تفاصيل وملاحظات إضافية</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-slate-50 border-slate-200 rounded-xl min-h-[90px] focus-visible:ring-2 focus-visible:ring-slate-900 text-sm font-medium" placeholder="اكتب أي تفاصيل إضافية عن الرحلة أو موقع التحميل هنا..." />
            </div>

            {/* Intelligent Premium Deferred Payments Interactive Card Option */}
            <label
              className={`flex items-start gap-4 rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300 shadow-sm ${
                isDeferred
                  ? "border-amber-500 bg-amber-50/70 backdrop-blur-sm ring-2 ring-amber-500/20"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <Checkbox
                checked={isDeferred}
                onCheckedChange={(v) => setIsDeferred(v === true)}
                className="mt-1 h-5 w-5 rounded-md border-slate-300 accent-amber-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
              />
              <div className="flex-1 select-none">
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${isDeferred ? "text-amber-700 animate-spin-slow" : "text-slate-400"}`} />
                  <span className={`font-black text-sm tracking-tight ${isDeferred ? "text-amber-900" : "text-slate-800"}`}>
                    {t("deferredPayment")} (قيد مالي مؤجل / آجل)
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-400 mt-1 leading-relaxed">{t("deferredPaymentHint")}. عند تفعيله، سيتم ترحيل هذا المبلغ كعجز معلق للسائق حتى السداد.</p>
              </div>
            </label>

            {/* Smart Invoice and Voucher Image Attachment Zone */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-400">{t("uploadInvoice")} / إرفاق مستند أو صورة مستند التحميل</Label>
              <div className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                receiptImageUrl ? "border-emerald-500 bg-emerald-50/40" : "border-slate-200 hover:border-slate-400 bg-slate-50/30"
              }`} onClick={() => fileInputRef.current?.click()}>
                <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                {receiptImageUrl ? (
                  <div className="space-y-3 animate-in zoom-in-95">
                    <div className="mx-auto w-32 h-32 rounded-xl overflow-hidden border border-slate-200 shadow-md relative">
                      <img src={receiptImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-emerald-600" /> تم إرفاق المستند بنجاح — اضغط للتغيير
                    </p>
                  </div>
                ) : (
                  <div className="py-4 space-y-2 group-hover:scale-105 transition-transform duration-300">
                    <UploadCloud className="h-10 w-10 mx-auto text-slate-300 group-hover:text-slate-500 transition-colors" />
                    <p className="text-sm font-bold text-slate-700">{t("uploadInvoice")}</p>
                    <p className="text-[10px] font-medium text-slate-400">يدعم الصور والمستندات الملتقطة عبر الجوال</p>
                  </div>
                )}
              </div>
            </div>

            {/* Master Double Submission Buttons Actions Layout */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
              <Button type="submit" className="flex-1 h-14 text-base font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95" disabled={isPending}>
                {isPending ? "جاري الحفظ..." : t("save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-14 text-sm font-black gap-2 border-slate-900 text-slate-900 hover:bg-slate-50 rounded-xl transition-all active:scale-95 shadow-sm"
                onClick={handleExportInvoice}
                disabled={isPending}
              >
                <FileText className="h-4 w-4 text-slate-600" />
                <span>حفظ وتصدير فاتورة / Save & Export</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Interactive Whatsapp Notification modal dialog trigger component */}
      <WhatsAppNotifyDialog
        open={waDialogOpen}
        message={waMessage}
        onClose={() => { setWaDialogOpen(false); setLocation("/"); }}
      />
    </div>
  );
}