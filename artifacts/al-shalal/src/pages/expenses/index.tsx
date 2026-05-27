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
import { Receipt, Search, Image as ImageIcon, Pencil, X, Check, Trash2, Fuel } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

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

  return (
    <div className="space-y-6">
      {editSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4" />
          {t("expenseUpdated")}
        </div>
      )}
      {deleteSuccess && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 flex items-center gap-2">
          <Trash2 className="h-4 w-4" />
          {t("expenseDeleted")}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("expenses")}</h1>
      </div>

      {dieselSummary && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Fuel className="h-4 w-4 text-primary" />
              {t("dieselSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dieselSummary.count === 0 ? (
              <p className="text-sm text-muted-foreground italic">{t("noDieselThisCycle")}</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md bg-background border p-3">
                  <p className="text-xs text-muted-foreground">{t("totalLiters")}</p>
                  <p className="text-xl font-bold mt-1" dir="ltr">
                    {dieselSummary.totalLiters.toFixed(2)}
                    <span className="text-xs font-normal text-muted-foreground ms-1">{t("liters")}</span>
                  </p>
                </div>
                <div className="rounded-md bg-background border p-3">
                  <p className="text-xs text-muted-foreground">{t("totalDieselCost")}</p>
                  <p className="text-xl font-bold mt-1" dir="ltr">
                    {dieselSummary.totalAmount.toFixed(2)}
                    <span className="text-xs font-normal text-muted-foreground ms-1">{t("sar")}</span>
                  </p>
                </div>
                <div className="rounded-md bg-background border p-3">
                  <p className="text-xs text-muted-foreground">{t("dieselEntries")}</p>
                  <p className="text-xl font-bold mt-1" dir="ltr">{dieselSummary.count}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>{t("all")}</CardTitle>
            {hasNoCurrentCycleExpenses && (
              <p className="text-[11px] text-muted-foreground italic leading-snug">{t("noCurrentCycleExpenses")}</p>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : expenses && expenses.length > 0 ? (
            <div className="divide-y">
              {expenses.map((expense) => (
                <div key={expense.id} className="p-4 hover:bg-muted/50 transition-colors">
                  {editingId === expense.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t("expenseType")}</Label>
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
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                          >
                            {EXPENSE_TYPES.map(type => (
                              <option key={type} value={type}>{t(type as keyof typeof dictionary)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t("amount")}</Label>
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
                            className="h-8 text-sm"
                            dir="ltr"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            {t("liters")}
                            {editForm.type === "diesel" && (
                              <span className="text-[10px] text-muted-foreground font-normal ms-1">
                                ({DIESEL_PRICE} {t("sar")}/L)
                              </span>
                            )}
                          </Label>
                          {editForm.type === "diesel" ? (
                            <div className="h-8 flex items-center px-2 rounded-md border border-input bg-muted/40 text-sm text-muted-foreground font-mono" dir="ltr">
                              {editForm.liters || "—"}
                            </div>
                          ) : (
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={editForm.liters}
                              onChange={e => setEditForm(f => ({ ...f, liters: e.target.value }))}
                              className="h-8 text-sm"
                              dir="ltr"
                            />
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t("date")}</Label>
                          <Input
                            type="date"
                            value={editForm.date}
                            onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                            className="h-8 text-sm"
                            dir="ltr"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t("notes")}</Label>
                        <Input
                          value={editForm.notes}
                          onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      {editError && (
                        <p className="text-xs text-red-600">{editError}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5 text-xs"
                          onClick={() => saveEdit(expense.id)}
                          disabled={updateExpense.isPending}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t("save")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={cancelEdit}
                          disabled={updateExpense.isPending}
                        >
                          <X className="h-3.5 w-3.5" />
                          {t("cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-3 rounded-full hidden sm:block">
                            <Receipt className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-lg">{t(expense.type as keyof typeof dictionary)}</p>
                              {expense.invoiceImageUrl && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <div className="cursor-pointer border rounded-md p-0.5 bg-muted">
                                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md">
                                    <div className="flex items-center justify-center p-4">
                                      <img src={expense.invoiceImageUrl} alt="Invoice" className="max-w-full max-h-[80vh] object-contain rounded-md" />
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(expense.date), "PPP")}
                              {expense.liters ? ` • ${expense.liters} ${t("liters")}` : ""}
                            </p>
                            {expense.notes && (
                              <p className="text-sm mt-1 bg-muted/50 p-2 rounded-md">{expense.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-start sm:self-center">
                        <div className="text-right">
                          <p className="font-bold text-lg">{Number(expense.amount).toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">{t("sar")}</p>
                        </div>
                        {!expense.settlementId && (
                          confirmDeleteId === expense.id ? (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1 text-xs shrink-0"
                                onClick={() => handleDelete(expense.id)}
                                disabled={deleteExpense.isPending}
                              >
                                <Check className="h-3 w-3" />
                                {t("confirm")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-xs shrink-0"
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={deleteExpense.isPending}
                              >
                                <X className="h-3 w-3" />
                                {t("cancel")}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs shrink-0"
                                onClick={() => startEdit(expense)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                {t("editExpense")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                                onClick={() => setConfirmDeleteId(expense.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {t("deleteExpense")}
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
              <Search className="h-12 w-12 mb-3 opacity-20" />
              <p>{role === "driver" ? t("noCurrentCycleExpenses") : t("noExpenses")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
