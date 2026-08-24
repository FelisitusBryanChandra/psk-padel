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
        <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-ink-muted">Stats</h2>
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
          <div className="neu-inset rounded-xl p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              Games This Month
            </p>
            <p className="font-heading text-2xl font-bold text-lime">{stats.monthGamesPlayed}</p>
          </div>
          <div className="neu-inset rounded-xl p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              Top Player This Month
            </p>
            <p className="font-heading text-lg font-bold text-ink">
              {stats.topPlayerThisMonth
                ? `${stats.topPlayerThisMonth.name} (${stats.topPlayerThisMonth.points})`
                : "—"}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-auto pb-4">
        <LogoutButton />
      </div>

      <BottomNav />
    </main>
  );
}
