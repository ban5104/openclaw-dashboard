import { PageIntro } from "@/components/marketing/page-intro";
import { getBusinessSettings, getSettingsChecks } from "@/lib/marketing-data";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ business?: string }>;
}) {
  const params = await searchParams;
  const businessSlug = params?.business ?? "nelsonai";
  const [{ checks, dataSource }, settings] = await Promise.all([
    getSettingsChecks(businessSlug),
    getBusinessSettings(businessSlug),
  ]);

  return (
    <div className="app-shell page-grid">
      <PageIntro
        eyebrow="Operations"
        title="Business settings"
        description="A single-user admin surface for connection health, publishing credentials, and the background jobs that keep weekly planning and alerts running."
      />

      {dataSource === "mock" ? (
        <div className="surface rounded-[1.35rem] px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Integration checks are partially inferred from environment variables because the database is not connected.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <section className="surface rounded-[1.75rem] p-5">
          <h2 className="font-display text-2xl font-semibold">Integration status</h2>
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
        </section>

        <section className="surface rounded-[1.75rem] p-5">
          <h2 className="font-display text-2xl font-semibold">Posting guardrails</h2>
          <div className="mt-5 space-y-4 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
            <p>Publishing is draft-only. Nothing in this dashboard should imply autonomous posting.</p>
            <p>Approval remains human-gated through the Inbox and Telegram callback flow.</p>
            <p>Analytics collection runs weekly and informs the next planning cycle, but does not modify brand rules without review.</p>
          </div>
          <div className="mt-6 rounded-[1.2rem] border p-4 text-sm" style={{ borderColor: "var(--border)" }}>
            <p className="eyebrow">Business config snapshot</p>
            <pre className="mt-3 overflow-x-auto leading-6" style={{ color: "var(--text-secondary)" }}>
              {JSON.stringify(settings.data, null, 2)}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
