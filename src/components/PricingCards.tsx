import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PLANS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, type MouseEvent } from 'react';

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
  const [loadingBtn, setLoadingBtn] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleCheckout = async (
    e: MouseEvent<HTMLButtonElement> | undefined,
    priceId: string,
    checkoutMode: 'trial' | 'direct',
    planName: string,
  ) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    setLoadingBtn(`${planName}-${checkoutMode}`);
    setCheckoutError(null);

    console.log('[BILLING DEBUG] button clicked:', planName);
    console.log('[BILLING DEBUG] checkoutMode:', checkoutMode);

    if (!priceId) {
      toast({ title: 'Not available', description: 'This plan is not yet configured for checkout.', variant: 'destructive' });
      setLoadingBtn(null);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, checkoutMode },
      });

      console.log('[BILLING DEBUG] invoke error exists:', !!error);
      console.log('[BILLING DEBUG] response keys:', data ? Object.keys(data) : []);

      if (error) {
        throw new Error(error.message || 'Checkout invoke failed');
      }

      const checkoutUrl = data?.url || data?.sessionUrl || data?.session?.url;

      console.log('[BILLING DEBUG] checkout url:', checkoutUrl || 'missing');

      if (!checkoutUrl || typeof checkoutUrl !== 'string') {
        throw new Error('Missing Stripe checkout URL');
      }

      const isStripeUrl =
        checkoutUrl.startsWith('https://checkout.stripe.com/') ||
        checkoutUrl.startsWith('https://buy.stripe.com/');

      if (!isStripeUrl) {
        throw new Error('Invalid Stripe checkout URL');
      }

      console.log('[BILLING DEBUG] redirecting to Stripe now');

      window.location.assign(checkoutUrl);
    } catch (err: any) {
      console.log('[BILLING DEBUG] checkout error:', err?.message);

      setLoadingBtn(null);
      setCheckoutError('Checkout could not be started. Please try again.');
      toast({ title: 'Checkout failed', description: err?.message || 'Please try again.', variant: 'destructive' });
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
                    type="button"
                    className="w-full"
                    variant={plan.badge ? 'default' : 'outline'}
                    disabled={loadingBtn === `${plan.name}-trial`}
                    onClick={(e) => handleCheckout(e, PRICE_IDS[plan.name], 'trial', plan.name)}
                  >
                    {loadingBtn === `${plan.name}-trial` ? 'Loading...' : 'Start Free Trial'}
                  </Button>
                  <Button
                    type="button"
                    className="w-full"
                    variant="secondary"
                    disabled={loadingBtn === `${plan.name}-direct`}
                    onClick={(e) => handleCheckout(e, PRICE_IDS[plan.name], 'direct', plan.name)}
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
