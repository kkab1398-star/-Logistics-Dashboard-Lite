import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  useListDrivers, getListDriversQueryKey,
  useUpdateDriver, useDeleteDriver,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Truck, PlusCircle, User, Scale, Pencil, Trash2, Lock, Unlock } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function DriversList() {
  const { t, lang } = useI18n();
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isRtl = lang === "ar" || lang === "ur";

  const { data: drivers, isLoading } = useListDrivers(
    { query: { queryKey: getListDriversQueryKey() } }
  );

  const { mutate: updateDriver } = useUpdateDriver();
  const { mutate: deleteDriver } = useDeleteDriver();

  const handleToggleFreeze = (id: number, isFrozen: boolean) => {
    updateDriver({ id, data: { status: isFrozen ? "active" : "frozen" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: isFrozen ? t("driverUnfrozen") : t("driverFrozen") });
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteDriver({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: t("driverDeleted") });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("drivers")}</h1>
        {role === "admin" && (
          <Link href="/drivers/new">
            <Button size="lg" className="w-full sm:w-auto shadow-md">
              <PlusCircle className={`h-5 w-5 ${isRtl ? "ml-2" : "mr-2"}`} />
              {t("addDriver")}
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))
        ) : drivers && drivers.length > 0 ? (
          drivers.map(driver => {
            const isFrozen = driver.status === "frozen";
            return (
              <Card key={driver.id} className={`overflow-hidden transition-colors ${isFrozen ? "border-amber-300/60 bg-amber-50/30" : "hover:border-primary/50"}`}>
                <div className={`p-4 border-b flex items-center gap-3 ${isFrozen ? "bg-amber-50/50" : "bg-primary/5"}`}>
                  <div className={`p-2 rounded-full text-primary-foreground ${isFrozen ? "bg-amber-400" : "bg-primary"}`}>
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg leading-tight truncate">{driver.name}</h3>
                      {isFrozen && (
                        <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 bg-amber-50 shrink-0">
                          {t("frozen")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      @{driver.username} · {format(new Date(driver.createdAt), "MMM yyyy")}
                    </p>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Badge variant="outline" className="font-mono text-xs">{driver.vehicleNumber}</Badge>
                  </div>
                  {driver.phone && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2 ps-7">
                      {driver.phone}
                    </div>
                  )}

                  {role === "admin" && (
                    <div className="pt-2 border-t space-y-2">
                      <div className="flex gap-2">
                        <Link href={`/drivers/${driver.id}/settle`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full gap-1.5">
                            <Scale className="h-3.5 w-3.5" />
                            {t("settle")}
                          </Button>
                        </Link>
                        <Link href={`/drivers/${driver.id}/edit`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full gap-1.5">
                            <Pencil className="h-3.5 w-3.5" />
                            {t("editDriver")}
                          </Button>
                        </Link>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`flex-1 gap-1.5 ${isFrozen ? "border-green-400 text-green-700 hover:bg-green-50" : "border-amber-400 text-amber-700 hover:bg-amber-50"}`}
                          onClick={() => handleToggleFreeze(driver.id, isFrozen)}>
                          {isFrozen ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          {isFrozen ? t("unfreezeDriver") : t("freezeDriver")}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                              {t("deleteDriver")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("confirmDeleteMsg")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDelete(driver.id)}>
                                {t("deleteDriver")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full p-8 text-center text-muted-foreground border rounded-xl border-dashed">
            <Truck className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>{t("noExpenses")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
