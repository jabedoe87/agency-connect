import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, Zap, MessageSquare, PenTool, BarChart3 } from 'lucide-react';
import PricingCards from '@/components/PricingCards';
import { useAuth } from '@/contexts/AuthContext';

const features = [
  { icon: Users, title: 'Never Lose a Lead Again', description: 'Capture leads from Zillow, Realtor.com, Facebook and your website in one pipeline. Respond in minutes, not hours — because the first agent to reply usually wins the deal.' },
  { icon: Zap, title: 'Less Admin, More Showings', description: 'Automate repetitive tasks like lead responses, showing confirmations, and post-closing review requests — so you can focus on clients, not admin work.' },
  { icon: MessageSquare, title: 'Automated Follow-Ups', description: 'Never lose a lead to slow follow-up. Set up smart sequences that text and email new leads automatically until they book a showing.' },
  { icon: PenTool, title: 'AI Content for Listings', description: 'Generate engaging property descriptions, social posts, and captions for your listings — tailored to your local market.' },
  { icon: BarChart3, title: 'Manage Your Pipeline', description: 'Track every lead, showing, and closing in one place. See exactly which listings are generating the most interest with real-time analytics.' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users (e.g. returning from Google OAuth) to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-foreground">AgencyOS</span>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Login</Link>
            <Link to="/register">
              <Button size="sm">Start 7-Day Trial</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-24 text-center fade-in">
        <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
          Get More Real Estate Leads Into Closed Deals — <span className="text-primary">Automatically</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          AgencyOS helps solo agents and small real estate teams respond to leads instantly, book showings, request reviews after closing, and follow up automatically — all in one system.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register">
            <Button size="lg" className="text-base px-8">Start 7-Day Trial</Button>
          </Link>
          <a href="#pricing">
            <Button size="lg" variant="outline" className="text-base px-8">See Pricing</Button>
          </a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Cancel anytime.</p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="glass-card p-6 fade-in">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-foreground text-center mb-12">Simple, Transparent Pricing</h2>
        <PricingCards />
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">© 2026 AgencyOS. All rights reserved.</span>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <Link to="/login" className="hover:text-foreground">Login</Link>
            <Link to="/register" className="hover:text-foreground">Register</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
