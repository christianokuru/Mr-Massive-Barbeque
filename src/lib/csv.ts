/** CSV helpers with formula-injection protection. */

/** Cells starting with = + - @ tab or CR are prefixed with ' so spreadsheets treat them as text. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export function csvResponse(filename: string, rows: unknown[][]) {
  return new Response("﻿" + toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Escape % _ \ for LIKE / ILIKE patterns. */
export function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** JSON for <script type="application/ld+json">, safe against </script> injection. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
