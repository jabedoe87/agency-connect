import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/AppLayout';
import { LIVE_TEST_PRICE_ID, TEST_BUTTON_ADMIN_EMAIL } from '@/lib/testPrice';

export default function Upgrade() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.email?.toLowerCase() === TEST_BUTTON_ADMIN_EMAIL.toLowerCase();

  const handlePay = async () => {
    setError(null);

    if (!user) {
      window.location.href = '/login?redirect=/upgrade';
      return;
    }

    if (!LIVE_TEST_PRICE_ID) {
      setError('€1 test price is not configured yet.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: LIVE_TEST_PRICE_ID, checkoutMode: 'direct' },
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
          See pricing on the <Link to="/pricing" className="underline">pricing page</Link>.
        </p>

        {true && (
          <div className="glass-card p-6 space-y-4 border border-primary/30">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Admin: €1 LIVE test payment</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Visible only to admin. Charges €1 in LIVE mode to validate the full Stripe → webhook → Supabase flow.
              </p>
            </div>

            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={loading || !LIVE_TEST_PRICE_ID}
              onClick={handlePay}
            >
              {loading ? 'Redirecting to Stripe…' : 'Pay €1 test'}
            </Button>

            {!LIVE_TEST_PRICE_ID && (
              <p className="text-sm text-destructive">
                €1 price ID not set. Edit <code>src/lib/testPrice.ts</code> and paste the LIVE price_xxx.
              </p>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
