import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth, ADMIN_CODE } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, ShieldCheck, ChevronRight, Eye, EyeOff, AlertCircle, LockKeyhole, User } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const { loginAsAdmin, loginAsDriver } = useAuth();
  const [view, setView] = useState<"choose" | "admin" | "driver">("choose");

  // Admin
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);

  // Driver
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState<"invalid" | "frozen" | null>(null);
  const [loading, setLoading] = useState(false);

  const isRtl = lang === "ar" || lang === "ur";

  const handleAdminLogin = () => {
    if (code === ADMIN_CODE) {
      loginAsAdmin();
    } else {
      setCodeError(true);
    }
  };

  const handleDriverLogin = async () => {
    if (!username || !password) return;
    setLoading(true);
    setLoginError(null);
    try {
      const res = await fetch(`${BASE}/api/auth/driver-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.status === 401) { setLoginError("invalid"); return; }
      if (res.status === 403) { setLoginError("frozen"); return; }
      if (!res.ok) { setLoginError("invalid"); return; }
      const data = await res.json();
      loginAsDriver(data.id, data.name);
    } catch {
      setLoginError("invalid");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-6 relative overflow-hidden ${isRtl ? "font-arabic" : ""}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Background Decoration */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Language Switcher */}
      <div className="z-10 flex p-1 bg-white/50 backdrop-blur-md rounded-full border border-slate-200 mb-12 shadow-sm">
        {(["ar", "en", "ur"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              lang === l
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {l === "ar" ? "العربية" : l === "en" ? "English" : "اردو"}
          </button>
        ))}
      </div>

      <div className="w-full max-w-md z-10 space-y-8">
        {/* Logo & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-slate-900 rounded-2xl shadow-xl mb-4 group transition-transform hover:scale-110">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
            {t("appName")}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="h-[1px] w-8 bg-slate-300" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
              {t("invoiceHeader")}
            </p>
            <span className="h-[1px] w-8 bg-slate-300" />
          </div>
        </div>

        {/* Choose View */}
        {view === "choose" && (
          <div className="grid gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card
              className="border-none shadow-xl shadow-slate-200/50 cursor-pointer hover:ring-2 hover:ring-amber-500/50 transition-all duration-300 group overflow-hidden relative"
              onClick={() => setView("admin")}
            >
              <CardContent className="flex items-center gap-5 p-7">
                <div className="bg-amber-500 p-4 rounded-2xl shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 text-lg leading-none mb-1">
                    {t("imAdmin")}
                  </p>
                  <p className="text-xs font-medium text-slate-400">
                    {t("globalAnalytics")}
                  </p>
                </div>
                <ChevronRight
                  className={`h-5 w-5 text-slate-300 group-hover:text-amber-500 transition-colors ${isRtl ? "rotate-180" : ""}`}
                />
              </CardContent>
            </Card>

            <Card
              className="border-none shadow-xl shadow-slate-200/50 cursor-pointer hover:ring-2 hover:ring-blue-600/50 transition-all duration-300 group overflow-hidden"
              onClick={() => setView("driver")}
            >
              <CardContent className="flex items-center gap-5 p-7">
                <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 text-lg leading-none mb-1">
                    {t("imDriver")}
                  </p>
                  <p className="text-xs font-medium text-slate-400">
                    {t("loginWithCredentials")}
                  </p>
                </div>
                <ChevronRight
                  className={`h-5 w-5 text-slate-300 group-hover:text-blue-600 transition-colors ${isRtl ? "rotate-180" : ""}`}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin View */}
        {view === "admin" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
            <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-amber-500 p-3 rounded-xl shadow-lg shadow-amber-500/20">
                    <LockKeyhole className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-lg leading-none">
                      {t("imAdmin")}
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {t("globalAnalytics")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {t("adminCode")}
                  </Label>
                  <Input
                    type="password"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setCodeError(false); }}
                    onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                    placeholder="••••••••"
                    className={`h-12 rounded-xl border-slate-200 bg-slate-50 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500/30 ${
                      codeError ? "border-red-400 bg-red-50" : ""
                    }`}
                  />
                  {codeError && (
                    <div className="flex items-center gap-2 text-red-500 text-xs font-bold mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {t("invalidCode")}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleAdminLogin}
                  className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-lg shadow-amber-500/30 transition-all"
                >
                  {t("login")}
                </Button>
              </CardContent>
            </Card>

            <button
              onClick={() => { setView("choose"); setCode(""); setCodeError(false); }}
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-2"
            >
              ← {t("back")}
            </button>
          </div>
        )}

        {/* Driver View */}
        {view === "driver" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
            <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-600/20">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-lg leading-none">
                      {t("imDriver")}
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {t("loginWithCredentials")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {t("username")}
                  </Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); setLoginError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleDriverLogin()}
                      placeholder={t("username")}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 font-bold text-slate-900 pr-10 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {t("password")}
                  </Label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <Input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setLoginError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleDriverLogin()}
                      placeholder="••••••••"
                      className={`h-12 rounded-xl border-slate-200 bg-slate-50 font-bold text-slate-900 pl-10 focus:ring-2 focus:ring-blue-500/30 ${
                        loginError ? "border-red-400 bg-red-50" : ""
                      }`}
                    />
                  </div>
                  {loginError && (
                    <div className="flex items-center gap-2 text-red-500 text-xs font-bold mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {loginError === "frozen" ? t("accountFrozen") : t("invalidCredentials")}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleDriverLogin}
                  disabled={loading || !username || !password}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      {t("loading")}
                    </span>
                  ) : (
                    t("login")
                  )}
                </Button>
              </CardContent>
            </Card>

            <button
              onClick={() => { setView("choose"); setLoginError(null); setUsername(""); setPassword(""); }}
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-2"
            >
              ← {t("back")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}