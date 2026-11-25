"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Opts = { title: string; body?: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean };
type State = (Opts & { resolve: (v: boolean) => void }) | null;

let state: State = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function close(value: boolean) {
  state?.resolve(value);
  state = null;
  emit();
}

/** Styled replacement for window.confirm(): `if (await confirm({ title })) …` */
export function useConfirm() {
  return useCallback(
    (opts: Opts) =>
      new Promise<boolean>((resolve) => {
        state?.resolve(false);
        state = { ...opts, resolve };
        emit();
      }),
    [],
  );
}

/** Mounted once in the root layout. */
export function ConfirmHost() {
  const s = useSyncExternalStore(subscribe, () => state, () => null);
  return (
    <Dialog open={!!s} onOpenChange={(open) => !open && close(false)}>
      <DialogContent className="max-w-sm rounded-card bg-cream p-6" showCloseButton={false} data-testid="confirm-dialog">
        <DialogTitle className="font-display text-heading-sm font-normal">{s?.title}</DialogTitle>
        {s?.body ? <DialogDescription className="text-smoke">{s.body}</DialogDescription> : null}
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => close(false)} className="h-11 flex-1 rounded-full border-2 border-line bg-white font-bold" data-testid="confirm-cancel">
            {s?.cancelLabel ?? "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={cn("h-11 flex-1 rounded-full font-bold", s?.destructive ? "bg-[#b42318] text-white" : "bg-bonnet text-char")}
            data-testid="confirm-ok"
          >
            {s?.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
