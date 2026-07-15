import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import DashboardHero from '@/components/DashboardHero';
import ConversionBanner from '@/components/ConversionBanner';
import { Users, UserCheck, CalendarDays, DollarSign, Clock, Sparkles, CreditCard, Plus } from 'lucide-react';
import AddAppointmentDialog from '@/components/AddAppointmentDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Stats {
  totalLeads: number;
  totalClients: number;
  upcomingAppointments: number;
  monthlyRevenue: number;
}

interface Activity {
  id: string;
  action: string;
  description: string;
  created_at: string;
}

interface UpcomingAppointment {
  id: string;
  client_or_lead_name: string;
  date: string;
  time: string;
  appointment_type: string;
}

export default function Dashboard() {
  const { user, profile, subscription, refreshProfile, checkSubscription } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({ totalLeads: 0, totalClients: 0, upcomingAppointments: 0, monthlyRevenue: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingAppointment[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showAddAppt, setShowAddAppt] = useState(false);

  // Handle Stripe checkout return: refresh profile + subscription, then clean URL.
  useEffect(() => {
    if (searchParams.get('checkout') !== 'success') return;
    (async () => {
      await Promise.all([refreshProfile(), checkSubscription()]);
      console.log('[billing] refreshed after checkout');
      toast({ title: 'Payment successful', description: 'Your plan is now active.' });
      searchParams.delete('checkout');
      setSearchParams(searchParams, { replace: true });
    })();
  }, [searchParams, setSearchParams, refreshProfile, checkSubscription, toast]);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const PRICE_TO_PLAN: Record<string, string> = {
    'price_1TL0DJAu1BgRc5ulf5foxZg2': 'Starter',
    'price_1TL0GUAu1BgRc5ul4oMu4Pfr': 'Pro',
    'price_1TL0dyAu1BgRc5ulybtJ4zi0': 'Business',
  };

  const activePlan = subscription?.subscribed && subscription.price_id
    ? PRICE_TO_PLAN[subscription.price_id] || 'Active'
    : null;

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await supabase.functions.invoke('customer-portal');
      if (res.error) throw res.error;
      const { url } = res.data;
      if (url) window.location.href = url;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not open subscription portal.', variant: 'destructive' });
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const [leads, clients, appointments, revenue] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('date', new Date().toISOString().split('T')[0]),
        supabase.from('clients').select('monthly_value').eq('user_id', user.id).eq('status', 'Active'),
      ]);
      
      setStats({
        totalLeads: leads.count || 0,
        totalClients: clients.count || 0,
        upcomingAppointments: appointments.count || 0,
        monthlyRevenue: (revenue.data || []).reduce((sum, c) => sum + (Number(c.monthly_value) || 0), 0),
      });
    };

    const fetchActivities = async () => {
      const { data } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setActivities((data as Activity[]) || []);
    };

    const fetchUpcoming = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('appointments')
        .select('id, client_or_lead_name, date, time, appointment_type')
        .eq('user_id', user.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(5);
      setUpcoming((data as UpcomingAppointment[]) || []);
    };

    fetchStats();
    fetchActivities();
    fetchUpcoming();
  }, [user]);

  const refreshAppointments = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const [countRes, listRes] = await Promise.all([
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('date', today),
      supabase.from('appointments').select('id, client_or_lead_name, date, time, appointment_type').eq('user_id', user.id).gte('date', today).order('date', { ascending: true }).order('time', { ascending: true }).limit(5),
    ]);
    setStats((s) => ({ ...s, upcomingAppointments: countRes.count || 0 }));
    setUpcoming((listRes.data as UpcomingAppointment[]) || []);
  };

  const statCards = [
    { label: 'Total Leads', value: stats.totalLeads, icon: Users, color: 'text-info' },
    { label: 'Total Clients', value: stats.totalClients, icon: UserCheck, color: 'text-success' },
    { label: 'Upcoming Appointments', value: stats.upcomingAppointments, icon: CalendarDays, color: 'text-warning' },
    { label: 'Monthly Revenue', value: `€${stats.monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-primary' },
  ];

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-6 md:py-8 fade-in space-y-6">
        {/* Dashboard header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl text-foreground">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your business today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0 w-full md:w-auto">
            {activePlan ? (
              <Badge className="bg-success/15 text-success border-success/20 border">
                {activePlan} {subscription?.status === 'trialing' ? '(Trial)' : ''}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">No Plan</Badge>
            )}
            {subscription?.subscribed && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleManageSubscription} disabled={portalLoading}>
                <CreditCard className="w-3.5 h-3.5" />
                {portalLoading ? 'Loading...' : 'Manage'}
              </Button>
            )}
            <Button variant="outline" className="gap-2 flex-1 md:flex-none min-w-0" onClick={() => setShowAddAppt(true)}>
              <Plus className="w-4 h-4" /> <span className="truncate">Add Appointment</span>
            </Button>
            <Button className="gap-2 cta-primary flex-1 md:flex-none min-w-0" onClick={() => navigate('/generator')}>
              <Sparkles className="w-4 h-4" /> <span className="truncate">Generate Content</span>
            </Button>
          </div>
        </div>

        <AddAppointmentDialog
          open={showAddAppt}
          onOpenChange={setShowAddAppt}
          onCreated={refreshAppointments}
        />

        <ConversionBanner />
        <DashboardHero />

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((s) => (
            <div key={s.label} className="glass-card p-5 card-interactive">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-semibold text-foreground">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming Appointments */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-muted-foreground" /> Upcoming Appointments
            </h2>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAddAppt(true)}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No upcoming appointments. Click "Add" to book one.</p>
          ) : (
            <div className="space-y-0">
              {upcoming.map((a) => {
                const dt = new Date(`${a.date}T${a.time}`);
                return (
                  <div key={a.id} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                    <div>
                      <p className="text-sm text-foreground font-medium">{a.client_or_lead_name}</p>
                      <p className="text-xs text-muted-foreground">{a.appointment_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-foreground">{dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                      <p className="text-xs text-muted-foreground">{a.time.slice(0, 5)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" /> Recent Activity
          </h2>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity yet. Start by adding a lead or booking an appointment.</p>
          ) : (
            <div className="space-y-0">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                  <div>
                    <p className="text-sm text-foreground font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground/70 whitespace-nowrap ml-4">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
