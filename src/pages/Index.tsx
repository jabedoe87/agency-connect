import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, Zap, MessageSquare, PenTool, BarChart3 } from 'lucide-react';
import PricingCards from '@/components/PricingCards';
import { useAuth } from '@/contexts/AuthContext';

const features = [
  { icon: Users, title: 'Get More Customers', description: 'Capture and manage leads from every channel. Turn prospects into paying clients with a clear pipeline.' },
  { icon: Zap, title: 'Less Manual Work', description: 'Automate repetitive tasks so you can focus on growing your business instead of admin work.' },
  { icon: MessageSquare, title: 'Automated Follow-Ups', description: 'Never lose a lead again. Set up smart follow-up sequences that run on autopilot.' },
  { icon: PenTool, title: 'AI Content for Social Media', description: 'Generate engaging social posts, captions and content ideas tailored to your business.' },
  { icon: BarChart3, title: 'Manage Clients & Leads', description: 'Track every interaction, appointment and deal in one place with real-time analytics.' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users (e.g. returning from Google OAuth) to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
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
              <Button size="sm">Start Trial</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-24 text-center fade-in">
        <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
          Get More Customers and Appointments <span className="text-primary">Automatically</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          AgencyOS helps local businesses manage leads, book appointments, respond to reviews and automate follow-ups — all in one system.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register">
            <Button size="lg" className="text-base px-8">Start your 7-day trial</Button>
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
