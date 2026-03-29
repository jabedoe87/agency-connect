import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PLANS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface PricingCardsProps {
  ctaPath?: string;
}

export default function PricingCards({ ctaPath = '/register' }: PricingCardsProps) {
  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {PLANS.map((plan) => (
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
          <Link to={ctaPath}>
            <Button className="w-full" variant={plan.badge ? 'default' : 'outline'}>Start Free Trial</Button>
          </Link>
        </div>
      ))}
    </div>
  );
}
