import { useI18n } from "@/lib/i18n";
import { useGetDriver, useUpdateDriver, getGetDriverQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, User, Truck, Phone, KeyRound, ShieldCheck, ArrowRight, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

interface EditDriverProps {
  driverId: number;
}

export default function EditDriver({ driverId }: EditDriverProps) {
  const { t, lang } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isRtl = lang === "ar" || lang === "ur";

  const { data: driver, isLoading } = useGetDriver(
    driverId,
    { query: { queryKey: getGetDriverQueryKey(driverId) } }
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (driver) {
      setName(driver.name);
      setPhone(driver.phone ?? "");
      setVehicleNumber(driver.vehicleNumber);
      setUsername(driver.username);
    }
  }, [driver]);

  const { mutate: updateDriver, isPending } = useUpdateDriver();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, string | undefined> = { name, vehicleNumber, username, phone: phone || undefined };
    if (password) payload.password = password;
    updateDriver({ id: driverId, data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: t("driverUpdated") });
        setLocation("/drivers");
      },
      onError: () => toast({ title: isRtl ? "فشل التحديث" : "Error", variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-pulse">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">جاري جلب بيانات السائق...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-8 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-400 pb-12 ${isRtl ? "font-arabic" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Upper Navigation & Title Section */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
        <Link href="/drivers" className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors w-fit">
          <ArrowRight className={`h-4 w-4 ${isRtl ? "" : "rotate-180"}`} />
          إلغاء والعودة للقائمة
        </Link>
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-xl shadow-slate-900/10 text-white">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t("editDriver")}</h1>
            <p className="text-slate-500 text-xs font-medium mt-1">تحديث المعلومات المهنية أو بيانات الدخول للسائق: <span className="text-blue-600 font-bold">{driver?.name}</span></p>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/60 bg-white rounded-[32px] overflow-hidden">
        <CardContent className="p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* SECTION 1: Personal & Vehicle Details */}
            <div className="space-y-5">
              <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2 mb-2">
                <Truck className="h-4 w-4" />
                معلومات الهوية والتشغيل
              </h3>
              
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-700">{t("driverName")} *</Label>
                <div className="relative">
                  <User className="absolute inset-y-0 start-4 h-full w-4 text-slate-400 flex items-center justify-center pointer-events-none" />
                  <Input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                    className="h-12 ps-11 rounded-xl bg-slate-50/50 border-none ring-1 ring-slate-200 font-bold focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all text-slate-900 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-700">{t("vehicleNumber")} *</Label>
                  <div className="relative">
                    <Truck className="absolute inset-y-0 start-4 h-full w-4 text-slate-400 flex items-center justify-center pointer-events-none" />
                    <Input 
                      value={vehicleNumber} 
                      onChange={e => setVehicleNumber(e.target.value)} 
                      required 
                      className="h-12 ps-11 rounded-xl bg-slate-50/50 border-none ring-1 ring-slate-200 font-black focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all text-sm font-mono" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-700">{t("phone")}</Label>
                  <div className="relative">
                    <Phone className="absolute inset-y-0 start-4 h-full w-4 text-slate-400 flex items-center justify-center pointer-events-none" />
                    <Input 
                      type="tel" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      className="h-12 ps-11 rounded-xl bg-slate-50/50 border-none ring-1 ring-slate-200 font-bold focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all text-sm font-mono tracking-wide" 
                      dir="ltr" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Access & Credentials */}
            <div className="border-t border-slate-100 pt-6 space-y-5">
              <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2 mb-2">
                <KeyRound className="h-4 w-4" />
                {t("loginWithCredentials")}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-700">{t("username")} *</Label>
                  <Input 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    required 
                    className="h-12 rounded-xl bg-slate-50/50 border-none ring-1 ring-slate-200 font-black focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all text-sm font-mono" 
                    dir="ltr" 
                    autoComplete="off" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-700">{t("newPassword")}</Label>
                  <div className="relative">
                    <Input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-12 rounded-xl bg-slate-50/50 border-none ring-1 ring-slate-200 font-black focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all text-sm font-mono pe-12"
                      dir="ltr"
                      autoComplete="new-password"
                      placeholder="اتركه فارغاً لعدم التغيير"
                    />
                    <button type="button" className="absolute inset-y-0 end-4 flex items-center text-slate-400 hover:text-slate-600" onClick={() => setShowPass(v => !v)}>
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 h-14 rounded-2xl border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-all" 
                onClick={() => setLocation("/drivers")}
              >
                {t("cancel")}
              </Button>
              <Button 
                type="submit" 
                className="flex-[2] h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-xl shadow-blue-600/20 gap-3 transition-all active:scale-[0.99]" 
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {isPending ? (isRtl ? "جاري الحفظ..." : "Saving...") : t("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}