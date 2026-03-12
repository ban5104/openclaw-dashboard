import { BarChart3, Rocket, TrendingUp } from "lucide-react";
import { PageIntro } from "@/components/marketing/page-intro";
import { getAnalyticsMetrics, getAnalyticsSnapshots } from "@/lib/marketing-data";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ business?: string }>;
}) {
  const params = await searchParams;
  const businessSlug = params?.business ?? "nelsonai";
  const [metrics, snapshots] = await Promise.all([
    getAnalyticsMetrics(businessSlug),
    getAnalyticsSnapshots(businessSlug),
  ]);

  return (
    <div className="app-shell page-grid">
      <PageIntro
        eyebrow="Visibility"
        title="Analytics"
        description="Weekly performance feeds planning and agent context. This view surfaces what performed, what lagged, and which posts might justify native boosting."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.data.map((metric) => (
          <div key={metric.label} className="metric-tile">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {metric.label}
            </p>
            <p className="mt-3 font-display text-3xl font-semibold">{metric.value}</p>
            <p className="mt-2 text-sm" style={{ color: "var(--success)" }}>
              {metric.delta}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="surface rounded-[1.75rem] p-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <h2 className="font-display text-2xl font-semibold">Recent performance</h2>
          </div>
          <div className="mt-5 space-y-3">
            {snapshots.data.map((snapshot) => (
              <article key={snapshot.id} className="rounded-[1.35rem] border p-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                      {snapshot.platform} · {snapshot.snapshotDate}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">{snapshot.headline}</h3>
                  </div>
                  {snapshot.boostCandidate ? (
                    <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]" style={{ background: "rgba(208, 103, 50, 0.12)", color: "#d06732" }}>
                      Boost candidate
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <Stat label="Engagement" value={snapshot.engagementRate != null ? `${(snapshot.engagementRate * 100).toFixed(1)}%` : "n/a"} />
                  <Stat label="Reach" value={snapshot.reach?.toLocaleString() ?? "n/a"} />
                  <Stat label="Impressions" value={snapshot.impressions?.toLocaleString() ?? "n/a"} />
                  <Stat label="Clicks" value={snapshot.clicks?.toLocaleString() ?? "n/a"} />
                </div>
                {snapshot.insights ? (
                  <p className="mt-4 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                    {snapshot.insights}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <section className="surface rounded-[1.75rem] p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <h2 className="font-display text-2xl font-semibold">Planning signal</h2>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
              <p>Use weekly winners to sharpen the next planning run. The goal is better briefs, not automated strategy changes.</p>
              <p>Look for repeated hooks, CTA formats, and publishing windows that consistently lift engagement.</p>
              <p>Feed any tone or format feedback back through Telegram so the orchestrator can retain it in memory.</p>
            </div>
          </section>

          <section className="surface rounded-[1.75rem] p-5">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              <h2 className="font-display text-2xl font-semibold">Boost watchlist</h2>
            </div>
            <div className="mt-5 space-y-3">
              {snapshots.data.filter((snapshot) => snapshot.boostCandidate).map((snapshot) => (
                <div key={snapshot.id} className="rounded-[1.25rem] border p-4" style={{ borderColor: "var(--border)" }}>
                  <p className="text-sm font-semibold">{snapshot.headline}</p>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    Consider boosting this post via {snapshot.platform}&apos;s native ad tools.
                  </p>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border p-3" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
