import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface UsageBannerProps {
  used: number;
  limit: number;
  onUpgrade: () => void;
}

const STORAGE_KEY = 'upgrade_banner_dismissed';

export function useBannerDismissal() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(STORAGE_KEY) === 'true';
  });
  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };
  return { dismissed, dismiss };
}

export default function UsageBanner({ used, limit, onUpgrade }: UsageBannerProps) {
  const { dismissed, dismiss } = useBannerDismissal();

  useEffect(() => {
    if (!dismissed) trackEvent('upgrade_prompt_shown', { type: 'banner' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed) return null;

  const handleUpgrade = () => {
    trackEvent('upgrade_clicked', { source: 'banner' });
    onUpgrade();
  };
  const handleDismiss = () => {
    trackEvent('upgrade_dismissed', { source: 'banner' });
    dismiss();
  };

  return (
    <div className="w-full bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between gap-4">
      <span className="text-sm">
        You've used {used}/{limit} free messages today. Upgrade for unlimited.
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
          className="text-primary-foreground/80 hover:text-primary-foreground"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
