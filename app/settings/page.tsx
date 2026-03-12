import { PageIntro } from "@/components/marketing/page-intro";
import { getBusiness, getBusinessSettings, getSettingsChecks } from "@/lib/marketing-data";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ business?: string }>;
}) {
  const params = await searchParams;
  const businessSlug = params?.business ?? "nelsonai";
  const [{ checks, dataSource }, settings, business] = await Promise.all([
    getSettingsChecks(businessSlug),
    getBusinessSettings(businessSlug),
    getBusiness(businessSlug),
  ]);

  return (
    <div className="app-shell page-grid">
      <PageIntro
        eyebrow="Visibility"
        title="Settings"
        description="Business configuration, brand profile location, cadence settings, and integration health. Workflow control still belongs to Telegram and the orchestrator."
      />

      {dataSource === "mock" ? (
        <div className="surface rounded-[1.35rem] px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Integration checks are partially inferred from environment variables because the database is not connected.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <section className="surface rounded-[1.75rem] p-5">
          <h2 className="font-display text-2xl font-semibold">Business config</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InfoCard label="Business" value={business.business.name} />
            <InfoCard label="Timezone" value={business.business.timezone} />
            <InfoCard label="Platforms" value={(business.business.enabledPlatforms ?? []).join(", ")} />
            <InfoCard label="Analytics cadence" value={String(settings.data.analyticsCadence)} />
          </div>
          <div className="mt-5 rounded-[1.2rem] border p-4 text-sm" style={{ borderColor: "var(--border)" }}>
            <p className="eyebrow">Brand profile path</p>
            <p className="mt-3 break-all leading-7" style={{ color: "var(--text-secondary)" }}>
              {String(settings.data.brandProfilePath ?? "Not configured")}
            </p>
          </div>
          <div className="mt-5 rounded-[1.2rem] border p-4 text-sm" style={{ borderColor: "var(--border)" }}>
            <p className="eyebrow">Posting cadence</p>
            <pre className="mt-3 overflow-x-auto leading-6" style={{ color: "var(--text-secondary)" }}>
              {JSON.stringify(settings.data.postingCadence, null, 2)}
            </pre>
          </div>
        </section>

        <section className="surface rounded-[1.75rem] p-5">
          <h2 className="font-display text-2xl font-semibold">Integration health</h2>
          <div className="mt-5 space-y-3">
            {checks.map((check) => (
              <div key={check.label} className="flex items-center justify-between rounded-[1.3rem] border p-4" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-medium">{check.label}</p>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                  style={{
                    background:
                      check.tone === "success"
                        ? "rgba(47, 111, 86, 0.12)"
                        : check.tone === "warning"
                          ? "rgba(173, 123, 24, 0.12)"
                          : "rgba(16, 37, 42, 0.06)",
                    color:
                      check.tone === "success"
                        ? "var(--success)"
                        : check.tone === "warning"
                          ? "var(--warning)"
                          : "var(--text-secondary)",
                  }}
                >
                  {check.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.2rem] border p-4 text-sm leading-7" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
            <p>Telegram is the primary interface for approvals and operational feedback.</p>
            <p>The dashboard should not imply autonomous platform publishing.</p>
            <p>Weekly analytics should inform next week&apos;s briefs, not silently rewrite brand rules.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border p-4" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="mt-2 text-base font-semibold">{value}</p>
    </div>
  );
}
