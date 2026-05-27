import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth, ADMIN_CODE } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, ShieldCheck, ChevronRight, Eye, EyeOff, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="flex gap-2 mb-8">
        {(["ar", "en", "ur"] as const).map(l => (
          <button key={l} onClick={() => setLang(l)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              lang === l ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
            }`}>
            {l === "ar" ? "العربية" : l === "en" ? "English" : "اردو"}
          </button>
        ))}
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center mb-2">
          <h1 className="text-4xl font-bold text-primary mb-1">{t("appName")}</h1>
          <p className="text-sm text-muted-foreground">{t("invoiceHeader")}</p>
        </div>

        {view === "choose" && (
          <div className="grid gap-4">
            <Card className="cursor-pointer hover:border-primary/60 transition-colors group"
              onClick={() => setView("admin")}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary/20 transition-colors">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{t("imAdmin")}</p>
                  <p className="text-sm text-muted-foreground">{t("globalAnalytics")}</p>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground ${isRtl ? "rotate-180" : ""}`} />
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary/60 transition-colors group"
              onClick={() => setView("driver")}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary/20 transition-colors">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{t("imDriver")}</p>
                  <p className="text-sm text-muted-foreground">{t("loginWithCredentials")}</p>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground ${isRtl ? "rotate-180" : ""}`} />
              </CardContent>
            </Card>
          </div>
        )}

        {view === "admin" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t("imAdmin")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("enterAdminCode")}</Label>
                <Input
                  type="password"
                  value={code}
                  onChange={e => { setCode(e.target.value); setCodeError(false); }}
                  onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
                  className={`h-12 text-lg tracking-widest ${codeError ? "border-destructive" : ""}`}
                  placeholder="••••"
                />
                {codeError && <p className="text-destructive text-sm">{t("wrongCode")}</p>}
              </div>
              <Button className="w-full h-12" onClick={handleAdminLogin}>{t("confirm")}</Button>
              <Button variant="ghost" className="w-full" onClick={() => { setView("choose"); setCode(""); setCodeError(false); }}>
                {t("cancel")}
              </Button>
            </CardContent>
          </Card>
        )}

        {view === "driver" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                {t("imDriver")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("username")}</Label>
                <Input
                  value={username}
                  onChange={e => { setUsername(e.target.value); setLoginError(null); }}
                  onKeyDown={e => e.key === "Enter" && handleDriverLogin()}
                  className="h-12 bg-muted/50"
                  dir="ltr"
                  placeholder="username"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("password")}</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setLoginError(null); }}
                    onKeyDown={e => e.key === "Enter" && handleDriverLogin()}
                    className="h-12 bg-muted/50 pe-12"
                    dir="ltr"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 end-3 flex items-center text-muted-foreground"
                    onClick={() => setShowPass(v => !v)}>
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  loginError === "frozen" ? "bg-amber-50 border border-amber-200 text-amber-700" : "bg-destructive/10 border border-destructive/20 text-destructive"
                }`}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {loginError === "frozen" ? t("accountFrozen") : t("loginFailed")}
                </div>
              )}

              <Button className="w-full h-12" onClick={handleDriverLogin} disabled={loading || !username || !password}>
                {loading ? "..." : t("confirm")}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => { setView("choose"); setUsername(""); setPassword(""); setLoginError(null); }}>
                {t("cancel")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
