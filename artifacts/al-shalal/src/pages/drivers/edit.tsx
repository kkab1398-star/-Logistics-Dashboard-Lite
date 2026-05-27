import { useI18n } from "@/lib/i18n";
import { useGetDriver, useUpdateDriver, getGetDriverQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface EditDriverProps {
  driverId: number;
}

export default function EditDriver({ driverId }: EditDriverProps) {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">{t("editDriver")}</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>{t("driverName")} *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required className="h-12 bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label>{t("vehicleNumber")} *</Label>
              <Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} required className="h-12 bg-muted/50 font-mono" />
            </div>
            <div className="space-y-2">
              <Label>{t("phone")}</Label>
              <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="h-12 bg-muted/50" dir="ltr" />
            </div>
            <div className="border-t pt-4 space-y-5">
              <p className="text-sm font-medium text-muted-foreground">{t("loginWithCredentials")}</p>
              <div className="space-y-2">
                <Label>{t("username")} *</Label>
                <Input value={username} onChange={e => setUsername(e.target.value)} required className="h-12 bg-muted/50" dir="ltr" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label>{t("newPassword")}</Label>
                <div className="relative">
                  <Input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="h-12 bg-muted/50 pe-12" dir="ltr" autoComplete="new-password" placeholder="••••••••" />
                  <button type="button" className="absolute inset-y-0 end-3 flex items-center text-muted-foreground" onClick={() => setShowPass(v => !v)}>
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setLocation("/drivers")}>{t("cancel")}</Button>
              <Button type="submit" className="flex-1 h-12" disabled={isPending}>{t("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
