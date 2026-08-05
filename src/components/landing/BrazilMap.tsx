"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import brazilMap from "@svg-maps/brazil";
import { createClient } from "@/lib/supabase/client";
import { getStateByCode } from "@/lib/brazil-states";

export function BrazilMap() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  }, [supabase]);

  const activeState = hovered ?? selected;
  const activeInfo = activeState ? getStateByCode(activeState) : null;

  function getHref(stateCode: string) {
    return isLoggedIn ? `/chat/${stateCode}` : `/signup?estado=${stateCode}`;
  }

  function openState(stateCode: string) {
    router.push(getHref(stateCode));
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex min-h-[3rem] flex-col items-center justify-center text-center">
        {activeInfo ? (
          <>
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-300">
              {activeInfo.code} · {activeInfo.region}
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {activeInfo.name}
            </p>
            <button
              type="button"
              onClick={() => openState(activeInfo.code)}
              className="mt-2 text-sm font-medium text-fuchsia-600 hover:underline dark:text-fuchsia-300"
            >
              Entrar na sala →
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Passe o mouse ou toque em um estado para ver a sala
          </p>
        )}
      </div>

      <div className="rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-xl shadow-violet-100/40 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none sm:p-6">
        <svg
          viewBox={brazilMap.viewBox}
          className="mx-auto h-auto w-full max-w-2xl"
          role="img"
          aria-label="Mapa do Brasil com estados clicáveis"
        >
          {brazilMap.locations.map((location: { id: string; name: string; path: string }) => {
            const code = location.id.toUpperCase();
            const isActive = activeState === code;

            return (
              <path
                key={location.id}
                d={location.path}
                onMouseEnter={() => setHovered(code)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setSelected(code)}
                onBlur={() => setSelected(null)}
                onClick={() => openState(code)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openState(code);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Abrir sala de ${location.name}`}
                className={`cursor-pointer outline-none transition-all duration-200 focus:stroke-fuchsia-300 ${
                  isActive
                    ? "fill-fuchsia-500 stroke-white dark:fill-fuchsia-400"
                    : "fill-violet-300/80 stroke-white hover:fill-cyan-400 dark:fill-violet-700/80 dark:hover:fill-cyan-500"
                }`}
                strokeWidth={1.2}
              >
                <title>{location.name}</title>
              </path>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
