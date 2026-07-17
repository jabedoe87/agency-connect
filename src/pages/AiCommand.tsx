import AppLayout from '@/components/AppLayout';
import CommandChat from '@/components/aiCommand/CommandChat';
import {
  BriefingCard,
  PriorityTasksCard,
  LeadOverviewCard,
  AutomationSuggestionsCard,
} from '@/components/aiCommand/CommandWidgets';

export default function AiCommand() {
  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-6 md:py-8 fade-in space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground">AI Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your daily briefing, priorities and an AI copilot — all in one screen.
          </p>
        </div>

        <BriefingCard />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PriorityTasksCard />
          <LeadOverviewCard />
        </div>

        <AutomationSuggestionsCard />

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Ask your Command Assistant</h2>
          <CommandChat />
        </div>
      </div>
    </AppLayout>
  );
}
