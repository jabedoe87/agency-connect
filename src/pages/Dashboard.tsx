import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import DashboardHero from '@/components/DashboardHero';
import ConversionBanner from '@/components/ConversionBanner';
import { Users, UserCheck, CalendarDays, DollarSign, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

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

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalLeads: 0, totalClients: 0, upcomingAppointments: 0, monthlyRevenue: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

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

    fetchStats();
    fetchActivities();
  }, [user]);

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
          <Button className="mt-3 md:mt-0 gap-2 px-6 py-2.5 font-semibold" onClick={() => navigate('/generator')}>
            <Sparkles className="w-4 h-4" /> Start Generating Content
          </Button>
        </div>

        <ConversionBanner />
        <DashboardHero />

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="glass-card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" /> Recent Activity
          </h2>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity yet. Start by adding a lead or booking an appointment.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                  <div>
                    <p className="text-sm text-foreground font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
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
