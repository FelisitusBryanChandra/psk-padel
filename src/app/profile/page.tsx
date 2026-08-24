import { BottomNav } from "@/app/BottomNav";
import { Logo } from "@/app/Logo";
import { ThemeToggle } from "@/app/ThemeToggle";
import { getServerAuth } from "@/lib/auth";
import { computeCommunityStats } from "@/lib/communityStats";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const auth = await getServerAuth();
  const stats = await computeCommunityStats(auth);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-4 md:max-w-xl lg:max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-auto text-ink" />
          <h1 className="font-heading text-2xl font-black tracking-tight text-ink">Profile</h1>
        </div>
        <ThemeToggle />
      </header>

      <section className="mb-6">
        <div className="glass rounded-xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">Community</p>
          <p className="font-heading text-xl font-bold text-ink">{stats.communityName}</p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-ink-muted">Overview</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="neu-inset rounded-xl p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              Total Games Played
            </p>
            <p className="font-heading text-2xl font-bold text-lime">{stats.totalGamesPlayed}</p>
          </div>
          <div className="neu-inset rounded-xl p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              Total Sessions
            </p>
            <p className="font-heading text-2xl font-bold text-lime">{stats.totalSessions}</p>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-ink-muted">
          This Month
        </h2>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div className="neu-inset rounded-xl p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              Games Played
            </p>
            <p className="font-heading text-2xl font-bold text-lime">{stats.monthGamesPlayed}</p>
          </div>
          <div className="neu-inset rounded-xl p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              Most Wins
            </p>
            <p className="font-heading text-lg font-bold text-ink">
              {stats.mostWinsThisMonth
                ? `${stats.mostWinsThisMonth.name} (${stats.mostWinsThisMonth.wins})`
                : "—"}
            </p>
          </div>
        </div>

        <div className="mb-3 neu-inset rounded-xl p-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
            Most Active
          </p>
          <p className="font-heading text-lg font-bold text-ink">
            {stats.mostActiveThisMonth
              ? `${stats.mostActiveThisMonth.name} (${stats.mostActiveThisMonth.gamesPlayed} ${
                  stats.mostActiveThisMonth.gamesPlayed === 1 ? "game" : "games"
                })`
              : "—"}
          </p>
        </div>

        <div className="mb-3 neu-inset rounded-xl p-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
            Favorite Duo
          </p>
          <p className="font-heading text-lg font-bold text-ink">
            {stats.favoriteDuoThisMonth
              ? `${stats.favoriteDuoThisMonth.names[0]} & ${stats.favoriteDuoThisMonth.names[1]} (${stats.favoriteDuoThisMonth.count}x)`
              : "—"}
          </p>
        </div>

        <div className="glass rounded-xl p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-ink-muted">
            Top 3 by Wins
          </p>
          {stats.topThreeThisMonth.length === 0 ? (
            <p className="text-sm text-ink-muted">—</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.topThreeThisMonth.map((entry, idx) => (
                <div key={entry.playerId} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-ink">
                    <span className="font-heading font-black text-lime">#{idx + 1}</span>
                    {entry.name}
                  </span>
                  <span className="text-sm font-bold text-ink-muted">{entry.wins} wins</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mt-auto pb-4">
        <LogoutButton />
      </div>

      <BottomNav />
    </main>
  );
}
