import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sun, Users, Target, DollarSign, CalendarDays, Sparkles, Loader2, ArrowRight, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface Briefing {
  newLeads: number;
  followUps: number;
  appointmentsToday: number;
  monthlyRevenue: number;
  hotLeadName?: string;
}

interface PriorityTask {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  urgency: 'high' | 'medium' | 'low';
}

interface Suggestion {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
}

export function BriefingCard() {
  const { user, profile } = useAuth();
  const [b, setB] = useState<Briefing | null>(null);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    (async () => {
      const [nl, fu, at, rev, hot] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', weekAgo),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['Contacted', 'Follow-up']),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('date', today),
        supabase.from('clients').select('monthly_value').eq('user_id', user.id).eq('status', 'Active'),
        supabase.from('leads').select('name').eq('user_id', user.id).eq('status', 'New').order('created_at', { ascending: false }).limit(1),
      ]);
      setB({
        newLeads: nl.count ?? 0,
        followUps: fu.count ?? 0,
        appointmentsToday: at.count ?? 0,
        monthlyRevenue: (rev.data ?? []).reduce((s, c) => s + (Number(c.monthly_value) || 0), 0),
        hotLeadName: hot.data?.[0]?.name,
      });
    })();
  }, [user]);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center text-warning">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-lg text-foreground">{greet}, {firstName}</h2>
            <p className="text-xs text-muted-foreground">Your daily briefing</p>
          </div>
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </Badge>
      </div>
      {b ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <BriefStat icon={Users} label="New this week" value={b.newLeads} tone="text-info" />
          <BriefStat icon={Target} label="Need follow-up" value={b.followUps} tone="text-warning" />
          <BriefStat icon={CalendarDays} label="Appts today" value={b.appointmentsToday} tone="text-success" />
          <BriefStat icon={DollarSign} label="MRR" value={`€${b.monthlyRevenue.toLocaleString()}`} tone="text-primary" />
        </div>
      ) : (
        <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">Loading briefing…</div>
      )}
      {b?.hotLeadName && (
        <p className="text-sm text-muted-foreground mt-4">
          <span className="text-foreground font-medium">{b.hotLeadName}</span> is your newest lead — reach out today.
        </p>
      )}
    </div>
  );
}

function BriefStat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number | string; tone: string }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
      <Icon className={`w-4 h-4 mb-1.5 ${tone}`} />
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

export function PriorityTasksCard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<PriorityTask[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const [stale, todayAppts, newLeads] = await Promise.all([
        supabase.from('leads').select('id,name,last_contact,status').eq('user_id', user.id).in('status', ['Contacted', 'Follow-up']).order('last_contact', { ascending: true, nullsFirst: true }).limit(5),
        supabase.from('appointments').select('id,client_or_lead_name,time,appointment_type').eq('user_id', user.id).eq('date', today).order('time').limit(5),
        supabase.from('leads').select('id,name,created_at').eq('user_id', user.id).eq('status', 'New').order('created_at', { ascending: false }).limit(3),
      ]);
      const list: PriorityTask[] = [];
      (todayAppts.data ?? []).forEach((a: any) => list.push({
        id: `a-${a.id}`, title: `${a.time?.slice(0, 5)} • ${a.client_or_lead_name}`, subtitle: a.appointment_type,
        href: '/booking', urgency: 'high',
      }));
      (newLeads.data ?? []).forEach((l: any) => list.push({
        id: `nl-${l.id}`, title: `Contact ${l.name}`, subtitle: `New lead • ${formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}`,
        href: '/leads', urgency: 'high',
      }));
      (stale.data ?? []).forEach((l: any) => list.push({
        id: `s-${l.id}`, title: `Follow up with ${l.name}`, subtitle: l.last_contact ? `Last contact ${formatDistanceToNow(new Date(l.last_contact), { addSuffix: true })}` : 'No contact yet',
        href: '/leads', urgency: 'medium',
      }));
      setTasks(list.slice(0, 6));
    })();
  }, [user]);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Target className="w-4 h-4 text-warning" /> Priority tasks
        </h3>
        <Badge variant="outline">{tasks.length}</Badge>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">All caught up. Great work.</p>
      ) : (
        <ul className="space-y-1">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link to={t.href} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-white/[0.04] transition-colors group">
                <div className={`w-1.5 h-1.5 rounded-full ${t.urgency === 'high' ? 'bg-destructive' : 'bg-warning'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.subtitle}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LeadOverviewCard() {
  const { user } = useAuth();
  const [buckets, setBuckets] = useState<{ status: string; count: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('leads').select('status').eq('user_id', user.id);
      const map: Record<string, number> = {};
      (data ?? []).forEach((l: any) => { map[l.status] = (map[l.status] ?? 0) + 1; });
      setBuckets(Object.entries(map).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count));
    })();
  }, [user]);

  const total = useMemo(() => buckets.reduce((s, b) => s + b.count, 0), [buckets]);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-info" /> Lead overview
        </h3>
        <Link to="/leads" className="text-xs text-primary hover:underline">View all</Link>
      </div>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No leads yet. Add your first one in Leads.</p>
      ) : (
        <div className="space-y-2">
          {buckets.map((b) => (
            <div key={b.status}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{b.status}</span>
                <span className="text-xs text-foreground font-medium">{b.count}</span>
              </div>
              <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(b.count / total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AutomationSuggestionsCard() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-command-suggestions');
      if (error) throw error;
      setItems((data?.suggestions ?? []) as Suggestion[]);
      setLoaded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Automation suggestions
        </h3>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loaded ? 'Refresh' : 'Generate'}
        </Button>
      </div>
      {!loaded && !loading && (
        <p className="text-sm text-muted-foreground text-center py-6">
          AI will scan your leads, clients and appointments and suggest automations tailored to your pipeline.
        </p>
      )}
      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Analysing your pipeline…
        </div>
      )}
      {loaded && items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No suggestions right now — add more data to your pipeline.</p>
      )}
      <ul className="space-y-2">
        {items.map((s, i) => (
          <li key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="text-sm font-medium text-foreground">{s.title}</p>
              <Badge
                className={
                  s.impact === 'high' ? 'bg-success/15 text-success border-success/20 border' :
                  s.impact === 'medium' ? 'bg-warning/15 text-warning border-warning/20 border' :
                  'bg-muted text-muted-foreground border-border border'
                }
              >
                <TrendingUp className="w-3 h-3 mr-1" />{s.impact}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{s.description}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mt-1.5">{s.category}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
