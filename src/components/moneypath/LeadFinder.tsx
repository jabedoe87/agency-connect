import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Search,
  User,
} from 'lucide-react';
import {
  isValidEmail,
  normalizeContact,
  readRecentLeads,
  saveRecentLead,
  type ContactKind,
  type RecentLead,
} from '@/lib/leads';

export interface LeadSelection {
  template_mode: boolean;
  recipient_name?: string;
  recipient_contact?: string;
  contact_kind?: ContactKind;
  profile_note?: string;
}

interface Props {
  businessType: string;
  targetAudience: string;
  onConfirm: (selection: LeadSelection) => void;
}

type Mode = 'choose' | 'have' | 'find' | 'template';

// Static, business-aware suggestions. Keeps Phase 1 simple — no AI call.
function suggestionsFor(businessType: string, audience: string): {
  title: string;
  searches: { label: string; value: string }[];
}[] {
  const bt = (businessType || '').toLowerCase();
  const aud = audience || 'your target audience';
  const city = '[your city]';

  // Generic baseline + business-tuned overlays.
  const generic = [
    {
      title: `A ${aud} active on social media`,
      searches: [
        { label: 'Instagram', value: `${aud} ${city}` },
        { label: 'Google', value: `top ${aud} in ${city}` },
        { label: 'Facebook groups', value: `${city} ${aud}` },
      ],
    },
    {
      title: `Someone who already buys related services`,
      searches: [
        { label: 'Instagram', value: `${aud} reviews` },
        { label: 'Google', value: `${aud} testimonials ${city}` },
        { label: 'Facebook groups', value: `${city} small business owners` },
      ],
    },
  ];

  if (bt.includes('real estate')) {
    return [
      {
        title: 'A homeowner thinking about selling in the next 6 months',
        searches: [
          { label: 'Instagram', value: `homeowners ${city}` },
          { label: 'Google', value: `for sale by owner ${city}` },
          { label: 'Facebook groups', value: `${city} home sellers` },
        ],
      },
      {
        title: 'A first-time buyer in your city',
        searches: [
          { label: 'Instagram', value: `first time buyers ${city}` },
          { label: 'Google', value: `first time home buyers ${city}` },
          { label: 'Facebook groups', value: `${city} home buyers` },
        ],
      },
      ...generic,
    ];
  }

  if (bt.includes('coach') || bt.includes('consult')) {
    return [
      {
        title: 'A founder or solo operator stuck under €10k/mo',
        searches: [
          { label: 'LinkedIn', value: `founders ${city}` },
          { label: 'Instagram', value: `solo founders` },
          { label: 'Facebook groups', value: `${city} entrepreneurs` },
        ],
      },
      {
        title: 'A creator with 5K–50K followers who needs systems',
        searches: [
          { label: 'Instagram', value: `creators 10k followers ${aud}` },
          { label: 'YouTube', value: `${aud} channels 10K subs` },
        ],
      },
      ...generic,
    ];
  }

  if (bt.includes('gym') || bt.includes('fitness')) {
    return [
      {
        title: 'A local gym owner in your area',
        searches: [
          { label: 'Instagram', value: `gym owners ${city}` },
          { label: 'Google', value: `independent gyms ${city}` },
          { label: 'Facebook groups', value: `${city} fitness business` },
        ],
      },
      ...generic,
    ];
  }

  if (bt.includes('beauty') || bt.includes('salon') || bt.includes('hair')) {
    return [
      {
        title: 'A bride-to-be planning a wedding in the next 3 months',
        searches: [
          { label: 'Instagram', value: `brides ${city} 2026` },
          { label: 'Google', value: `wedding planners ${city}` },
          { label: 'Facebook groups', value: `${city} brides` },
        ],
      },
      {
        title: 'A local wedding planner or event organizer',
        searches: [
          { label: 'Instagram', value: `wedding planners ${city}` },
          { label: 'Google', value: `wedding planners ${city}` },
        ],
      },
      ...generic,
    ];
  }

  if (bt.includes('video') || bt.includes('editor') || bt.includes('youtub')) {
    return [
      {
        title: 'A YouTuber with 10K–50K subs who needs editing',
        searches: [
          { label: 'YouTube', value: `${aud} 10K subscribers` },
          { label: 'Instagram', value: `youtuber needs editor` },
        ],
      },
      ...generic,
    ];
  }

  if (bt.includes('restaurant')) {
    return [
      {
        title: 'A local food blogger or reviewer',
        searches: [
          { label: 'Instagram', value: `${city} food blogger` },
          { label: 'Google', value: `${city} restaurant reviews` },
        ],
      },
      ...generic,
    ];
  }

  if (bt.includes('contractor')) {
    return [
      {
        title: 'A homeowner planning a renovation',
        searches: [
          { label: 'Instagram', value: `${city} home renovation` },
          { label: 'Google', value: `home renovation ${city}` },
          { label: 'Facebook groups', value: `${city} home renovation` },
        ],
      },
      ...generic,
    ];
  }

  return generic;
}

