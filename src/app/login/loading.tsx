export default function LoginLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-fuchsia-50 via-white to-cyan-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
        <p className="text-sm text-slate-600">Carregando login...</p>
        <p className="mt-2 text-xs text-slate-400">A primeira vez pode demorar no disco G:</p>
      </div>
    </div>
  );
}
