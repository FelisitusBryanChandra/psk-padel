import { cookies } from "next/headers";
import Link from "next/link";
import { AUTH_COOKIE, communityFilter, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BottomNav } from "./BottomNav";
import { DeleteSessionButton } from "./DeleteSessionButton";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const auth = await verifySessionToken(cookieStore.get(AUTH_COOKIE)?.value);
  const isAdmin = auth?.role === "admin";

  const sessions = await prisma.session.findMany({
    where: communityFilter(auth),
    orderBy: { date: "desc" },
    include: {
      players: true,
      rounds: { include: { matches: true } },
      community: { select: { code: true } },
    },
  });

  const groups = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const key = s.date.toISOString().slice(0, 7); // YYYY-MM
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-4 md:max-w-xl lg:max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-auto text-ink" />
          <h1 className="font-heading text-2xl font-black tracking-tight text-ink">PSK Padel</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <section className="mb-6">
        <h2 className="font-heading text-2xl font-black text-ink">Your Sessions</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Manage and track your Padel Americano and Mexicano tournaments.
        </p>
      </section>

      {sessions.length === 0 && (
        <div className="mt-12 flex flex-col items-center text-center">
          <span className="material-symbols-outlined mb-4 text-7xl text-surface-highest">
            sports_tennis
          </span>
          <h3 className="font-heading text-lg font-bold text-ink">No Sessions Yet</h3>
          <p className="mt-2 max-w-xs text-sm text-ink-muted">
            Ready to dominate the court? Start your first Americano session today.
          </p>
        </div>
      )}

      {Array.from(groups.entries()).map(([month, monthSessions]) => (
        <section key={month} className="mb-8">
          <div className="mb-3 flex items-center justify-between border-b border-outline pb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-ink-muted">
              {new Date(`${month}-01`).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <a
              href={`/api/export?month=${month}`}
              className="flex items-center gap-1 text-xs font-bold text-lime-dim"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Download CSV
            </a>
          </div>

          <div className="flex flex-col gap-3">
            {monthSessions.map((s) => {
              const allMatches = s.rounds.flatMap((r) => r.matches);
              const isLive = allMatches.some((m) => !m.completed);
              const status = allMatches.length === 0 ? null : isLive ? "LIVE" : "COMPLETED";

              return (
                <div
                  key={s.id}
                  className="glass relative rounded-xl p-4 transition-colors active:scale-[0.98]"
                >
                  <Link href={`/session/${s.id}`} className="absolute inset-0" aria-label={s.name} />
                  <div className="pointer-events-none relative">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        {status && (
                          <div className="mb-1 flex items-center gap-2">
                            {status === "LIVE" && (
                              <span className="h-2 w-2 rounded-full bg-live animate-pulse" />
                            )}
                            <span
                              className={`text-[10px] font-black uppercase tracking-widest ${
                                status === "LIVE" ? "text-live" : "text-ink-muted"
                              }`}
                            >
                              {status}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading text-lg font-bold text-ink">{s.name}</h4>
                          <span className="rounded-full bg-surface-highest px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-lime-dim">
                            {s.sessionType}
                          </span>
                          {isAdmin && s.community && (
                            <span className="rounded-full bg-surface-highest px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-ink-muted">
                              #{s.community.code}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-ink-muted">
                          <span className="material-symbols-outlined text-sm">calendar_today</span>
                          {s.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </div>
                      </div>
                      <div className="pointer-events-auto flex items-center gap-1">
                        <DeleteSessionButton sessionId={s.id} name={s.name} />
                        <span className="material-symbols-outlined text-ink-muted">
                          chevron_right
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-outline/30 pt-3">
                      <div className="neu-inset-sm rounded-lg p-2 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
                          Players
                        </p>
                        <p className="font-heading text-lg font-bold text-ink">
                          {s.players.length}
                        </p>
                      </div>
                      <div className="neu-inset-sm rounded-lg p-2 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
                          Courts
                        </p>
                        <p className="font-heading text-lg font-bold text-ink">{s.courts}</p>
                      </div>
                      <div className="neu-inset-sm rounded-lg p-2 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
                          Rounds
                        </p>
                        <p className="font-heading text-lg font-bold text-ink">
                          {s.rounds.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <BottomNav />
    </main>
  );
}
