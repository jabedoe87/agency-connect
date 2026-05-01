import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, X } from 'lucide-react';
import { saveRecentLead } from '@/lib/leads';

export interface SmartSendPersonalize {
  /** Current name typed by the user (may be empty). Triggers live token replace. */
  name: string;
}

interface Props {
  /** Fired on every keystroke so the parent can live-replace [Name] tokens. */
  onPersonalizeChange: (data: SmartSendPersonalize) => void;
  /** Fired once the user clicks "Save recipient" with a non-empty name (and optional contact). */
  onSaveRecipient?: (data: { name: string; contact?: string }) => void;
  /** Hide the card entirely (persisted by parent if desired). */
  onDismiss?: () => void;
}

/**
 * Smart Send Card — frictionless, NON-blocking personalization panel.
 *
 * Replaces the previous hard-lock RecipientGate. Copy/send always remain
 * unlocked; this card simply offers an optional "add their name" field
 * that live-replaces [Name]/[First Name] tokens in the generated output.
 *
 * Conversion-focused: zero required fields, dismissible, sits above output.
 */
export default function RecipientGate({ onPersonalizeChange, onSaveRecipient, onDismiss }: Props) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [showContact, setShowContact] = useState(false);

  // Live token replacement — fire on every keystroke.
  useEffect(() => {
    onPersonalizeChange({ name: name.trim() });
    // Intentionally not depending on the callback identity to avoid loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const handleSave = () => {
    const tName = name.trim();
    if (!tName) return;
    const tContact = contact.trim();
    if (tContact) {
      // Best-effort persist — kind detection happens in saveRecentLead's caller normally,
      // but here we do a lightweight inference.
      const kind = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tContact)
        ? 'email'
        : /^@?[\w.]{1,30}$/.test(tContact)
        ? 'instagram'
        : 'unknown';
      const value = kind === 'instagram' && !tContact.startsWith('@') ? `@${tContact}` : tContact;
      saveRecentLead({ name: tName, contact: value, kind: kind as 'email' | 'instagram' | 'unknown' });
      onSaveRecipient?.({ name: tName, contact: value });
    } else {
      onSaveRecipient?.({ name: tName });
    }
  };

  return (
    <div
      className="relative rounded-xl border border-primary/30 bg-primary/[0.04] p-4 sm:p-5
                 shadow-[0_0_0_1px_hsl(var(--primary)/0.05)]"
      role="region"
      aria-label="Personalize this message (optional)"
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Hide personalize card"
          className="absolute right-2 top-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="flex items-start gap-2 pr-6">
        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">
            Personalize for 3× more replies <span className="text-muted-foreground font-normal">(optional)</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Type a name — we'll swap it into the message live. Copy & send already work.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Recipient name (e.g. Sarah)"
          className="flex-1 h-9 text-sm"
          aria-label="Recipient name"
        />
        {showContact ? (
          <Input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="email or @handle"
            className="flex-1 h-9 text-sm"
            aria-label="Recipient contact (optional)"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowContact(true)}
            className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4 sm:self-center sm:px-2"
          >
            + add contact
          </button>
        )}
        <Button
          onClick={handleSave}
          disabled={!name.trim()}
          size="sm"
          className="h-9 cta-primary shrink-0"
        >
          Save recipient
        </Button>
      </div>
    </div>
  );
}

// Back-compat type export — no longer used as a hard-lock unlock payload.
export type RecipientGateUnlock = { name: string; contact: string; kind: 'email' | 'instagram' | 'unknown' };
