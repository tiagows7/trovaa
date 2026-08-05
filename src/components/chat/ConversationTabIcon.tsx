"use client";

type ConversationTabIconProps = {
  unreadCount: number;
  isActive: boolean;
};

export function ConversationTabIcon({
  unreadCount,
  isActive,
}: ConversationTabIconProps) {
  const hasUnread = unreadCount > 0;

  return (
    <span
      className={`relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
        hasUnread
          ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
          : isActive
            ? "bg-violet-200 text-violet-700 dark:bg-violet-800 dark:text-violet-100"
            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
        <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2Z" />
      </svg>
      {hasUnread && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </span>
  );
}
