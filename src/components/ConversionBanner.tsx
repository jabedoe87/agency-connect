import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

export default function ConversionBanner() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const now = new Date();
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 7;
  const isOnTrial = profile?.plan === 'trial';
  const trialExpired = isOnTrial && trialEndsAt && trialEndsAt < now;

  if (!isOnTrial) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-primary/5 p-5 md:p-6 mb-8">
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
  );
}
