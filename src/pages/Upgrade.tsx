import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/AppLayout';

export default function Upgrade() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [priceIds, setPriceIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke('get-price-ids');
      if (!cancelled && !error && data?.priceIds) setPriceIds(data.priceIds);
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePay = async () => {
    setError(null);

    if (!user) {
      window.location.href = '/login?redirect=/upgrade';
      return;
    }

    const priceId = priceIds.starter;
    if (!priceId) {
      setError('Checkout is not configured yet. Please try again in a moment.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, checkoutMode: 'direct' },
      });
      if (error) throw new Error(error.message);

      const url = data?.url || data?.sessionUrl || data?.session?.url;
      if (!url || !url.includes('stripe.com')) {
        throw new Error('Invalid Stripe checkout URL');
      }
      window.location.href = url;
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Could not start checkout.');
      toast({ title: 'Checkout failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-12 max-w-xl mx-auto fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-3">Upgrade your account</h1>
        <p className="text-muted-foreground mb-8">
          Run a quick test charge to verify the payment flow end-to-end.
        </p>

        <div className="glass-card p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Test payment</h2>
            <p className="text-sm text-muted-foreground mt-1">
              You'll be redirected to Stripe to complete the payment securely.
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={loading}
            onClick={handlePay}
          >
            {loading ? 'Redirecting to Stripe…' : 'Pay €1 test'}
          </Button>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <p className="text-xs text-muted-foreground text-center">
            Need the full plans?{' '}
            <Link to="/pricing" className="underline">View pricing</Link>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
