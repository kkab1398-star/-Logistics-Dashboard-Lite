import { useState } from "react";
import { useI18n, dictionary } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useListExpenses, getListExpensesQueryKey, useUpdateExpense, useDeleteExpense } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Search, Image as ImageIcon, Pencil, X, Check, Trash2, Fuel, AlertCircle, Droplets, Settings2, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const EXPENSE_TYPES = ["diesel", "oil", "maintenance", "other"] as const;
type ExpenseType = typeof EXPENSE_TYPES[number];

const DIESEL_PRICE = 1.79;

type EditForm = {
  type: ExpenseType;
  amount: string;
  liters: string;
  notes: string;
  date: string;
};

export default function ExpensesList() {
  const { t, lang } = useI18n();
  const { role, driverId } = useAuth();
  const queryClient = useQueryClient();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const isRtl = lang === "ar" || lang === "ur";

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ type: "diesel", amount: "", liters: "", notes: "", date: "" });
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  async function handleDelete(id: number) {
    try {
      await deleteExpense.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey({}) });
      setConfirmDeleteId(null);
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
    } catch {
      setConfirmDeleteId(null);
    }
  }

  const { data: expenses, isLoading } = useListExpenses(
    {},
    { query: { queryKey: getListExpensesQueryKey({}) } }
  );

  const activeParams = role === "driver" && driverId ? { driverId, activeOnly: true } : { activeOnly: true };
  const { data: activeExpenses } = useListExpenses(
    activeParams,
    { query: { queryKey: getListExpensesQueryKey(activeParams), enabled: role === "driver" && !!driverId } }
  );

  const hasNoCurrentCycleExpenses =
    role === "driver" &&
    Array.isArray(activeExpenses) &&
    activeExpenses.length === 0 &&
    Array.isArray(expenses) &&
    expenses.length > 0;

  const dieselSummary = (() => {
    if (role !== "driver" || !Array.isArray(activeExpenses)) return null;
    const dieselEntries = activeExpenses.filter(e => e.type === "diesel");
    let totalAmount = 0;
    let totalLiters = 0;
    for (const e of dieselEntries) {
      const amt = Number(e.amount) || 0;
      totalAmount += amt;
      const liters = e.liters != null ? Number(e.liters) : (amt > 0 ? amt / DIESEL_PRICE : 0);
      if (!isNaN(liters)) totalLiters += liters;
    }
    return { count: dieselEntries.length, totalAmount, totalLiters };
  })();

  function startEdit(expense: { id: number; type: string; amount: string | number; liters?: string | number | null; notes?: string | null; date: string }) {
    const amt = Number(expense.amount);
    const isDiesel = expense.type === "diesel";
    setEditingId(expense.id);
    setEditForm({
      type: expense.type as ExpenseType,
      amount: String(amt),
      liters: isDiesel && amt > 0 ? String((amt / DIESEL_PRICE).toFixed(2)) : (expense.liters != null ? String(Number(expense.liters)) : ""),
      notes: expense.notes ?? "",
      date: expense.date,
    });
    setEditSuccess(false);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(id: number) {
    const amount = parseFloat(editForm.amount);
    if (isNaN(amount) || amount <= 0) return;
    const litersRaw = editForm.liters.trim();
    const liters = litersRaw !== "" ? parseFloat(litersRaw) : null;
    if (liters !== null && isNaN(liters)) return;
    setEditError(null);
    try {
      await updateExpense.mutateAsync({
        id,
        data: {
          type: editForm.type,
          amount,
          liters,
          notes: editForm.notes.trim() || null,
          date: editForm.date,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey({}) });
      setEditingId(null);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch {
      setEditError(
        lang === "ar"
          ? "فشل التحديث. حاول مرة أخرى."
          : lang === "ur"
          ? "اپ ڈیٹ ناکام۔ دوبارہ کوشش کریں۔"
          : "Update failed. Please try again."
      );
    }
  }

  const getTypeStyle = (type: string) => {
    switch(type) {
      case 'diesel': return { bg: 'bg-amber-500', icon: Fuel, color: 'text-amber-600', light: 'bg-amber-50' };
      case 'oil': return { bg: 'bg-emerald-500', icon: Droplets, color: 'text-emerald-600', light: 'bg-emerald-50' };
      case 'maintenance': return { bg: 'bg-blue-500', icon: Settings2, color: 'text-blue-600', light: 'bg-blue-50' };
      default: return { bg: 'bg-slate-500', icon: Receipt, color: 'text-slate-600', light: 'bg-slate-50' };
    }
  };

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 pb-10 ${isRtl ? "font-arabic" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Floating Status Alerts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
        {editSuccess && <Badge className="bg-emerald-500 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-right-full"><Check className="h-5 w-5" /> {t("expenseUpdated")}</Badge>}
        {deleteSuccess && <Badge className="bg-red-500 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-right-full"><Trash2 className="h-5 w-5" /> {t("expenseDeleted")}</Badge>}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-lg shadow-slate-900/10">
            <Receipt className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t("expenses")}</h1>
            <p className="text-slate-500 text-xs font-medium mt-1">تتبع تكاليف التشغيل، المحروقات، وصيانة المعدات</p>
          </div>
        </div>
      </div>

      {dieselSummary && (
        <Card className="border-none bg-slate-900 text-white shadow-2xl shadow-slate-900/20 rounded-3xl overflow-hidden relative">
          <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[150%] bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
          <CardHeader className="pb-3 relative z-10 border-b border-white/5">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-amber-400">
              <Fuel className="h-5 w-5" />
              {t("dieselSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 relative z-10">
            {dieselSummary.count === 0 ? (
              <p className="text-sm text-slate-400 italic font-medium py-4 text-center">{t("noDieselThisCycle")}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-md hover:bg-white/10 transition-colors">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t("totalLiters")}</p>
                  <p className="text-3xl font-black text-white leading-none" dir="ltr">
                    {dieselSummary.totalLiters.toFixed(2)}
                    <span className="text-xs font-bold text-amber-500 ms-2">{t("liters")}</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-md hover:bg-white/10 transition-colors">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t("totalDieselCost")}</p>
                  <p className="text-3xl font-black text-white leading-none" dir="ltr">
                    {dieselSummary.totalAmount.toFixed(2)}
                    <span className="text-xs font-bold text-emerald-500 ms-2">{t("sar")}</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-md hover:bg-white/10 transition-colors">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t("dieselEntries")}</p>
                  <p className="text-3xl font-black text-white leading-none" dir="ltr">{dieselSummary.count}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">إجمالي فواتير التعبئة</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-3xl bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 p-6 bg-slate-50/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-slate-400" />
              سجل كافة المصاريف
            </CardTitle>
            {hasNoCurrentCycleExpenses && (
              <Badge variant="outline" className="text-[10px] font-bold text-slate-400 border-slate-200">{t("noCurrentCycleExpenses")}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : expenses && expenses.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {expenses.map((expense) => {
                const style = getTypeStyle(expense.type);
                const Icon = style.icon;
                return (
                  <div key={expense.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                    <div className="flex items-stretch min-h-[100px]">
                      <div className={`w-1.5 shrink-0 ${style.bg}`} />
                      <div className="flex-1 p-5 md:p-6">
                        {editingId === expense.id ? (
                          <div className="space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t("expenseType")}</Label>
                                <select
                                  value={editForm.type}
                                  onChange={e => {
                                    const newType = e.target.value as ExpenseType;
                                    setEditForm(f => {
                                      const amt = parseFloat(f.amount);
                                      const newLiters = newType === "diesel" && !isNaN(amt) && amt > 0
                                        ? (amt / DIESEL_PRICE).toFixed(2)
                                        : f.liters;
                                      return { ...f, type: newType, liters: newLiters };
                                    });
                                  }}
                                  className="h-11 w-full rounded-xl border-none ring-1 ring-slate-200 bg-slate-50 px-3 text-sm font-bold transition-all focus:ring-2 focus:ring-slate-900"
                                >
                                  {EXPENSE_TYPES.map(type => (
                                    <option key={type} value={type}>{t(type as keyof typeof dictionary)}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t("amount")}</Label>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  value={editForm.amount}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setEditForm(f => {
                                      const amt = parseFloat(val);
                                      const newLiters = f.type === "diesel" && !isNaN(amt) && amt > 0
                                        ? (amt / DIESEL_PRICE).toFixed(2)
                                        : f.liters;
                                      return { ...f, amount: val, liters: newLiters };
                                    });
                                  }}
                                  className="h-11 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 text-lg font-black"
                                  dir="ltr"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                  {t("liters")}
                                  {editForm.type === "diesel" && <span className="ms-1 text-[9px] opacity-60">({DIESEL_PRICE}/L)</span>}
                                </Label>
                                {editForm.type === "diesel" ? (
                                  <div className="h-11 flex items-center px-4 rounded-xl border border-slate-100 bg-slate-100 text-sm font-black text-slate-500" dir="ltr">
                                    {editForm.liters || "—"}
                                  </div>
                                ) : (
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    value={editForm.liters}
                                    onChange={e => setEditForm(f => ({ ...f, liters: e.target.value }))}
                                    className="h-11 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 font-bold"
                                    dir="ltr"
                                  />
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t("date")}</Label>
                                <Input
                                  type="date"
                                  value={editForm.date}
                                  onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                                  className="h-11 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 font-bold"
                                  dir="ltr"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t("notes")}</Label>
                              <Input
                                value={editForm.notes}
                                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                                className="h-11 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 font-medium"
                                placeholder="أضف أي ملاحظات إضافية هنا..."
                              />
                            </div>
                            {editError && <p className="text-[10px] font-bold text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {editError}</p>}
                            <div className="flex gap-2 pt-2">
                              <Button size="sm" className="flex-1 h-12 bg-slate-900 rounded-xl font-bold shadow-lg" onClick={() => saveEdit(expense.id)} disabled={updateExpense.isPending}>
                                <Check className="h-4 w-4 me-2" /> {t("save")}
                              </Button>
                              <Button size="sm" variant="outline" className="h-12 rounded-xl font-bold border-slate-200" onClick={cancelEdit} disabled={updateExpense.isPending}>
                                <X className="h-4 w-4 me-2" /> {t("cancel")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-start gap-4">
                              <div className={`${style.light} p-4 rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                <Icon className={`h-6 w-6 ${style.color}`} />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-black text-slate-900 text-lg leading-tight tracking-tight">{t(expense.type as keyof typeof dictionary)}</p>
                                  {expense.invoiceImageUrl && (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <button className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[10px] font-black hover:bg-blue-100 transition-colors">
                                          <ImageIcon className="h-3 w-3" /> عرض الفاتورة
                                        </button>
                                      </DialogTrigger>
                                      <DialogContent className="border-none shadow-2xl p-0 max-w-lg bg-transparent overflow-hidden">
                                        <div className="p-2">
                                          <img src={expense.invoiceImageUrl} alt="Invoice" className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                   <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md"><CalendarDays className="h-3 w-3" /> {format(new Date(expense.date), "dd/MM/yyyy")}</div>
                                   {expense.liters && <div className="flex items-center gap-1"><Droplets className="h-3 w-3 text-amber-500" /> {expense.liters} {t("liters")}</div>}
                                </div>
                                {expense.notes && (
                                  <p className="text-xs font-medium text-slate-500 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100 line-clamp-2 italic leading-relaxed">"{expense.notes}"</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-6 md:min-w-[200px]">
                              <div className="text-right">
                                <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{Number(expense.amount).toFixed(2)}</p>
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">{t("sar")}</p>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {!expense.settlementId ? (
                                  confirmDeleteId === expense.id ? (
                                    <div className="flex items-center gap-1 animate-in zoom-in-95">
                                      <Button size="sm" variant="destructive" className="h-10 rounded-xl text-[10px] font-black px-3" onClick={() => handleDelete(expense.id)} disabled={deleteExpense.isPending}>نعم، حذف</Button>
                                      <Button size="sm" variant="ghost" className="h-10 w-10 p-0 rounded-xl" onClick={() => setConfirmDeleteId(null)} disabled={deleteExpense.isPending}><X className="h-4 w-4 text-slate-400" /></Button>
                                    </div>
                                  ) : (
                                    <>
                                      <Button size="sm" variant="ghost" className="h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100" onClick={() => startEdit(expense)}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => setConfirmDeleteId(expense.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )
                                ) : (
                                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100" title="تمت التسوية - لا يمكن التعديل">
                                    <Lock className="h-4 w-4 text-slate-300" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-20 text-center text-slate-300">
              <Search className="h-16 w-16 mx-auto mb-4 opacity-10" />
              <p className="text-sm font-black uppercase tracking-[0.2em]">{role === "driver" ? t("noCurrentCycleExpenses") : t("noExpenses")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}