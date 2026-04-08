import AppLayout from '@/components/AppLayout';
import { Sparkles } from 'lucide-react';

export default function Generator() {
  return (
    <AppLayout>
      <div className="p-4 md:p-8 fade-in">
        <h1 className="font-display text-2xl md:text-3xl text-foreground mb-2">Content Generator</h1>
        <p className="text-sm text-muted-foreground mb-8">Generate high-converting content for your business.</p>
        <div className="glass-card p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
          <Sparkles className="w-12 h-12 text-primary mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Coming in Batch 2</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            The full AI content generator with style presets, demo mode, and copy tools will be built in the next batch.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
