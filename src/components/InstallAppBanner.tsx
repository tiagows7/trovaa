"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setHidden(true);
      return;
    }

    const dismissed = localStorage.getItem("trovaa-install-dismissed");
    if (dismissed === "1") {
      setHidden(true);
    }

    function handleBeforeInstall(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!promptEvent) return;

    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
    setHidden(true);
  }

  function handleDismiss() {
    localStorage.setItem("trovaa-install-dismissed", "1");
    setHidden(true);
  }

  if (hidden || !promptEvent) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-violet-200 bg-white p-4 shadow-xl dark:border-violet-800 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">Instalar Trovaa</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Adicione à tela inicial e use como app.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
