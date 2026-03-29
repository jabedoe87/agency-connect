import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Users, UserCheck, CalendarDays, DollarSign, Clock } from 'lucide-react';
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
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalLeads: 0, totalClients: 0, upcomingAppointments: 0, monthlyRevenue: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);

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
      <div className="p-4 md:p-8 fade-in">
        <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s) => (
            <div key={s.label} className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${s.color}`}>
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

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" /> Recent Activity
          </h2>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity yet. Start by adding a lead or booking an appointment.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
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
