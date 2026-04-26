import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Send,
  MessageCircle,
  UserPlus,
  Trophy,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  Target,
  CheckCircle2,
} from 'lucide-react';
import { useAddiction } from '@/hooks/useAddiction';
import {
  followUpCandidates,
  latestReplied,
  pipelineCounts,
  pipelineGoalProgress,
  pipelineMomentumLabel,
  type PipelineEntry,
  type PipelineStatus,
} from '@/lib/addiction';

/**
 * V8.1 — Outbound System.
 *
 * Single consolidated panel that renders all pipeline + follow-up UI:
 *   System 1 — Pipeline view (counts)
 *   System 2 — Follow-up prompt (old "sent" entries)
 *   System 3 — Conversation loop (latest "replied")
 *   System 4 — Close push (leads ≥ 1)
 *   System 5 — Client loop (clientsToday ≥ 1)
 *   System 6 — Pipeline momentum copy
 *   System 7 — Daily pipeline goal (10 → 2 → 1)
 *   System 8 — Simple read-only CRM (toggle)
 *
 * All "Generate X" actions delegate to the parent via callbacks so this stays
 * presentation-only (no AI calls, no routing).
 */

interface OutboundPipelineProps {
  /** System 2 — produce a follow-up message. */
  onGenerateFollowUp?: (entry: PipelineEntry) => void;
  /** System 3 — produce a reply continuation. */
  onGenerateReply?: (entry: PipelineEntry) => void;
  /** System 4 — produce a closing message for waiting leads. */
  onGenerateClosing?: () => void;
  /** System 5 — repeat the winning flow (e.g. start a new batch). */
  onRepeatFlow?: () => void;
}

const STATUS_LABEL: Record<PipelineStatus, string> = {
  sent: 'Sent',
  replied: 'Replied',
  lead: 'Lead',
  client: 'Client',
};

const STATUS_TONE: Record<PipelineStatus, string> = {
  sent: 'text-muted-foreground border-white/10 bg-white/[0.04]',
  replied: 'text-primary border-primary/30 bg-primary/[0.08]',
  lead: 'text-warning border-warning/30 bg-warning/[0.08]',
  client: 'text-success border-success/30 bg-success/[0.10]',
};

function formatDate(d: string): string {
  if (!d) return '';
  // d is YYYY-MM-DD
  const [, m, day] = d.split('-');
  if (!m || !day) return d;
  return `${day}/${m}`;
}

