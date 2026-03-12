import Link from "next/link";
import { PageIntro } from "@/components/marketing/page-intro";
import { getCalendarEntries } from "@/lib/marketing-data";
import { STATE_LABELS } from "@/lib/state-machine";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ business?: string }>;
}) {
  const params = await searchParams;
  const calendar = await getCalendarEntries(params?.business ?? "nelsonai");

  return (
    <div className="app-shell page-grid">
      <PageIntro
        eyebrow="Visibility"
        title="Calendar"
        description="A scheduling view of planned, ready, and posted content so Ben can see the week at a glance before the native batch scheduling pass."
      />

      <div className="grid gap-4 xl:grid-cols-5">
        {calendar.data.map((day) => (
          <section key={day.date} className="surface rounded-[1.75rem] p-4">
            <p className="eyebrow">{day.day}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">{day.date}</h2>
            <div className="mt-5 space-y-3">
              {day.items.map((item) => (
                <Link key={item.id} href={`/items/${item.id}`} className="block rounded-[1.25rem] border p-3" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                    {item.platform}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6">{item.title}</p>
                  <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {item.suggestedTime ? `${item.suggestedTime} · ` : ""}{STATE_LABELS[item.state]}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
