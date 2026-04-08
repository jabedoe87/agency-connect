import AppLayout from '@/components/AppLayout';
import { BarChart3 } from 'lucide-react';

export default function Analytics() {
  return (
    <AppLayout>
      <div className="p-4 md:p-8 fade-in">
        <h1 className="font-display text-2xl md:text-3xl text-foreground mb-2">Analytics</h1>
        <p className="text-sm text-muted-foreground mb-8">Track your content performance and client acquisition.</p>
        <div className="glass-card p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
          <BarChart3 className="w-12 h-12 text-primary mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Coming Soon</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Analytics dashboard with content performance metrics will be available in a future update.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
