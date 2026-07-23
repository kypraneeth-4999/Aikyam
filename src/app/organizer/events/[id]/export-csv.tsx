"use client";

type Row = Record<string, string | number>;

export function ExportCsv({
  rows,
  headers,
  filename,
}: {
  rows: Row[];
  headers: string[];
  filename: string;
}) {
  function download() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.map(esc).join(","),
      ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
    ].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-cream transition-colors hover:border-gold/30"
    >
      Export CSV
    </button>
  );
}