export default function OutboundPipeline({
  onGenerateFollowUp,
  onGenerateReply,
  onGenerateClosing,
  onRepeatFlow,
}: OutboundPipelineProps) {
  const { state, toggleCrm } = useAddiction();
  const counts = useMemo(() => pipelineCounts(state), [state]);
  const followUps = useMemo(() => followUpCandidates(state, 5), [state]);
  const lastReplied = useMemo(() => latestReplied(state), [state]);
  const goal = useMemo(() => pipelineGoalProgress(state), [state]);
  const momentum = pipelineMomentumLabel(counts);

  const empty = counts.total === 0;
  const hasLeads = state.leadsToday >= 1 || counts.lead >= 1;
  const hasClientToday = state.clientsToday >= 1;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-uppercase text-[10px] font-semibold text-foreground">
            ▸ Your Pipeline
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Track your conversations — messages turn into clients.
          </p>
        </div>
        {state.totalClientsClosed > 0 && (
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Closed</p>
            <p className="text-sm font-semibold text-success tabular-nums">
              {state.totalClientsClosed}
            </p>
          </div>
        )}
      </div>

      {/* System 1 — Pipeline counts */}
      <div className="grid grid-cols-4 gap-2">
        <PipelineStat icon={<Send className="w-3.5 h-3.5" />} label="Sent" value={counts.sent} />
        <PipelineStat
          icon={<MessageCircle className="w-3.5 h-3.5" />}
          label="Replied"
          value={counts.replied}
          tone="primary"
        />
        <PipelineStat
          icon={<UserPlus className="w-3.5 h-3.5" />}
          label="Leads"
          value={counts.lead}
          tone="warning"
        />
        <PipelineStat
          icon={<Trophy className="w-3.5 h-3.5" />}
          label="Clients"
          value={counts.client}
          tone="success"
        />
      </div>

      {empty && (
        <p className="text-[11px] text-muted-foreground italic text-center py-2">
          Send your first message to start tracking.
        </p>
      )}

      {/* System 6 — Pipeline momentum */}
      {!empty && momentum && (
        <p className="text-[11px] text-foreground/80 text-center">{momentum}</p>
      )}

      {/* System 7 — Daily pipeline goal */}
      {!empty && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-primary" />
            <p className="text-[11px] font-semibold text-foreground">
              Today's goal: 10 messages → 2 replies → 1 lead
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <GoalCell label="Messages" current={goal.messages.current} target={goal.messages.target} hit={goal.messages.hit} />
            <GoalCell label="Replies" current={goal.replies.current} target={goal.replies.target} hit={goal.replies.hit} />
            <GoalCell label="Leads" current={goal.leads.current} target={goal.leads.target} hit={goal.leads.hit} />
          </div>
          {goal.complete && (
            <p className="text-[11px] text-success font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Pipeline goal complete — close your leads.
            </p>
          )}
        </div>
      )}

      {/* System 5 — Client loop (highest priority feedback) */}
      {hasClientToday && (
        <div className="rounded-lg border border-success/40 bg-success/[0.08] p-3 space-y-2">
          <p className="text-sm font-semibold text-success">🔥 You closed a client</p>
          <p className="text-[11px] text-foreground/80">What worked just made you money.</p>
          {onRepeatFlow && (
            <Button
              size="sm"
              className="cta-primary gap-1.5 w-full"
              onClick={onRepeatFlow}
            >
              <Sparkles className="w-3.5 h-3.5" /> Repeat this flow
            </Button>
          )}
        </div>
      )}

      {/* System 4 — Close push */}
      {hasLeads && !hasClientToday && (
        <div className="rounded-lg border border-warning/30 bg-warning/[0.06] p-3 space-y-2">
          <p className="text-[12px] font-semibold text-foreground">
            Leads are waiting — close them.
          </p>
          {onGenerateClosing && (
            <Button
              size="sm"
              className="cta-primary gap-1.5 w-full"
              onClick={onGenerateClosing}
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate closing message
            </Button>
          )}
        </div>
      )}

      {/* System 3 — Conversation loop */}
      {lastReplied && !hasLeads && (
        <div className="rounded-lg border border-primary/30 bg-primary/[0.06] p-3 space-y-2">
          <p className="text-[12px] font-semibold text-foreground">
            They replied — keep the conversation moving.
          </p>
          {onGenerateReply && (
            <Button
              size="sm"
              className="cta-primary gap-1.5 w-full"
              onClick={() => onGenerateReply(lastReplied)}
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate reply message
            </Button>
          )}
        </div>
      )}

      {/* System 2 — Follow-up (V8.3 — Fix 6: requires ≥1 send today) */}
      {followUps.length > 0 && state.messagesSentToday >= 1 && (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-warning" />
            <p className="text-[12px] font-semibold text-foreground">
              These people haven't replied — follow up now.
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {followUps.length} pending from earlier days.
          </p>
          {onGenerateFollowUp && (
            <Button
              size="sm"
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5 w-full"
              onClick={() => onGenerateFollowUp(followUps[0])}
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate follow-up message
            </Button>
          )}
        </div>
      )}

      {/* System 8 — Simple CRM toggle */}
      {!empty && (
        <div className="pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={() => toggleCrm(!state.crmExpanded)}
            className="flex items-center justify-between w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-medium">View all messages ({counts.total})</span>
            {state.crmExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {state.crmExpanded && (
            <ul className="mt-3 space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {state.pipeline.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-2"
                >
                  <span className="text-[10px] tabular-nums text-muted-foreground shrink-0 w-10 pt-0.5">
                    {formatDate(e.date)}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wide font-semibold border rounded px-1.5 py-0.5 shrink-0 ${STATUS_TONE[e.status]}`}
                  >
                    {STATUS_LABEL[e.status]}
                  </span>
                  <span className="text-[11px] text-foreground/80 leading-snug min-w-0 break-words">
                    {e.messagePreview || (
                      <span className="italic text-muted-foreground">
                        {e.actionType || 'No preview'}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function PipelineStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: 'primary' | 'warning' | 'success';
}) {
  const toneClass =
    tone === 'success'
      ? 'border-success/30 bg-success/[0.08] text-success'
      : tone === 'warning'
      ? 'border-warning/30 bg-warning/[0.08] text-warning'
      : tone === 'primary'
      ? 'border-primary/30 bg-primary/[0.08] text-primary'
      : 'border-white/10 bg-white/[0.04] text-foreground';
  return (
    <div className={`rounded-lg border px-2 py-2 text-center ${toneClass}`}>
      <div className="flex items-center justify-center gap-1 mb-0.5 opacity-80">
        {icon}
        <span className="text-[10px] uppercase tracking-wide font-semibold">{label}</span>
      </div>
      <p className="text-base font-bold tabular-nums">{value}</p>
    </div>
  );
}

function GoalCell({
  label,
  current,
  target,
  hit,
}: {
  label: string;
  current: number;
  target: number;
  hit: boolean;
}) {
  return (
    <div
      className={`rounded-md border px-2 py-1.5 text-center ${
        hit
          ? 'border-success/30 bg-success/[0.08] text-success'
          : 'border-white/10 bg-white/[0.03] text-foreground'
      }`}
    >
      <p className="text-[9px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-[12px] font-semibold tabular-nums">
        {current}/{target}
      </p>
    </div>
  );
}
