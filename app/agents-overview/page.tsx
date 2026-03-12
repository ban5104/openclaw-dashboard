import { Bot } from "lucide-react";
import { PageIntro } from "@/components/marketing/page-intro";
import { getAgentOverview } from "@/lib/marketing-data";

export default async function AgentsOverviewPage() {
  const agents = await getAgentOverview();

  return (
    <div className="app-shell page-grid">
      <PageIntro
        eyebrow="Visibility"
        title="Agent roster"
        description="The active marketing agent team, their roles, and the workspace files that define how they behave. Ben can inspect the setup without using the dashboard as a workflow controller."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {agents.data.map((agent) => (
          <section key={agent.id} className="surface rounded-[1.75rem] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                  {agent.type}
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold">{agent.name}</h2>
              </div>
              <Bot className="h-5 w-5" />
            </div>

            <p className="mt-4 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
              {agent.role}
            </p>
            <p className="mt-4 text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Model:</span> {agent.model}
            </p>

            <div className="mt-5 space-y-2">
              {agent.responsibilities.map((responsibility) => (
                <p key={responsibility} className="rounded-[1rem] border px-3 py-3 text-sm leading-6" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                  {responsibility}
                </p>
              ))}
            </div>

            <div className="mt-5 space-y-2">
              {agent.workspaceLinks.map((link) => (
                <div key={link.path} className="rounded-[1rem] border px-3 py-3" style={{ borderColor: "var(--border)" }}>
                  <p className="text-sm font-medium">{link.label}</p>
                  <p className="mt-2 break-all text-xs leading-6" style={{ color: "var(--text-secondary)" }}>
                    {link.path}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
