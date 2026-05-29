import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCreateDriver } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ShieldCheck, UserPlus, Truck, Phone, KeyRound, User, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function AddDriver() {
  const { t, lang } = useI18n();
  const { role } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isRtl = lang === "ar" || lang === "ur";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const { mutate: createDriver, isPending } = useCreateDriver();

  if (role !== "admin") {
    return (
      <div className="max-w-md mx-auto text-center py-24 space-y-4 animate-in fade-in duration-300">
        <div className="bg-red-50 p-4 rounded-full w-fit mx-auto">
          <ShieldCheck className="h-14 w-14 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">{t("accessDenied")}</h2>
        <p className="text-slate-500 text-sm font-medium">عذراً، لا تمتلك الصلاحيات الإدارية الكافية للوصول إلى هذه الصفحة.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !vehicleNumber || !username || !password) {
      toast({ 
        title: isRtl ? "تنبيه ناقص" : "Required Fields Missing", 
        description: isRtl ? "يرجى ملء كافة الحقول الإلزامية التي تحتوي على علامة (*)" : "All required fields must be filled", 
        variant: "destructive" 
      });
      return;
    }
    createDriver({
      data: { name, phone: phone || undefined, vehicleNumber, username, password }
    }, {
      onSuccess: () => {
        toast({
          title: t("driverCreated"),
          description: `@${username} · ${vehicleNumber}`,
        });
        setLocation("/drivers");
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        if (msg?.includes("unique") || msg?.includes("conflict")) {
          toast({ title: t("usernameConflict"), variant: "destructive" });
        } else {
          toast({ title: "Error", description: "Failed to create driver", variant: "destructive" });
        }
      }
    });
  };

  return (
    <div className={`space-y-8 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-400 pb-12 ${isRtl ? "font-arabic" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Upper Navigation & Title */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
        <Link href="/drivers" className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors w-fit">
          <ArrowRight className={`h-4 w-4 ${isRtl ? "" : "rotate-180"}`} />
          العودة لقائمة السائقين
        </Link>
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-600/10">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t("createDriver")}</h1>
            <p className="text-slate-500 text-xs font-medium mt-1">تجهيز قيد تعريف جديد لسائق وربطه بالمركبة أو الرافعة الشوكية</p>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/60 bg-white rounded-[32px] overflow-hidden">
        <CardContent className="p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* SECTION 1: Operational Information */}
            <div className="space-y-5">
              <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2 mb-2">
                <Truck className="h-4 w-4" />
                البيانات التشغيلية للمعدة
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-black text-slate-700">{t("driverName")} <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <User className="absolute inset-y-0 start-4 h-full w-4 text-slate-400 flex items-center justify-center pointer-events-none" />
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                    className="h-12 ps-11 rounded-xl bg-slate-50/50 border-none ring-1 ring-slate-200 font-bold focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all text-slate-900 text-sm"
                    placeholder="مثال: محمد الشهراني"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="vehicleNumber" className="text-xs font-black text-slate-700">{t("vehicleNumber")} <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Truck className="absolute inset-y-0 start-4 h-full w-4 text-slate-400 flex items-center justify-center pointer-events-none" />
                    <Input 
                      id="vehicleNumber" 
                      value={vehicleNumber} 
                      onChange={e => setVehicleNumber(e.target.value)} 
                      required 
                      className="h-12 ps-11 rounded-xl bg-slate-50/50 border-none ring-1 ring-slate-200 font-black focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all text-sm" 
                      placeholder="أ ب ج 1 2 3 4" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-black text-slate-700">{t("phone")}</Label>
                  <div className="relative">
                    <Phone className="absolute inset-y-0 start-4 h-full w-4 text-slate-400 flex items-center justify-center pointer-events-none" />
                    <Input 
                      id="phone" 
                      type="tel" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      className="h-12 ps-11 rounded-xl bg-slate-50/50 border-none ring-1 ring-slate-200 font-bold focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all text-sm font-mono tracking-wide" 
                      dir="ltr" 
                      placeholder="05xxxxxxxx"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: System Access Credentials */}
            <div className="border-t border-slate-100 pt-6 space-y-5">
              <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2 mb-2">
                <KeyRound className="h-4 w-4" />
                {t("loginWithCredentials")}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs font-black text-slate-700">{t("username")} <span className="text-red-500">*</span></Label>
                  <Input 
                    id="username" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    required 
                    className="h-12 rounded-xl bg-slate-50/50 border-none ring-1 ring-slate-200 font-black focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all text-sm font-mono" 
                    dir="ltr" 
                    autoComplete="off" 
                    placeholder="e.g. shahrani_driver"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-black text-slate-700">{t("password")} <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="h-12 rounded-xl bg-slate-50/50 border-none ring-1 ring-slate-200 font-black focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all text-sm font-mono pe-12"
                      dir="ltr"
                      autoComplete="new-password"
                      placeholder="••••••••"
                    />
                    <button type="button" className="absolute inset-y-0 end-4 flex items-center text-slate-400 hover:text-slate-600" onClick={() => setShowPass(v => !v)}>
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Action Button */}
            <Button type="submit" className="w-full h-14 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-base shadow-xl shadow-slate-950/10 gap-3 transition-all active:scale-[0.99] mt-4" disabled={isPending}>
              <UserPlus className="h-5 w-5" />
              {isPending ? (lang === "ar" ? "جارٍ حفظ قيد السائق..." : "Creating...") : t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}