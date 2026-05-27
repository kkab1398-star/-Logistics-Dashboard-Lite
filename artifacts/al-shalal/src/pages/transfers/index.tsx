import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useListTransfers, getListTransfersQueryKey, useUpdateTransfer, useDeleteTransfer } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpFromLine, Pencil, X, Check, Trash2 } from "lucide-react";
import { format } from "date-fns";

type TransferItem = {
  id: number;
  driverId: number;
  amount: number | string;
  description?: string | null;
  date: string;
  settlementId?: number | null;
  createdAt: string;
};

type EditForm = {
  amount: string;
  description: string;
  date: string;
};

export default function TransferList() {
  const { t, lang } = useI18n();
  const { driverId, role } = useAuth();
  const [, setLocation] = useLocation();
  const [allTime, setAllTime] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ amount: "", description: "", date: "" });
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const updateTransfer = useUpdateTransfer();
  const deleteTransfer = useDeleteTransfer();

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  async function handleDelete(id: number) {
    try {
      await deleteTransfer.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getListTransfersQueryKey(params) });
      setConfirmDeleteId(null);
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
    } catch {
      setConfirmDeleteId(null);
    }
  }

  useEffect(() => {
    if (role !== "driver" || !driverId) {
      setLocation("/");
    }
  }, [role, driverId, setLocation]);

  const params = { driverId: driverId ?? 0, activeOnly: !allTime };

  const { data: transfers, isLoading } = useListTransfers(
    params,
    { query: { queryKey: getListTransfersQueryKey(params), enabled: !!driverId && role === "driver" } }
  );

  function startEdit(tr: TransferItem) {
    setEditingId(tr.id);
    setEditForm({
      amount: String(Number(tr.amount)),
      description: tr.description ?? "",
      date: tr.date,
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
    setEditError(null);
    try {
      await updateTransfer.mutateAsync({
        id,
        data: {
          amount,
          description: editForm.description.trim() || null,
          date: editForm.date,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListTransfersQueryKey(params) });
      setEditingId(null);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        setEditError(t("transferSettledError"));
      } else {
        setEditError(
          lang === "ar"
            ? "فشل التحديث. حاول مرة أخرى."
            : lang === "ur"
            ? "اپ ڈیٹ ناکام۔ دوبارہ کوشش کریں۔"
            : "Update failed. Please try again."
        );
      }
    }
  }

  const fmt = (n: string | number) =>
    Number(n).toLocaleString("en-SA", { minimumFractionDigits: 2 });

  const sorted: TransferItem[] = transfers
    ? [...(transfers as TransferItem[])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : [];

  const total = sorted.reduce((sum, tr) => sum + Number(tr.amount), 0);

  return (
    <div className="space-y-6 pb-8">
      {editSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4" />
          {t("transferUpdated")}
        </div>
      )}
      {deleteSuccess && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 flex items-center gap-2">
          <Trash2 className="h-4 w-4" />
          {t("transferDeleted")}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-full">
            <ArrowUpFromLine className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("transferList")}</h1>
          </div>
        </div>
        {sorted.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t("totalTransfers")}</p>
            <p className="text-xl font-bold text-amber-700">
              {fmt(total)} <span className="text-sm font-normal">{t("sar")}</span>
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-1 bg-muted rounded-lg p-1">
        <button
          onClick={() => setAllTime(false)}
          className={`flex-1 text-sm font-medium py-1.5 px-3 rounded-md transition-colors ${
            !allTime
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("currentCycle")}
        </button>
        <button
          onClick={() => setAllTime(true)}
          className={`flex-1 text-sm font-medium py-1.5 px-3 rounded-md transition-colors ${
            allTime
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("allTime")}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed rounded-xl">
          <ArrowUpFromLine className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">{allTime ? t("noTransfers") : t("noCurrentCycleTransfers")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(tr => (
            <Card key={tr.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  <div className="w-1.5 bg-amber-500 shrink-0" />
                  <div className="flex-1 p-4 space-y-3">
                    {editingId === tr.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{t("amount")}</Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={editForm.amount}
                              onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                              className="h-8 text-sm"
                              dir="ltr"
                            />
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
                          <Label className="text-xs text-muted-foreground">{t("description")}</Label>
                          <Input
                            value={editForm.description}
                            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
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
                            onClick={() => saveEdit(tr.id)}
                            disabled={updateTransfer.isPending}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {t("save")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            onClick={cancelEdit}
                            disabled={updateTransfer.isPending}
                          >
                            <X className="h-3.5 w-3.5" />
                            {t("cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {tr.description && (
                              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {tr.description}
                              </span>
                            )}
                            {tr.settlementId && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 h-4 bg-blue-50 text-blue-600 border border-blue-200"
                              >
                                {t("settled")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                            {format(new Date(tr.date), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="font-bold text-amber-700 text-lg leading-none">
                              {fmt(tr.amount)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{t("sar")}</p>
                          </div>
                          {!tr.settlementId && (
                            confirmDeleteId === tr.id ? (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="gap-1 text-xs shrink-0"
                                  onClick={() => handleDelete(tr.id)}
                                  disabled={deleteTransfer.isPending}
                                >
                                  <Check className="h-3 w-3" />
                                  {t("confirm")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-xs shrink-0"
                                  onClick={() => setConfirmDeleteId(null)}
                                  disabled={deleteTransfer.isPending}
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
                                  onClick={() => startEdit(tr)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  {t("editTransfer")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-xs shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                                  onClick={() => setConfirmDeleteId(tr.id)}
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
