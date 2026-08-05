import Link from "next/link";

type AdminNavLinkProps = {
  className?: string;
};

export function AdminNavLink({
  className = "rounded-xl border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:border-slate-600 dark:bg-violet-700 dark:hover:bg-violet-600",
}: AdminNavLinkProps) {
  return (
    <Link href="/admin" className={className}>
      Administração
    </Link>
  );
}
