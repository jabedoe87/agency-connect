import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import useMessageLimit from '@/hooks/useMessageLimit';
import { trackEvent } from '@/lib/analytics';

const STORAGE_KEY = 'upgrade_nudge_dismissed';

export default function UpgradeNudge() {
  const { shouldShowUpgrade, totalSent } = useMessageLimit();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) !== 'true'
  );

  useEffect(() => {
    if (shouldShowUpgrade && visible) {
      trackEvent('upgrade_prompt_shown', { type: 'nudge', total_sent: totalSent });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShowUpgrade]);

  if (!shouldShowUpgrade || !visible) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    trackEvent('upgrade_dismissed', { source: 'nudge' });
  };

  const handleUpgrade = () => {
    trackEvent('upgrade_clicked', { source: 'nudge' });
    navigate('/pricing');
  };

  return (
    <div className="rounded-lg mx-4 mt-2 bg-primary text-primary-foreground px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm">
          You've sent {totalSent} messages and you're getting results. Go unlimited to keep the
          momentum going.
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleUpgrade}
            className="text-sm font-medium bg-background text-primary px-3 py-1 rounded-md hover:opacity-90"
          >
            Go Unlimited
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="text-primary-foreground/70 hover:text-primary-foreground"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="text-xs text-primary-foreground/60 hover:text-primary-foreground hover:underline w-full text-center mt-1"
      >
        Maybe later
      </button>
    </div>
  );
}
