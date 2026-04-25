import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, CalendarDays, TrendingUp } from 'lucide-react';

type MetricState = number | null | 'error';

export default function Analytics() {
  const { user } = useAuth();
  const [total, setTotal] = useState<MetricState>(null);
  const [thisMonth, setThisMonth] = useState<MetricState>(null);
  const [last7, setLast7] = useState<MetricState>(null);

  useEffect(() => {
    if (!user) return;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const load = async () => {
      try {
        const r = await supabase
          .from('generated_content')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        setTotal(r.error ? 'error' : (r.count ?? 0));
      } catch {
        setTotal('error');
      }

      try {
        const r = await supabase
          .from('generated_content')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', monthStart.toISOString());
        setThisMonth(r.error ? 'error' : (r.count ?? 0));
      } catch {
        setThisMonth('error');
      }

      try {
        const r = await supabase
          .from('generated_content')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', sevenDaysAgo.toISOString());
        setLast7(r.error ? 'error' : (r.count ?? 0));
      } catch {
        setLast7('error');
      }
    };

    load();
  }, [user]);

  const renderValue = (v: MetricState) => {
    if (v === null) return <Skeleton className="h-9 w-16" />;
    if (v === 'error') return <span className="text-3xl font-display text-muted-foreground">—</span>;
    return <span className="text-3xl font-display text-foreground">{v}</span>;
  };

  const isEmpty = total === 0 && thisMonth === 0 && last7 === 0;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 fade-in">
        <h1 className="font-display text-2xl md:text-3xl text-foreground mb-2">Analytics</h1>
        <p className="text-sm text-muted-foreground mb-8">Track your content generation activity.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Total Generated</span>
              <FileText className="w-4 h-4 text-primary" />
            </div>
            {renderValue(total)}
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">This Month</span>
              <CalendarDays className="w-4 h-4 text-primary" />
            </div>
            {renderValue(thisMonth)}
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Last 7 Days</span>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            {renderValue(last7)}
          </div>
        </div>

        {isEmpty && (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No data yet. Generate content to see insights.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
