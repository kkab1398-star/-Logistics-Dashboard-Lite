import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCreateTransfer, useListDrivers, getListDriversQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { useState, useRef } from "react";
import { ArrowUpFromLine, Image as ImageIcon, CheckCircle, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AddTransfer() {
  const { t } = useI18n();
  const { role, driverId: authDriverId } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [driverId, setDriverId] = useState<string>(authDriverId ? String(authDriverId) : "");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [receiptImageUrl, setReceiptImageUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: drivers } = useListDrivers({ query: { queryKey: getListDriversQueryKey() } });
  const { mutate: createTransfer, isPending } = useCreateTransfer();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReceiptImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveDriverId = authDriverId ? authDriverId : parseInt(driverId);
    if (!effectiveDriverId) {
      toast({ title: "Error", description: "Please select a driver", variant: "destructive" });
      return;
    }
    createTransfer({ data: {
      driverId: effectiveDriverId,
      amount: parseFloat(amount),
      description: description || undefined,
      receiptImageUrl: receiptImageUrl || undefined,
      date,
    }}, {
      onSuccess: () => {
        toast({ title: t("addTransfer"), description: t("save") });
        setLocation("/");
      },
      onError: () => toast({ title: "Error", description: "Failed to save", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="bg-amber-500/10 p-2 rounded-full"><ArrowUpFromLine className="h-6 w-6 text-amber-600" /></div>
        <h1 className="text-3xl font-bold tracking-tight">{t("addTransfer")}</h1>
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
            <div className="space-y-2">
              <Label>{t("uploadInvoice")}</Label>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                receiptImageUrl ? "border-amber-500 bg-amber-50" : "border-muted-foreground/25 hover:bg-muted/50"
              }`} onClick={() => fileInputRef.current?.click()}>
                <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                {receiptImageUrl ? (
                  <div className="space-y-3">
                    <div className="mx-auto w-28 h-28 rounded-md overflow-hidden border shadow-sm">
                      <img src={receiptImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm font-medium text-amber-600 flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4" /> {t("uploadInvoice")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">{t("uploadInvoice")}</p>
                  </div>
                )}
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base bg-amber-600 hover:bg-amber-700" disabled={isPending}>{t("save")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
