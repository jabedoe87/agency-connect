import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardHero() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-10 mb-8">
      {/* Subtle glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl">
        <h2 className="font-display text-2xl md:text-4xl text-foreground leading-tight mb-3">
          Make Content That Brings You Clients — In 60 Seconds
        </h2>
        <p className="text-muted-foreground text-sm md:text-base mb-6 max-w-lg">
          Generate high-converting content tailored to your business and start attracting real customers today.
        </p>
        <Button
          size="lg"
          className="gap-2 text-sm font-semibold"
          onClick={() => navigate('/generator')}
        >
          <Sparkles className="w-4 h-4" />
          Generate My First Client-Getting Content
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Before / After demo */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="rounded-lg border border-border bg-muted/50 p-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Before</span>
          <p className="text-sm text-muted-foreground leading-relaxed">
            "We offer personal training sessions"
          </p>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 shadow-[0_0_20px_hsl(var(--primary)/0.08)]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2 block">After</span>
          <p className="text-sm text-foreground leading-relaxed">
            "Transform your body, build unstoppable confidence and finally feel proud of what you see in the mirror."
          </p>
        </div>
      </div>
    </section>
  );
}
