import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function PaymentFailedBanner() {
  const { profile, subscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show when subscription status indicates a failed payment
  const hasFailedPayment =
    subscription?.status === 'past_due' ||
    subscription?.status === 'unpaid' ||
    profile?.plan === 'past_due';

  useEffect(() => {
    if (hasFailedPayment) setDismissed(false);
  }, [hasFailedPayment]);

  if (!hasFailedPayment || dismissed) return null;

  const handleUpdateCard = async () => {
    setLoading(true);
    const popup = window.open('about:blank', '_blank');
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      const url = data?.url;
      if (!url) throw new Error('No portal URL returned');
      if (popup) popup.location = url;
      else window.location.href = url;
    } catch (err: any) {
      if (popup && !popup.closed) popup.close();
      toast.error('Could not open billing portal', {
        description: err?.message || 'Please try again in a moment.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Payment failed</p>
            <p className="text-muted-foreground">
              Update your card to restore full access. It only takes a moment.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleUpdateCard}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Opening…</>
            ) : (
              'Update card'
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