export default function LeadFinder({ businessType, targetAudience, onConfirm }: Props) {
  const [mode, setMode] = useState<Mode>('choose');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [profileNote, setProfileNote] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pickedSuggestion, setPickedSuggestion] = useState<number | null>(null);

  const recent: RecentLead[] = useMemo(() => readRecentLeads(), []);
  const suggestions = useMemo(
    () => suggestionsFor(businessType, targetAudience),
    [businessType, targetAudience],
  );

  function tryConfirmLead(template_mode: boolean) {
    if (template_mode) {
      onConfirm({ template_mode: true });
      return;
    }
    const trimmedName = name.trim();
    const trimmedContact = contact.trim();
    if (!trimmedName || !trimmedContact) {
      setEmailError('Add a name and how to reach them.');
      return;
    }
    const norm = normalizeContact(trimmedContact);
    if (norm.kind === 'unknown') {
      setEmailError("That doesn't look like an email. Double-check?");
      return;
    }
    if (norm.kind === 'email' && !isValidEmail(norm.value)) {
      setEmailError("That doesn't look like an email. Double-check?");
      return;
    }
    setEmailError(null);
    saveRecentLead({
      name: trimmedName,
      contact: norm.value,
      kind: norm.kind,
      profile_note: profileNote.trim() || undefined,
    });
    onConfirm({
      template_mode: false,
      recipient_name: trimmedName,
      recipient_contact: norm.value,
      contact_kind: norm.kind,
      profile_note: profileNote.trim() || undefined,
    });
  }

  function pickRecent(l: RecentLead) {
    onConfirm({
      template_mode: false,
      recipient_name: l.name,
      recipient_contact: l.contact,
      contact_kind: l.kind,
      profile_note: l.profile_note,
    });
  }

  // ─── CHOOSE SCREEN ───────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-xl text-foreground">Who are you reaching out to?</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Picking a real person triples your reply rate.
          </p>
        </div>

        {recent.length > 0 && (
          <div className="glass-card p-4 space-y-2">
            <p className="label-uppercase text-[10px] text-muted-foreground font-semibold">
              Send to a recent lead
            </p>
            <div className="flex flex-wrap gap-2">
              {recent.slice(0, 5).map((l) => (
                <button
                  key={l.id}
                  onClick={() => pickRecent(l)}
                  className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-[12px] text-foreground hover:bg-primary/10 hover:border-primary/40 transition-all duration-150"
                >
                  {l.name}
                  <span className="text-muted-foreground"> · {l.contact}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setMode('have')}
            className="glass-card p-5 text-left hover:bg-white/[0.06] hover:border-primary/40 border border-white/10 transition-all duration-150 group"
          >
            <User className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform duration-150" />
            <p className="text-sm font-semibold text-foreground">I have someone in mind</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Already have someone? Enter their info.
            </p>
          </button>

          <button
            onClick={() => setMode('find')}
            className="glass-card p-5 text-left hover:bg-white/[0.06] hover:border-primary/40 border border-white/10 transition-all duration-150 group"
          >
            <Search className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform duration-150" />
            <p className="text-sm font-semibold text-foreground">Help me find someone</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Not sure? We'll help you find the right person.
            </p>
          </button>

          <button
            onClick={() => setMode('template')}
            className="glass-card p-5 text-left hover:bg-white/[0.06] hover:border-primary/40 border border-white/10 transition-all duration-150 group"
          >
            <FileText className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform duration-150" />
            <p className="text-sm font-semibold text-foreground">Just generate a template</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Just want to see the message first.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // ─── BACK button shared ──────────────────────────────────────────
  const Back = () => (
    <button
      onClick={() => {
        setMode('choose');
        setEmailError(null);
        setPickedSuggestion(null);
      }}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="w-3 h-3" /> Back
    </button>
  );

  // ─── OPTION A: have someone ──────────────────────────────────────
  if (mode === 'have') {
    return (
      <div className="space-y-4">
        <Back />
        <div>
          <h2 className="font-display text-lg text-foreground">Enter the person you want to reach out to</h2>
        </div>
        <div className="glass-card p-5 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Johnson"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email or Instagram Handle</Label>
            <Input
              value={contact}
              onChange={(e) => {
                setContact(e.target.value);
                setEmailError(null);
              }}
              placeholder="sarah@example.com or @sarahj"
              className="mt-1.5"
            />
            {emailError && (
              <p className="text-[11px] text-destructive mt-1.5">{emailError}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Optional: a line about them <span className="text-muted-foreground/60">(boosts personalization)</span>
            </Label>
            <Textarea
              value={profileNote}
              onChange={(e) => setProfileNote(e.target.value)}
              placeholder="e.g. Posts daily about Pilates classes for moms"
              rows={2}
              className="mt-1.5"
            />
          </div>
          <Button onClick={() => tryConfirmLead(false)} className="w-full cta-primary">
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // ─── OPTION B: help me find ──────────────────────────────────────
  if (mode === 'find') {
    if (pickedSuggestion === null) {
      return (
        <div className="space-y-4">
          <Back />
          <div>
            <h2 className="font-display text-lg text-foreground">Which type of person are you looking for?</h2>
            <p className="text-[11px] text-muted-foreground mt-1">Pick one to see where to look.</p>
          </div>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => setPickedSuggestion(i)}
                className="w-full text-left glass-card p-4 hover:border-primary/40 hover:bg-white/[0.06] transition-all duration-150"
              >
                <p className="text-sm text-foreground">{s.title}</p>
              </button>
            ))}
          </div>
        </div>
      );
    }

    const picked = suggestions[pickedSuggestion];
    return (
      <div className="space-y-4">
        <button
          onClick={() => setPickedSuggestion(null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back to types
        </button>
        <div>
          <h2 className="font-display text-lg text-foreground">Where can you find this person?</h2>
          <p className="text-[11px] text-muted-foreground mt-1">{picked.title}</p>
        </div>
        <div className="glass-card p-4 space-y-2">
          {picked.searches.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-md hover:bg-white/[0.03]">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-primary font-semibold">{s.label}</p>
                <p className="text-xs text-foreground truncate">{s.value}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px] border-white/10"
                onClick={() => {
                  navigator.clipboard.writeText(s.value).catch(() => {});
                }}
              >
                Copy
              </Button>
            </div>
          ))}
        </div>

        <div className="glass-card p-5 space-y-4">
          <p className="text-xs text-muted-foreground">Found someone? Enter their info below.</p>
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Johnson"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email or Instagram Handle</Label>
            <Input
              value={contact}
              onChange={(e) => {
                setContact(e.target.value);
                setEmailError(null);
              }}
              placeholder="sarah@example.com or @sarahj"
              className="mt-1.5"
            />
            {emailError && (
              <p className="text-[11px] text-destructive mt-1.5">{emailError}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Optional: a line about them
            </Label>
            <Textarea
              value={profileNote}
              onChange={(e) => setProfileNote(e.target.value)}
              placeholder="e.g. Posts daily about Pilates classes for moms"
              rows={2}
              className="mt-1.5"
            />
          </div>
          <Button onClick={() => tryConfirmLead(false)} className="w-full cta-primary">
            <CheckCircle2 className="w-4 h-4" /> Continue
          </Button>
        </div>
      </div>
    );
  }

  // ─── OPTION C: template only ─────────────────────────────────────
  return (
    <div className="space-y-4">
      <Back />
      <div className="glass-card p-5 space-y-4 border border-amber-500/30 bg-amber-500/[0.04]">
        <p className="text-sm text-foreground">
          Messages sent to a specific person get <span className="font-semibold">3x more replies</span> than templates.
        </p>
        <p className="text-xs text-muted-foreground">
          You can still generate a template and add a recipient before sending.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => tryConfirmLead(true)} variant="outline" className="flex-1 border-white/10">
            Generate template anyway
          </Button>
          <Button onClick={() => setMode('have')} className="flex-1 cta-primary">
            Add a person instead
          </Button>
        </div>
      </div>
    </div>
  );
}
