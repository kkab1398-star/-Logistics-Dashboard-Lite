import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBusinessConfig, saveBusinessConfig } from "@/lib/business-config";
import { openWhatsApp } from "@/lib/whatsapp";
import { MessageCircle, Settings2 } from "lucide-react";

interface WhatsAppNotifyDialogProps {
  open: boolean;
  onClose: () => void;
  message: string;
}

export function WhatsAppNotifyDialog({ open, onClose, message }: WhatsAppNotifyDialogProps) {
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [view, setView] = useState<"send" | "setup">("send");

  useEffect(() => {
    if (open) {
      const config = getBusinessConfig();
      setPhone(config.ownerWhatsApp || "");
      setView(config.ownerWhatsApp ? "send" : "setup");
    }
  }, [open]);

  const handleSend = () => {
    if (!phone) { setView("setup"); return; }
    saveBusinessConfig({ ownerWhatsApp: phone });
    openWhatsApp(phone, message);
    onClose();
  };

  const handleSaveAndSend = () => {
    if (!phone) return;
    saveBusinessConfig({ ownerWhatsApp: phone });
    openWhatsApp(phone, message);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        {view === "send" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                {t("notifyOwner")}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {phone}
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-52 overflow-auto border">
              {message}
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setView("setup")}>
                <Settings2 className="h-3.5 w-3.5" />
                Change Number
              </Button>
              <Button className="gap-2 bg-green-600 hover:bg-green-700 flex-1" onClick={handleSend}>
                <MessageCircle className="h-4 w-4" />
                {t("shareWhatsApp")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {t("ownerWhatsApp")}
              </DialogTitle>
              <DialogDescription>{t("ownerWhatsAppHint")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>{t("ownerWhatsApp")}</Label>
              <Input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+966501234567"
                className="h-12 text-lg"
                dir="ltr"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setView("send")} disabled={!phone}>{t("cancel")}</Button>
              <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={handleSaveAndSend} disabled={!phone}>
                <MessageCircle className="h-4 w-4" />
                {t("save")} & {t("shareWhatsApp")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
