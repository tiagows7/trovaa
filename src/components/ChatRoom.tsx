"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/SignOutButton";
import { VipBadge } from "@/components/VipBadge";
import { isProfileVip } from "@/lib/vip";
import type { Message } from "@/types/database";

type ChatRoomProps = {
  userId: string;
  username: string;
  isVip: boolean;
  stateCode: string;
  stateName: string;
  initialMessages: Message[];
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ChatRoom({
  userId,
  username,
  isVip,
  stateCode,
  stateName,
  initialMessages,
}: ChatRoomProps) {
  const supabase = useMemo(() => createClient(), []);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, stateCode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${stateCode}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `state_code=eq.${stateCode}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", newMessage.user_id)
            .single();

          setMessages((current) => {
            if (current.some((m) => m.id === newMessage.id)) return current;
            return [...current, { ...newMessage, profiles: profile }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, stateCode]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = content.trim();
    if (!text || sending) return;

    setSending(true);
    setContent("");

    const { error } = await supabase.from("messages").insert({
      user_id: userId,
      content: text,
      state_code: stateCode,
    });

    if (error) {
      setContent(text);
      alert(error.message);
    }

    setSending(false);
  }

  return (
    <div className="flex h-dvh bg-zinc-50 dark:bg-slate-950">
      <ChatSidebar
        userId={userId}
        activeStateCode={stateCode}
        initialSavedUsers={[]}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-violet-100 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 lg:hidden dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Abrir menu de salas"
            >
              ☰
            </button>
            <Link href={`/chat/${stateCode}`} className="hidden sm:block">
              <Logo className="h-11 w-auto sm:h-12" href={null} />
            </Link>
            <div className="border-l border-slate-200 pl-3 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {stateName} ({stateCode})
              </p>
              <p className="text-xs text-slate-400">Sala ao vivo</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {!isVip && (
              <Link
                href="/vip"
                className="hidden rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 sm:inline-flex"
              >
                VIP
              </Link>
            )}
            <span className="hidden items-center gap-2 text-sm text-zinc-500 sm:inline-flex dark:text-slate-400">
              {username}
              {isVip && <VipBadge />}
            </span>
            <SignOutButton />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-zinc-400">
                Nenhuma mensagem em {stateName} ainda. Seja o primeiro a falar!
              </p>
            )}

            {messages.map((message) => {
              const isMine = message.user_id === userId;
              const author = message.profiles?.username ?? "Usuário";
              const authorIsVip = isProfileVip(message.profiles ?? null);

              return (
                <div
                  key={message.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? isVip
                          ? "rounded-br-md bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md"
                          : "rounded-br-md bg-violet-600 text-white"
                        : authorIsVip
                          ? "rounded-bl-md bg-amber-50 text-zinc-900 shadow-sm ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900"
                          : "rounded-bl-md bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-100 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800"
                    }`}
                  >
                    {!isMine && (
                      <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-violet-600 dark:text-violet-300">
                        {author}
                        {authorIsVip && <VipBadge />}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {message.content}
                    </p>
                    <p
                      className={`mt-1 text-[10px] ${
                        isMine
                          ? isVip
                            ? "text-amber-100"
                            : "text-violet-200"
                          : "text-zinc-400"
                      }`}
                    >
                      {mounted ? formatTime(message.created_at) : "--:--"}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        <form
          onSubmit={handleSend}
          className="border-t border-zinc-200 bg-white px-4 py-4"
        >
          <div className="mx-auto flex max-w-2xl gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Mensagem em ${stateName}...`}
              maxLength={2000}
              autoComplete="off"
              spellCheck={false}
              className="chat-message-input flex-1 rounded-xl border px-4 py-3 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
            />
            <button
              type="submit"
              disabled={sending || !content.trim()}
              className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
