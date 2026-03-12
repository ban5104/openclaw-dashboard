import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CopyDraftButton } from "@/components/marketing/copy-draft-button";
import { MarkPostedButton } from "@/components/marketing/mark-posted-button";
import { PageIntro } from "@/components/marketing/page-intro";
import { getQueueData } from "@/lib/marketing-data";

export default async function QueuePage({
  searchParams,
}: {
  searchParams?: Promise<{ business?: string }>;
}) {
  const params = await searchParams;
  const businessSlug = params?.business ?? "nelsonai";
  const { business, groups, summary, dataSource } = await getQueueData(businessSlug);

  return (
    <div className="app-shell page-grid">
      <PageIntro
        eyebrow={`Primary View · ${business.name}`}
        title="Content queue"
        description="Approved content grouped by platform so Ben can batch-schedule natively, copy the post text, grab the image, and mark it posted afterward."
      />

      {dataSource === "mock" ? (
        <div className="surface rounded-[1.35rem] px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Rendering fallback demo data because `DATABASE_URL` is missing or the database is unreachable.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Ready this week" value={String(summary.totalReady)} detail="Posts ready to schedule" />
        <MetricTile label="LinkedIn" value={String(summary.linkedInReady)} detail="Ready for native scheduling" />
        <MetricTile label="Facebook" value={String(summary.facebookReady)} detail="Ready for native scheduling" />
        <MetricTile label="Suggested window" value={summary.suggestedRange} detail="Agent-recommended schedule range" />
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.platform} className="surface rounded-[1.75rem] p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">{group.label}</p>
                <h2 className="mt-2 font-display text-3xl font-semibold">{group.items.length} posts ready</h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {group.items.map((item) => (
                <article key={item.id} className="rounded-[1.4rem] border p-4" style={{ borderColor: "var(--border)" }}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                        {item.scheduledDate ?? "Unscheduled"}{item.suggestedTime ? ` · ${item.suggestedTime} suggested` : ""}
                      </p>
                      <h3 className="mt-2 font-display text-2xl font-semibold">{item.currentVersion.hook}</h3>
                      <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                        {item.currentVersion.body || item.currentVersion.excerpt}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <CopyDraftButton text={item.currentVersion.body} />
                        <Link href={`/items/${item.id}`} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                          View full draft
                        </Link>
                        <MarkPostedButton item={item} />
                      </div>
                    </div>

                    {(item.currentVersion.imageUrl || item.selectedAsset?.assetUrl) ? (
                      <div className="w-full max-w-xs overflow-hidden rounded-[1.2rem] border" style={{ borderColor: "var(--border)" }}>
                        <Image
                          src={item.currentVersion.imageUrl ?? item.selectedAsset?.assetUrl ?? ""}
                          alt={item.title}
                          width={720}
                          height={405}
                          unoptimized
                          className="h-44 w-full object-cover"
                        />
                        <div className="flex items-center justify-between gap-3 p-3">
                          <div>
                            <p className="text-sm font-semibold">Companion image</p>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                              {item.currentVersion.visualNotes ?? "Open to download or inspect."}
                            </p>
                          </div>
                          <a
                            href={item.currentVersion.imageUrl ?? item.selectedAsset?.assetUrl ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-medium"
                            style={{ color: "var(--accent-strong)" }}
                          >
                            View <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metric-tile">
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p className="mt-3 font-display text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
        {detail}
      </p>
    </div>
  );
}
