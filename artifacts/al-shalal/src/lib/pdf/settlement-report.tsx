import { createRoot } from "react-dom/client";
import { format } from "date-fns";

export type SettlementReportOp = {
  id: number;
  kind: "revenue" | "expense" | "transfer";
  amount: number;
  date: string;
  createdAt?: string;
  label?: string | null;
  subtype?: string | null;
};

export type SettlementReportData = {
  settlementId: number;
  driverName: string;
  driverVehicle?: string | null;
  driverPhone?: string | null;
  periodStart: string;
  periodEnd: string;
  generatedAt: Date;
  totalRevenue: number;
  totalExpenses: number;
  totalTransfers: number;
  netProfit: number;
  driverShare: number;
  ownerPayout: number;
  operations: SettlementReportOp[];
  labels: {
    title: string;
    establishmentName: string;
    establishmentLocation: string;
    establishmentPhone: string;
    driverName: string;
    vehicle: string;
    cycleStart: string;
    cycleEnd: string;
    generated: string;
    operationsTable: string;
    time: string;
    type: string;
    details: string;
    amount: string;
    totalRevenue: string;
    totalExpenses: string;
    totalTransfers: string;
    netProfit: string;
    driverShare: string;
    ownerPayout: string;
    paidAmount: string;
    balance: string;
    sar: string;
    revenue: string;
    expense: string;
    transfer: string;
    signatureOwner: string;
    signatureDriver: string;
  };
};

