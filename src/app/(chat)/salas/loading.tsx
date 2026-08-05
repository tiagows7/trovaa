export default function SalasLoading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-fuchsia-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
        <p className="text-sm text-slate-600 dark:text-slate-300">Carregando salas...</p>
      </div>
    </div>
  );
}
