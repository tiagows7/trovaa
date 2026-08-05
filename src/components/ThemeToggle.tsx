"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Alternar tema"
        className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Alternar tema"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-lg transition hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900/80"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
