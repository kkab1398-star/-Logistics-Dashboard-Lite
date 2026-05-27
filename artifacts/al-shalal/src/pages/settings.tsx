import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getBusinessConfig, saveBusinessConfig, BUSINESS_NAME_AR, BUSINESS_NAME_EN, BUSINESS_ADDRESS_AR, BUSINESS_ADDRESS_EN, BUSINESS_EMAIL, BUSINESS_PHONES } from "@/lib/business-config";
import { Settings2, MessageCircle, Phone, Mail, CheckCircle, Building2, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

export default function SettingsPage() {
  const { t, lang } = useI18n();
  const { role } = useAuth();
  const { toast } = useToast();
  const [ownerWhatsApp, setOwnerWhatsApp] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const config = getBusinessConfig();
    setOwnerWhatsApp(config.ownerWhatsApp || "");
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveBusinessConfig({ ownerWhatsApp });
    toast({ title: t("settingsSaved"), description: t("settings") });
  };

  const handleHardReset = async () => {
    setResetting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminCode: "1234" }),
      });
      if (!res.ok) throw new Error("Reset failed");
      const data = await res.json() as { deleted: Record<string, number> };
      toast({
        title: t("hardResetSuccess"),
        description: `${t("drivers")}: ${data.deleted.drivers} · ${t("revenues")}: ${data.deleted.revenues} · ${t("expenses")}: ${data.deleted.expenses} · ${t("transfers")}: ${data.deleted.transfers} · ${t("settlements")}: ${data.deleted.settlements}`,
      });
      setResetDialogOpen(false);
    } catch {
      toast({ title: t("hardResetError"), variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const isAr = lang === "ar";

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-full"><Settings2 className="h-6 w-6 text-primary" /></div>
        <h1 className="text-3xl font-bold">{t("settings")}</h1>
      </div>

      {/* Official business identity card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />
            {isAr ? BUSINESS_NAME_AR : BUSINESS_NAME_EN}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2 text-sm">
          <p className="text-muted-foreground">{isAr ? BUSINESS_ADDRESS_AR : BUSINESS_ADDRESS_EN}</p>
          <div className="flex flex-col gap-1">
            {BUSINESS_PHONES.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-mono text-sm" dir="ltr">{p}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm" dir="ltr">{BUSINESS_EMAIL}</span>
          </div>
        </CardContent>
      </Card>

      {/* Notification settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-600" />
            {t("ownerWhatsApp")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label>{t("ownerWhatsApp")}</Label>
              <Input
                type="tel"
                value={ownerWhatsApp}
                onChange={e => setOwnerWhatsApp(e.target.value)}
                placeholder={t("ownerWhatsAppHint")}
                className="h-12 font-mono"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                {t("ownerWhatsAppHint")} — {isAr ? "يُستخدم للإشعارات التلقائية عند تسجيل السائق أي إدخال" : "Used for auto-notify when driver logs entries"}
              </p>
            </div>
            <Button type="submit" className="w-full h-12 gap-2">
              <CheckCircle className="h-4 w-4" />
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── DANGER ZONE — ADMIN ONLY ── */}
      {role === "admin" && (
        <Card className="border-red-200 bg-red-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-red-700">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              {t("dangerZone")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-white p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                <div className="space-y-1 flex-1">
                  <p className="font-semibold text-sm text-red-800">
                    {t("hardReset")}
                  </p>
                  <p className="text-xs text-red-600/80 leading-relaxed">
                    {t("hardResetDesc")}
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                className="w-full h-11 gap-2 bg-red-600 hover:bg-red-700 text-sm font-semibold"
                onClick={() => setResetDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                {t("hardReset")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── CONFIRMATION DIALOG ── */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              {t("hardReset")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium text-foreground leading-relaxed pt-1">
              {t("hardResetWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex items-start gap-2 my-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span>
              {isAr
                ? "لا يمكن التراجع عن هذا الإجراء. سيتم حذف حسابات السائقين نهائياً — يمكن للمدير إعادة إنشائها من شاشة «إضافة سائق»."
                : "This action cannot be undone. Driver accounts will be permanently deleted — the admin can recreate them from the 'Add Driver' screen."}
            </span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetting}
              className="bg-red-600 hover:bg-red-700 gap-2"
              onClick={(e) => {
                e.preventDefault();
                handleHardReset();
              }}
            >
              <Trash2 className="h-4 w-4" />
              {resetting ? (isAr ? "جارٍ المسح..." : "Resetting...") : t("hardResetConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