function fmtNum(n: number) {
  return n.toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ReportTemplate({ data }: { data: SettlementReportData }) {
  const l = data.labels;
  return (
    <div
      dir="rtl"
      style={{
        width: "794px",
        minHeight: "1123px",
        padding: "40px 48px",
        background: "#ffffff",
        color: "#0f172a",
        fontFamily: "'Noto Kufi Arabic', 'Tahoma', sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "3px solid #6c63ff", paddingBottom: 18, marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/icon-192.png" alt="logo" style={{ width: 64, height: 64, borderRadius: 8 }} crossOrigin="anonymous" />
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.2 }}>
              {l.establishmentName}
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{l.establishmentLocation}</div>
            <div style={{ fontSize: 11, color: "#475569" }}>{l.establishmentPhone}</div>
          </div>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{
            display: "inline-block", padding: "6px 14px",
            background: "#6c63ff", color: "white", borderRadius: 6,
            fontSize: 14, fontWeight: 700,
          }}>
            {l.title}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
            #{data.settlementId.toString().padStart(6, "0")}
          </div>
        </div>
      </div>

      {/* Driver & period info */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 12, marginBottom: 22,
        background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0",
      }}>
        <div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{l.driverName}</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{data.driverName}</div>
        </div>
        {data.driverVehicle && (
          <div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{l.vehicle}</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>{data.driverVehicle}</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{l.cycleStart}</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {format(new Date(data.periodStart), "dd / MM / yyyy")}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{l.cycleEnd}</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {format(new Date(data.periodEnd), "dd / MM / yyyy")}
          </div>
        </div>
      </div>

      {/* Operations table */}
      <div style={{ marginBottom: 22 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: "#1a1a2e",
          marginBottom: 8, paddingBottom: 4, borderBottom: "2px solid #e2e8f0",
        }}>
          {l.operationsTable} ({data.operations.length})
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#1a1a2e", color: "white" }}>
              <th style={{ padding: "8px 6px", textAlign: "right", width: 70 }}>{l.time}</th>
              <th style={{ padding: "8px 6px", textAlign: "right", width: 80 }}>{l.type}</th>
              <th style={{ padding: "8px 6px", textAlign: "right" }}>{l.details}</th>
              <th style={{ padding: "8px 6px", textAlign: "left", width: 110 }}>{l.amount} ({l.sar})</th>
            </tr>
          </thead>
          <tbody>
            {data.operations.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 14, textAlign: "center", color: "#94a3b8" }}>—</td></tr>
            ) : data.operations.map((op, i) => {
              const kindLabel = op.kind === "revenue" ? l.revenue : op.kind === "expense" ? l.expense : l.transfer;
              const color = op.kind === "revenue" ? "#15803d" : op.kind === "expense" ? "#b91c1c" : "#b45309";
              return (
                <tr key={`${op.kind}-${op.id}`} style={{ background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                  <td style={{ padding: "6px", borderBottom: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: 10 }}>
                    {op.createdAt ? format(new Date(op.createdAt), "dd/MM HH:mm") : format(new Date(op.date), "dd/MM")}
                  </td>
                  <td style={{ padding: "6px", borderBottom: "1px solid #e2e8f0", color, fontWeight: 600 }}>
                    {kindLabel}{op.subtype ? ` · ${op.subtype}` : ""}
                  </td>
                  <td style={{ padding: "6px", borderBottom: "1px solid #e2e8f0" }}>{op.label || "—"}</td>
                  <td style={{ padding: "6px", borderBottom: "1px solid #e2e8f0", textAlign: "left", fontFamily: "monospace", fontWeight: 600, color }}>
                    {fmtNum(op.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{
        background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
        padding: 16, marginBottom: 24,
      }}>
        {[
          { label: l.totalRevenue, val: data.totalRevenue, color: "#15803d" },
          { label: l.totalExpenses, val: data.totalExpenses, color: "#b91c1c" },
          { label: l.paidAmount, val: data.totalTransfers, color: "#b45309" },
          { label: l.netProfit, val: data.netProfit, color: "#1a1a2e", bold: true },
          { label: l.driverShare, val: data.driverShare, color: "#0f766e" },
          { label: l.balance + ` (${l.ownerPayout})`, val: data.ownerPayout, color: "#6c63ff", bold: true, highlight: true },
        ].map((row, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 4px",
            borderBottom: i < 5 ? "1px solid #e2e8f0" : "none",
            background: row.highlight ? "#eef2ff" : "transparent",
            margin: row.highlight ? "4px -8px -8px" : 0,
            padding2: row.highlight ? "12px 12px" : undefined,
            borderRadius: row.highlight ? 6 : 0,
          } as any}>
            <span style={{ fontSize: 13, color: "#475569", fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
            <span style={{
              fontSize: row.bold ? 18 : 14,
              fontWeight: row.bold ? 800 : 600,
              fontFamily: "monospace", color: row.color,
            }}>
              {fmtNum(row.val)} {l.sar}
            </span>
          </div>
        ))}
      </div>

      {/* Signatures */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 48 }}>
        {[l.signatureOwner, l.signatureDriver].map(label => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #94a3b8", paddingTop: 6, fontSize: 11, color: "#475569" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 28, paddingTop: 12, borderTop: "1px solid #e2e8f0",
        fontSize: 10, color: "#94a3b8", textAlign: "center",
      }}>
        {l.generated}: {format(data.generatedAt, "yyyy-MM-dd HH:mm")}
      </div>
    </div>
  );
}

export async function generateSettlementPdf(data: SettlementReportData): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-10000px";
  container.style.left = "0";
  container.style.zIndex = "-1";
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(<ReportTemplate data={data} />);

  // Wait for fonts + images to settle
  await new Promise(r => setTimeout(r, 250));
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* ignore */ }
  }

  try {
    const target = container.firstElementChild as HTMLElement;
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= pageH) {
      pdf.addImage(imgData, "JPEG", 0, 0, imgW, imgH);
    } else {
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
    }
    return pdf.output("blob");
  } finally {
    // Unmount React root, then detach container (deferred to next tick to avoid sync unmount warning)
    try {
      setTimeout(() => {
        try { root.unmount(); } catch { /* ignore */ }
        try { container.remove(); } catch { /* ignore */ }
      }, 0);
    } catch { /* ignore */ }
  }
}

export async function sharePdf(blob: Blob, filename: string, whatsappFallbackText?: string) {
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (err) {
      // user cancelled — silently ignore
      if ((err as Error).name === "AbortError") return;
    }
  }
  // Fallback: download + open wa.me with text
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (whatsappFallbackText) {
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappFallbackText)}`, "_blank");
  }
}
