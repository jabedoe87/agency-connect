import PricingCards from '@/components/PricingCards';
import { Link } from 'react-router-dom';

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground">AgencyOS</Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Login</Link>
            <Link to="/register" className="text-sm text-primary hover:underline">Sign Up</Link>
          </div>
        </div>
      </nav>
      <div className="max-w-6xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-foreground text-center mb-4">Choose Your Plan</h1>
        <p className="text-muted-foreground text-center mb-12">7-day free trial included. Cancel anytime.</p>
        <PricingCards />
      </div>
    </div>
  );
}
