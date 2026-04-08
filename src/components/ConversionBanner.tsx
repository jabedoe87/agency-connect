import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Zap, TrendingUp } from 'lucide-react';

export default function ConversionBanner() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [contentCount, setContentCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('generated_content')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setContentCount(count || 0));
  }, [user]);

  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const now = new Date();
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 7;
  const isOnTrial = profile?.plan === 'trial';
  const trialExpired = isOnTrial && trialEndsAt && trialEndsAt < now;

  return (
    <div className="space-y-4 mb-8">
      {/* Trial / upgrade banner */}
      {isOnTrial && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-primary/5 p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-primary" />
                {trialExpired
                  ? "Your free trial has ended"
                  : "You're 1 step away from unlimited client-generating content."}
              </h3>
              <p className="text-sm text-muted-foreground">
                {trialExpired
                  ? "Upgrade now to keep creating content that brings you customers."
                  : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left — upgrade now to keep creating content that brings you customers.`}
              </p>
            </div>
            <Button
              size="lg"
              className="whitespace-nowrap font-semibold shadow-lg shadow-primary/20"
              onClick={() => navigate('/pricing')}
            >
              Unlock Unlimited Content
            </Button>
          </div>
        </div>
      )}

      {/* Usage trigger banner */}
      {contentCount > 0 && (
        <div className="rounded-xl border border-border bg-card/80 p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  You've generated {contentCount} piece{contentCount !== 1 ? 's' : ''} of content
                </p>
                <p className="text-xs text-muted-foreground">Designed to convert — ready to use, no editing needed.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
              View Projects
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
