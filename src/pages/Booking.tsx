import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import AppLayout from '@/components/AppLayout';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, Plus, List, Grid3X3, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { APPOINTMENT_TYPES } from '@/lib/constants';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, getDay } from 'date-fns';

interface Appointment {
  id: string;
  client_or_lead_name: string;
  date: string;
  time: string;
  appointment_type: string;
  notes: string | null;
  created_at: string;
  user_id: string;
}

export default function Booking() {
  const { user, profile } = useAuth();
  const { logActivity } = useActivityLog();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formType, setFormType] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const businessType = profile?.business_type || 'Other';
  const apptTypes = APPOINTMENT_TYPES[businessType] || APPOINTMENT_TYPES['Other'];

  const fetchAppointments = async () => {
    if (!user) return;
    const { data } = await supabase.from('appointments').select('*').eq('user_id', user.id).order('date', { ascending: true });
    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, [user]);

  const fetchSuggestions = async (query: string) => {
    if (!user || query.length < 2) { setSuggestions([]); return; }
    const [leads, clients] = await Promise.all([
      supabase.from('leads').select('name').eq('user_id', user.id).ilike('name', `%${query}%`).limit(5),
      supabase.from('clients').select('name').eq('user_id', user.id).ilike('name', `%${query}%`).limit(5),
    ]);
    const names = [...(leads.data || []), ...(clients.data || [])].map((r) => r.name);
    setSuggestions([...new Set(names)]);
  };

  const resetForm = () => {
    setFormName(''); setFormDate(''); setFormTime(''); setFormType(apptTypes[0] || ''); setFormNotes('');
    setEditing(null); setSuggestions([]);
  };

  const openAdd = (date?: string) => {
    resetForm();
    if (date) setFormDate(date);
    setFormType(apptTypes[0] || '');
    setShowModal(true);
  };

  const openEdit = (appt: Appointment) => {
    setEditing(appt);
    setFormName(appt.client_or_lead_name);
    setFormDate(appt.date);
    setFormTime(appt.time);
    setFormType(appt.appointment_type);
    setFormNotes(appt.notes || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user || !formName.trim() || !formDate || !formTime) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const payload = {
      user_id: user.id,
      client_or_lead_name: formName.trim(),
      date: formDate,
      time: formTime,
      appointment_type: formType || apptTypes[0],
      notes: formNotes,
    };

    if (editing) {
      const { error } = await supabase.from('appointments').update(payload).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      await logActivity('Appointment Updated', `Updated appointment with ${formName}`);
      toast({ title: 'Appointment updated' });
    } else {
      const { error } = await supabase.from('appointments').insert(payload);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      await logActivity('Appointment Booked', `Booked appointment with ${formName}`);
      toast({ title: 'Appointment booked' });
    }

    setShowModal(false);
    resetForm();
    fetchAppointments();
  };

  const handleDelete = async (appt: Appointment) => {
    const { error } = await supabase.from('appointments').delete().eq('id', appt.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    await logActivity('Appointment Deleted', `Deleted appointment with ${appt.client_or_lead_name}`);
    toast({ title: 'Appointment deleted' });
    fetchAppointments();
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart); // 0 = Sunday

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((a) => {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    });
    return map;
  }, [appointments]);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Booking</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')}>
              {view === 'calendar' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
            </Button>
            <Button onClick={() => openAdd()}><Plus className="w-4 h-4 mr-2" /> Add Appointment</Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : appointments.length === 0 && view === 'list' ? (
          <EmptyState
            icon={<CalendarDays className="w-8 h-8" />}
            title="No appointments yet"
            description="Book your first appointment to get started."
            actionLabel="Add Appointment"
            onAction={() => openAdd()}
          />
        ) : view === 'calendar' ? (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold text-foreground">{format(currentMonth, 'MMMM yyyy')}</h2>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-px">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
              {Array.from({ length: startPadding }).map((_, i) => (
                <div key={`pad-${i}`} className="p-2 min-h-[80px]" />
              ))}
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayAppts = appointmentsByDate[dateStr] || [];
                return (
                  <div
                    key={dateStr}
                    className={`p-2 min-h-[80px] border border-border rounded cursor-pointer hover:bg-muted/30 transition-colors ${
                      isToday(day) ? 'bg-primary/10 border-primary/30' : ''
                    }`}
                    onClick={() => openAdd(dateStr)}
                  >
                    <span className={`text-xs font-medium ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                      {format(day, 'd')}
                    </span>
                    {dayAppts.map((a) => (
                      <div
                        key={a.id}
                        className="mt-1 text-[10px] bg-primary/20 text-primary rounded px-1 py-0.5 truncate cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); openEdit(a); }}
                      >
                        {a.time.slice(0, 5)} {a.client_or_lead_name}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="glass-card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{a.client_or_lead_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.date}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.time.slice(0, 5)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{a.appointment_type}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Appointment' : 'Add Appointment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Label>Client or Lead Name *</Label>
              <Input
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  fetchSuggestions(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted"
                      onMouseDown={() => { setFormName(s); setShowSuggestions(false); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div>
                <Label>Time *</Label>
                <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Appointment Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {apptTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Update' : 'Book Appointment'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
