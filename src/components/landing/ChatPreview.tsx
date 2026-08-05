"use client";

import { useEffect, useState } from "react";

const demoScript = [
  { author: "Ana · SP", text: "Alguém online agora em São Paulo?", mine: false },
  { author: "Você", text: "Opa! Acabei de entrar na sala 👋", mine: true },
  { author: "Lucas · RJ", text: "Trovaa ficou show, conversa flui rápido.", mine: false },
];

export function ChatPreview() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (visibleCount < demoScript.length) {
      const timer = window.setTimeout(() => {
        setVisibleCount((count) => count + 1);
      }, visibleCount === 0 ? 600 : 1400);
      return () => window.clearTimeout(timer);
    }

    const typingTimer = window.setTimeout(() => setTyping(true), 500);
    return () => window.clearTimeout(typingTimer);
  }, [visibleCount]);

  useEffect(() => {
    if (!typing) return;

    const fullText = "Bora conversar no Trovaa?";
    let index = 0;

    const interval = window.setInterval(() => {
      index += 1;
      setDraft(fullText.slice(0, index));
      if (index >= fullText.length) {
        window.clearInterval(interval);
      }
    }, 55);

    return () => window.clearInterval(interval);
  }, [typing]);

  const messages = demoScript.slice(0, visibleCount);

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden
        className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-fuchsia-500/20 via-violet-500/20 to-cyan-500/20 blur-2xl"
      />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-2xl shadow-violet-500/10 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/85 dark:shadow-none">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
              Demo ao vivo
            </p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              Minas Gerais · MG
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Online
          </span>
        </div>

        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.text}
              className={`flex transition-all duration-500 ${
                message.mine ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  message.mine
                    ? "rounded-br-md bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white"
                    : "rounded-bl-md bg-slate-50 text-slate-800 ring-1 ring-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
                }`}
              >
                {!message.mine && (
                  <p className="mb-1 text-[11px] font-semibold text-violet-600 dark:text-violet-300">
                    {message.author}
                  </p>
                )}
                <p className="text-sm leading-relaxed">{message.text}</p>
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-fuchsia-600/90 to-violet-600/90 px-4 py-2.5 text-sm text-white">
                {draft}
                <span className="ml-1 inline-block animate-pulse">|</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex-1 rounded-xl bg-white px-3 py-2 text-sm text-slate-400 dark:bg-slate-900 dark:text-slate-500">
            {draft || "Digite sua mensagem..."}
          </div>
          <div className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white">
            Enviar
          </div>
        </div>
      </div>
    </div>
  );
}
