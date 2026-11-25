"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-full bg-bonnet px-6 font-bold">
      <Printer className="size-4" /> Print
    </button>
  );
}
