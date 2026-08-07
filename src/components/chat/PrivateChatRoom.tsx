"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AdminNavLink } from "@/components/admin/AdminNavLink";
import { Logo } from "@/components/Logo";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { VipBadge } from "@/components/VipBadge";
import { useUserProfileRoles } from "@/hooks/useUserProfileRoles";
import type { ConversationMessage } from "@/types/database";

type PrivateChatRoomProps = {
  embedded?: boolean;
  userId: string;
  username: string;
  isVip: boolean;
  conversationId: string;
  stateCode: string;
  stateName: string;
  partnerId: string;
  partnerName: string;
  partnerIsVip: boolean;
  initialMessages: ConversationMessage[];
  isAdmin: boolean;
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function PrivateChatRoom({
  embedded = false,
  userId,
  username,
  isVip,
  conversationId,
  stateCode,
  stateName,
  partnerId,
  partnerName,
  partnerIsVip,
  initialMessages,
  isAdmin,
}: PrivateChatRoomProps) {
  const supabase = useMemo(() => createClient(), []);
  const { isVip: viewerIsVip, isAdmin: viewerIsAdmin } = useUserProfileRoles({
    isVip,
    isAdmin,
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>(initialMessages);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresInsertPayload<ConversationMessage>) => {
          const newMessage = payload.new as ConversationMessage;
          setMessages((current) => {
            if (current.some((message) => message.id === newMessage.id)) return current;
            return [...current, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = content.trim();
    if (!text || sending) return;

    setSending(true);
    setContent("");

    const { error } = await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      content: text,
    });

    if (error) {
      setContent(text);
      alert(error.message);
    }

    setSending(false);
  }

  return (
    <div
      className={`flex bg-zinc-50 dark:bg-slate-950 ${embedded ? "h-full min-h-0" : "h-dvh"}`}
    >
      <ChatSidebar
        userId={userId}
        activeStateCode={stateCode}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isVip={viewerIsVip}
        isAdmin={viewerIsAdmin}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {!embedded && (
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
              {viewerIsVip ? (
                <Link href={`/chat/${stateCode}`} className="hidden sm:block">
                  <Logo className="h-11 w-auto sm:h-12" href={null} />
                </Link>
              ) : (
                <div className="hidden sm:block">
                  <Logo className="h-11 w-auto sm:h-12" href={null} />
                </div>
              )}
              <div className="border-l border-slate-200 pl-3 dark:border-slate-700">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                  {partnerName}
                  {partnerIsVip && <VipBadge />}
                </p>
                <p className="text-xs text-slate-400">
                  Conversa privada · {stateName} ({stateCode})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {viewerIsAdmin && (
                <AdminNavLink className="hidden rounded-lg border border-slate-300 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:inline-flex dark:border-slate-600 dark:bg-violet-700 dark:hover:bg-violet-600" />
              )}
              {viewerIsVip ? (
                <Link
                  href={`/chat/${stateCode}`}
                  className="hidden rounded-lg border border-violet-200 px-3 py-1.5 text-sm font-medium text-violet-600 transition hover:bg-violet-50 sm:inline-flex dark:border-violet-800 dark:hover:bg-violet-950/40"
                >
                  Nova conversa
                </Link>
              ) : (
                <span
                  title="Sem VIP você só pode manter uma conversa ativa por vez"
                  className="hidden rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-400 sm:inline-flex dark:border-slate-700"
                >
                  1 conversa ativa
                </span>
              )}
              {!viewerIsVip && (
                <Link
                  href="/vip"
                  className="hidden rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 sm:inline-flex"
                >
                  VIP
                </Link>
              )}
              <span className="hidden items-center gap-2 text-sm text-zinc-500 sm:inline-flex dark:text-slate-400">
                {username}
                {viewerIsVip && <VipBadge />}
              </span>
            </div>
          </header>
        )}

        {embedded && (
          <div className="flex items-center justify-between border-b border-violet-100 bg-white px-3 py-2 lg:hidden dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Abrir menu de salas"
            >
              ☰ Salas
            </button>
            <p className="mx-3 min-w-0 flex-1 truncate text-xs text-slate-500 dark:text-slate-400">
              {stateName} ({stateCode})
            </p>
            {viewerIsVip && (
              <Link
                href={`/chat/${stateCode}`}
                className="shrink-0 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-600 transition hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40"
              >
                + Nova
              </Link>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-zinc-400">
                Você e {partnerName} estão conectados. Diga olá!
              </p>
            )}

            {messages.map((message) => {
              const isMine = message.user_id === userId;
              const authorName = isMine ? "Você" : partnerName;
              const authorIsVip = isMine ? viewerIsVip : partnerIsVip;

              return (
                <div
                  key={message.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? viewerIsVip
                          ? "rounded-br-md bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md"
                          : "rounded-br-md bg-violet-600 text-white"
                        : partnerIsVip
                          ? "rounded-bl-md bg-amber-50 text-zinc-900 shadow-sm ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900"
                          : "rounded-bl-md bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-100 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800"
                    }`}
                  >
                    <p
                      className={`mb-1 flex items-center gap-1.5 text-xs font-semibold ${
                        isMine
                          ? viewerIsVip
                            ? "text-amber-100"
                            : "text-violet-200"
                          : partnerIsVip
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-violet-600 dark:text-violet-300"
                      }`}
                    >
                      {authorName}
                      {authorIsVip && <VipBadge />}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {message.content}
                    </p>
                    <p
                      className={`mt-1 text-[10px] ${
                        isMine
                          ? viewerIsVip
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
              placeholder={`Mensagem para ${partnerName}...`}
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
