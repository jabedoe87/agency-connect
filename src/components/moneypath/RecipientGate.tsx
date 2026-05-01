import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Unlock } from 'lucide-react';
import { isValidEmail, normalizeContact, type ContactKind } from '@/lib/leads';

export interface RecipientGateUnlock {
  name: string;
  contact: string;
  kind: ContactKind;
}

interface Props {
  onUnlock: (data: RecipientGateUnlock) => void;
}

/**
 * Hard-lock surface placed over generated output when the user chose
 * Option C (template). Copy + Send remain unreachable until both a
 * recipient name and a valid email/Instagram handle are provided.
 */
export default function RecipientGate({ onUnlock }: Props) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const tName = name.trim();
    const tContact = contact.trim();
    if (!tName) {
      setError('Add the recipient name to unlock.');
      return;
    }
    if (!tContact) {
      setError('Add an email or Instagram handle to unlock.');
      return;
    }
    const norm = normalizeContact(tContact);
    if (norm.kind === 'unknown') {
      setError("That doesn't look like an email or @handle.");
      return;
    }
    if (norm.kind === 'email' && !isValidEmail(norm.value)) {
      setError("That email doesn't look right.");
      return;
    }
    setError(null);
    onUnlock({ name: tName, contact: norm.value, kind: norm.kind });
  };

  return (
    <div
      className="absolute inset-0 z-20 flex items-start justify-center overflow-y-auto rounded-xl
                 bg-background/80 backdrop-blur-md p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Add recipient to unlock copy and send"
    >
      <div className="w-full max-w-md mt-10 glass-card-raised p-6 space-y-5 border border-primary/30 shadow-2xl">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <p className="label-uppercase text-primary text-[10px] font-bold">
            Locked — recipient required
          </p>
        </div>
        <div>
          <h3 className="font-display text-lg text-foreground leading-tight">
            Add who you're sending this to
          </h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Templates sent to a real person get <span className="text-foreground font-semibold">3× more replies</span>.
            Copy & send unlock once you add a name and contact.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Recipient name</Label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="e.g. Sarah Johnson"
              className="mt-1.5"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email or Instagram handle</Label>
            <Input
              value={contact}
              onChange={(e) => { setContact(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="sarah@example.com or @sarahj"
              className="mt-1.5"
            />
            {error && <p className="text-[11px] text-destructive mt-1.5">{error}</p>}
          </div>
        </div>

        <Button
          onClick={submit}
          className="w-full cta-primary gap-2"
          size="lg"
        >
          <Unlock className="w-4 h-4" /> Unlock copy & send
        </Button>

        <p className="text-[10px] text-muted-foreground/70 text-center leading-relaxed">
          We'll personalize the message with their name automatically.
        </p>
      </div>
    </div>
  );
}
