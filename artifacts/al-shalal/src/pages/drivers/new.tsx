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
import { Eye, EyeOff, ShieldCheck, UserPlus } from "lucide-react";

export default function AddDriver() {
  const { t, lang } = useI18n();
  const { role } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const { mutate: createDriver, isPending } = useCreateDriver();

  if (role !== "admin") {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-3">
        <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/30" />
        <p className="text-xl font-bold text-muted-foreground">{t("accessDenied")}</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !vehicleNumber || !username || !password) {
      toast({ title: t("accessDenied"), description: "All required fields must be filled", variant: "destructive" });
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
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t("createDriver")}</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">{t("driverName")} *</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} required className="h-12 bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleNumber">{t("vehicleNumber")} *</Label>
              <Input id="vehicleNumber" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} required className="h-12 bg-muted/50 font-mono" placeholder="e.g. KSA-1234" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="h-12 bg-muted/50" dir="ltr" />
            </div>
            <div className="border-t pt-5 space-y-5">
              <p className="text-sm font-semibold text-primary flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                {t("loginWithCredentials")}
              </p>
              <div className="space-y-2">
                <Label htmlFor="username">{t("username")} *</Label>
                <Input id="username" value={username} onChange={e => setUsername(e.target.value)} required className="h-12 bg-muted/50" dir="ltr" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")} *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="h-12 bg-muted/50 pe-12"
                    dir="ltr"
                    autoComplete="new-password"
                  />
                  <button type="button" className="absolute inset-y-0 end-3 flex items-center text-muted-foreground" onClick={() => setShowPass(v => !v)}>
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full h-14 text-lg shadow-md gap-2" disabled={isPending}>
              <UserPlus className="h-5 w-5" />
              {isPending ? (lang === "ar" ? "جارٍ الإنشاء..." : "Creating...") : t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
