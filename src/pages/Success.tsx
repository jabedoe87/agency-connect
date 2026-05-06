import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function Success() {
  const navigate = useNavigate();
  const { user, profile, subscription, refreshProfile, checkSubscription } = useAuth();
  const [verifying, setVerifying] = useState(true);

  // Poll subscription/profile a few times to wait for webhook to land.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 6; i++) {
        if (cancelled) return;
        try {
          await checkSubscription?.();
          await refreshProfile?.();
        } catch {}
        const p: any = profile;
        if (p?.subscription_status === 'active' || p?.subscription_status === 'trialing') break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) setVerifying(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const p: any = profile || {};
  const status = p.subscription_status || subscription?.status || 'unknown';
  const unlocked = status === 'active' || status === 'trialing';

  return (
    <AppLayout>
      <div className="p-6 md:p-12 max-w-xl mx-auto fade-in text-center">
        <div className="flex justify-center mb-4">
          {verifying ? (
            <Loader2 className="w-16 h-16 animate-spin text-primary" />
          ) : (
            <CheckCircle2 className="w-16 h-16 text-[hsl(var(--success,142_71%_45%))]" />
          )}
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {verifying ? 'Verifying payment…' : 'Payment completed'}
        </h1>

        <div className="glass-card p-6 space-y-2 text-left text-sm">
          <Row label="Payment completed" value={unlocked ? 'yes' : verifying ? 'verifying…' : 'pending'} />
          <Row label="subscription_status" value={String(status)} />
          <Row label="plan" value={String(p.plan ?? '—')} />
          <Row label="plan_id" value={String(p.plan_id ?? subscription?.price_id ?? '—')} />
          <Row label="App unlocked" value={unlocked ? 'yes ✅' : 'no ❌'} />
        </div>

        <div className="mt-6 space-y-3">
          <Button className="w-full" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
          <Link to="/settings" className="block text-sm text-muted-foreground underline">
            Manage subscription
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground truncate max-w-[60%]">{value}</span>
    </div>
  );
}
