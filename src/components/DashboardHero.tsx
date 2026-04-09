import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardHero() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-10">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl">
        <h2 className="font-display text-2xl md:text-4xl text-foreground leading-tight mb-3">
          Make Content That Brings You Clients — In 60 Seconds
        </h2>
        <p className="text-muted-foreground text-sm md:text-base mb-6 max-w-lg leading-relaxed">
          Generate high-converting content tailored to your business and start attracting real customers today.
        </p>
        <Button
          size="lg"
          className="gap-2 cta-primary"
          onClick={() => navigate('/generator')}
        >
          <Sparkles className="w-4 h-4" />
          Generate My First Client-Getting Content
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <span className="label-uppercase mb-2 block text-[10px]">Before</span>
          <p className="text-sm text-muted-foreground leading-relaxed">
            "We offer personal training sessions"
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/10 p-5">
          <span className="label-uppercase mb-2 block text-[10px] text-primary">After</span>
          <p className="text-sm text-foreground leading-relaxed">
            "Transform your body, build unstoppable confidence and finally feel proud of what you see in the mirror."
          </p>
        </div>
      </div>
    </section>
  );
}
