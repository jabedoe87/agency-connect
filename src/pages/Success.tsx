import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function Success() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  // Trigger a subscription refresh so the UI unlocks premium quickly.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        await supabase.functions.invoke('check-subscription');
      } catch {
        // non-blocking
      }
      if (!cancelled) await refreshProfile?.();
    })();
    return () => { cancelled = true; };
  }, [user, refreshProfile]);

  return (
    <AppLayout>
      <div className="p-6 md:p-12 max-w-xl mx-auto fade-in text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="w-16 h-16 text-[hsl(var(--success,142_71%_45%))]" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Payment successful</h1>
        <p className="text-muted-foreground mb-8">
          Your subscription is active. Premium features are now unlocked.
        </p>

        <div className="glass-card p-6 space-y-3">
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
