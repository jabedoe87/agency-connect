import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PLANS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

// Map plan names to Stripe price IDs — DO NOT CHANGE
const PRICE_IDS: Record<string, string> = {
  Starter: 'price_1TL0DJAu1BgRc5ulf5foxZg2',
  Pro: 'price_1TL0GUAu1BgRc5ul4oMu4Pfr',
  Business: 'price_1TL0dyAu1BgRc5ulybtJ4zi0',
};

interface PricingCardsProps {
  ctaPath?: string;
}

export default function PricingCards({ ctaPath = '/register' }: PricingCardsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loadingBtn, setLoadingBtn] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleCheckout = async (planName: string, checkoutMode: 'trial' | 'direct') => {
    // TODO remove before production cleanup
    console.log('[BILLING DEBUG] button clicked:', planName.toLowerCase());
    console.log('[BILLING DEBUG] checkoutMode:', checkoutMode);

    if (!user) {
      navigate('/register');
      return;
    }

    const priceId = PRICE_IDS[planName];
    if (!priceId) {
      toast({ title: 'Not available', description: 'This plan is not yet configured for checkout.', variant: 'destructive' });
      return;
    }

    const btnKey = `${planName}-${checkoutMode}`;
    setLoadingBtn(btnKey);
    setCheckoutError(null);

    try {
      // Get auth session for protected edge function
      const { data: { session } } = await supabase.auth.getSession();

      // TODO remove before production cleanup
      console.log('[BILLING DEBUG] auth session exists:', !!session);

      // Build full edge function URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const functionUrl = `${supabaseUrl}/functions/v1/create-checkout`;

      // TODO remove before production cleanup
      console.log('[BILLING DEBUG] function URL:', functionUrl);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          ...(session?.access_token
            ? { 'Authorization': `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ priceId, checkoutMode }),
      });

      // TODO remove before production cleanup
      console.log('[BILLING DEBUG] fetch status:', response.status);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[BILLING DEBUG] error body:', errorBody);
        throw new Error(`Checkout failed (HTTP ${response.status})`);
      }

      const data = await response.json();

      // TODO remove before production cleanup
      console.log('[BILLING DEBUG] response keys:', Object.keys(data));

      const checkoutUrl = data?.url || data?.sessionUrl || data?.session?.url;

      // TODO remove before production cleanup
      console.log('[BILLING DEBUG] checkout url exists:', !!checkoutUrl);

      if (!checkoutUrl || typeof checkoutUrl !== 'string' || !checkoutUrl.startsWith('http')) {
        console.error('[BILLING DEBUG] invalid checkout URL:', data);
        throw new Error('Missing Stripe checkout URL');
      }

      // TODO remove before production cleanup
      console.log('[BILLING DEBUG] redirecting to Stripe');

      // Direct redirect — NO navigate(), NO router.push(), NO intermediate page
      window.location.assign(checkoutUrl);

    } catch (err: any) {
      // TODO remove before production cleanup
      console.error('[BILLING DEBUG] checkout error:', err?.message || err);

      setLoadingBtn(null);
      setCheckoutError('Checkout could not be started. Please try again.');
      toast({ title: 'Checkout failed', description: err.message || 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {PLANS.map((plan) => {
        const hasPriceId = !!PRICE_IDS[plan.name];

        return (
          <div key={plan.name} className={`glass-card p-6 flex flex-col relative ${plan.badge ? 'ring-2 ring-primary' : ''}`}>
            {plan.badge && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                {plan.badge}
              </Badge>
            )}
            <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
            <div className="mt-4 mb-6">
              <span className="text-4xl font-bold text-foreground">€{plan.price}</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="space-y-2">
              {hasPriceId && user ? (
                <>
                  <Button
                    className="w-full"
                    variant={plan.badge ? 'default' : 'outline'}
                    disabled={loadingBtn === `${plan.name}-trial`}
                    onClick={() => handleCheckout(plan.name, 'trial')}
                  >
                    {loadingBtn === `${plan.name}-trial` ? 'Loading...' : 'Start Free Trial'}
                  </Button>
                  <Button
                    className="w-full"
                    variant="secondary"
                    disabled={loadingBtn === `${plan.name}-direct`}
                    onClick={() => handleCheckout(plan.name, 'direct')}
                  >
                    {loadingBtn === `${plan.name}-direct` ? 'Loading...' : 'Buy Now'}
                  </Button>
                </>
              ) : (
                <Link to={ctaPath}>
                  <Button className="w-full" variant={plan.badge ? 'default' : 'outline'}>Start Free Trial</Button>
                </Link>
              )}
              {checkoutError && (
                <p className="text-destructive text-sm mt-2">{checkoutError}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
