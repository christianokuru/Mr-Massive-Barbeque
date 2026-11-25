"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { ConfirmHost } from "./confirm";

function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.12, smoothWheel: true });
    let id = 0;
    const raf = (t: number) => {
      lenis.raf(t);
      id = requestAnimationFrame(raf);
    };
    id = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
    };
  }, []);
  return null;
}

export function Providers() {
  return (
    <>
      <SmoothScroll />
      <ConfirmHost />
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast: "!rounded-2xl !border-line !bg-white !text-char !font-sans",
            actionButton: "!rounded-full !bg-bonnet !text-char !font-bold",
          },
        }}
      />
    </>
  );
}

/** Lifts floating buttons (WhatsApp) above a sticky bottom bar while mounted. */
export function BottomBarOffset({ px }: { px: number }) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bottom-bar", `${px}px`);
    return () => {
      root.style.removeProperty("--bottom-bar");
    };
  }, [px]);
  return null;
}
