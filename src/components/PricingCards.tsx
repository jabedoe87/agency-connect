import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PLANS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, type MouseEvent } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface PricingCardsProps {
  ctaPath?: string;
}

export default function PricingCards({ ctaPath = '/register' }: PricingCardsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const [loadingBtn, setLoadingBtn] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [priceIds, setPriceIds] = useState<Record<string, string>>({});

  // Resolve current price IDs from edge function (single source of truth via STRIPE_MODE)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke('get-price-ids');
      if (cancelled) return;
      if (!error && data?.priceIds) setPriceIds(data.priceIds);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCheckout = async (
    e: MouseEvent<HTMLButtonElement> | undefined,
    priceId: string,
    checkoutMode: 'trial' | 'direct',
    planName: string,
  ) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    track('upgrade_clicked', { source: 'pricing_cards', plan: planName, mode: checkoutMode });

    if (!priceId) {
      toast({ title: 'Not available', description: 'This plan is not yet configured for checkout.', variant: 'destructive' });
      return;
    }

    setLoadingBtn(`${planName}-${checkoutMode}`);
    setCheckoutError(null);

    const popup = window.open('about:blank', '_blank');

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, checkoutMode },
      });

      if (error) throw new Error(error.message);

      const checkoutUrl = data?.url || data?.sessionUrl || data?.session?.url;

      if (!checkoutUrl || !checkoutUrl.includes('stripe.com')) {
        throw new Error('Invalid Stripe checkout URL');
      }

      if (popup) popup.location = checkoutUrl;
      else window.location.href = checkoutUrl;
    } catch (err: any) {
      if (popup && !popup.closed) popup.close();
      setLoadingBtn(null);
      setCheckoutError('Checkout could not be started. Please try again.');
      toast({ title: 'Checkout failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {PLANS.map((plan) => {
        const planKey = plan.name.toLowerCase();
        const priceId = priceIds[planKey];
        const hasPriceId = !!priceId;

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
                    onClick={(e) => handleCheckout(e, priceId, 'trial', plan.name)}
                  >
                    {loadingBtn === `${plan.name}-trial` ? 'Loading...' : 'Start your 7-day trial'}
                  </Button>
                  <Button
                    type="button"
                    className="w-full"
                    variant="secondary"
                    disabled={loadingBtn === `${plan.name}-direct`}
                    onClick={(e) => handleCheckout(e, priceId, 'direct', plan.name)}
                  >
                    {loadingBtn === `${plan.name}-direct` ? 'Loading...' : 'Get Clients Now'}
                  </Button>
                </>
              ) : (
                <Link to={ctaPath}>
                  <Button className="w-full" variant={plan.badge ? 'default' : 'outline'}>Start your 7-day trial</Button>
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
