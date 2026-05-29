import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  useListDrivers, getListDriversQueryKey,
  useUpdateDriver, useDeleteDriver,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Truck, PlusCircle, User, Scale, Pencil, Trash2, Lock, Unlock, Phone, CalendarDays, MoreHorizontal, ShieldCheck } from "lucide-react";
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
        toast({ title: isFrozen ? "تم تفعيل حساب السائق بنجاح" : "تم تجميد حساب السائق" });
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteDriver({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: t("driverDeleted"), variant: "destructive" });
      },
    });
  };

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 pb-10 ${isRtl ? "font-arabic" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Dynamic Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="bg-slate-900 p-2 rounded-xl"><ShieldCheck className="h-5 w-5 text-white" /></div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t("drivers")}</h1>
          </div>
          <p className="text-slate-500 text-xs font-medium">إدارة القوى العاملة، تتبع الشاحنات، ومراقبة الحالات التشغيلية لسائقي الشلال</p>
        </div>
        {role === "admin" && (
          <Link href="/drivers/new">
            <Button size="lg" className="w-full md:w-auto h-13 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-600/20 gap-3 transition-all active:scale-95">
              <PlusCircle className="h-5 w-5" />
              {t("addDriver")}
            </Button>
          </Link>
        )}
      </div>

      {/* Drivers Responsive Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-3xl" />
          ))
        ) : drivers && drivers.length > 0 ? (
          drivers.map(driver => {
            const isFrozen = driver.status === "frozen";
            return (
              <Card key={driver.id} className={`group border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${isFrozen ? "bg-slate-50 opacity-90" : "bg-white"}`}>
                
                {/* Status Top Bar */}
                <div className={`h-1.5 w-full ${isFrozen ? "bg-amber-400" : "bg-emerald-500"}`} />
                
                <div className="p-6">
                  {/* Driver Profile Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-2xl shadow-inner ${isFrozen ? "bg-slate-200 text-slate-400" : "bg-blue-50 text-blue-600"}`}>
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-900 text-lg leading-none">{driver.name}</h3>
                          {isFrozen && (
                            <Badge className="bg-amber-100 text-amber-700 border-none rounded-lg text-[9px] font-black uppercase tracking-widest">{t("frozen")}</Badge>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">@{driver.username}</p>
                      </div>
                    </div>
                  </div>

                  {/* Core Fleet Data Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50 flex flex-col items-center justify-center text-center">
                       <Truck className="h-4 w-4 text-slate-400 mb-1.5" />
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">رقم المعدة</p>
                       <span className="font-mono text-sm font-black text-slate-900">{driver.vehicleNumber}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50 flex flex-col items-center justify-center text-center">
                       <CalendarDays className="h-4 w-4 text-slate-400 mb-1.5" />
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">انضم في</p>
                       <span className="text-xs font-black text-slate-900">{format(new Date(driver.createdAt), "MMM yyyy")}</span>
                    </div>
                  </div>

                  {driver.phone && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-blue-50/30 border border-blue-100/50 rounded-2xl mb-6">
                      <Phone className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs font-black text-blue-900 font-mono tracking-tighter" dir="ltr">{driver.phone}</span>
                    </div>
                  )}

                  {/* Admin Specific Action Controls */}
                  {role === "admin" && (
                    <div className="pt-5 border-t border-slate-100 space-y-3">
                      <div className="flex gap-2">
                        <Link href={`/drivers/${driver.id}/settle`} className="flex-1">
                          <Button variant="outline" className="w-full h-10 rounded-xl bg-white border-slate-200 text-slate-700 font-black text-xs gap-2 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                            <Scale className="h-3.5 w-3.5" />
                            {t("settle")}
                          </Button>
                        </Link>
                        <Link href={`/drivers/${driver.id}/edit`} className="flex-1">
                          <Button variant="outline" className="w-full h-10 rounded-xl bg-white border-slate-200 text-slate-700 font-black text-xs gap-2 hover:bg-slate-50 shadow-sm">
                            <Pencil className="h-3.5 w-3.5" />
                            {t("editDriver")}
                          </Button>
                        </Link>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          className={`flex-1 h-10 rounded-xl font-black text-[10px] gap-2 transition-all ${isFrozen ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                          onClick={() => handleToggleFreeze(driver.id, isFrozen)}>
                          {isFrozen ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          {isFrozen ? "إعادة التفعيل" : "تجميد الحساب"}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" className="h-10 w-12 rounded-xl p-0 bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-black text-slate-900">هل أنت متأكد من الحذف؟</AlertDialogTitle>
                              <AlertDialogDescription className="font-medium text-slate-500">
                                سيتم حذف السائق (<strong>{driver.name}</strong>) نهائياً من النظام. لا يمكن التراجع عن هذا الإجراء وسيؤثر على سجلات التقارير المرتبطة به.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel className="rounded-xl font-bold border-slate-200">{t("cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-black"
                                onClick={() => handleDelete(driver.id)}>
                                حذف السائق الآن
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center border-4 border-dashed border-slate-100 rounded-[40px] bg-slate-50/30">
            <User className="h-20 w-20