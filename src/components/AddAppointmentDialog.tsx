import { useEffect, useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { APPOINTMENT_TYPES } from '@/lib/constants';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const schema = z.object({
  name: z.string().trim().min(1, 'Client or lead name is required').max(100, 'Name too long'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  type: z.string().min(1, 'Appointment type is required'),
});

export default function AddAppointmentDialog({ open, onOpenChange, onCreated }: Props) {
  const { user, profile } = useAuth();
  const { logActivity } = useActivityLog();
  const { toast } = useToast();

  const businessType = profile?.business_type || 'Other';
  const apptTypes = APPOINTMENT_TYPES[businessType] || APPOINTMENT_TYPES['Other'];

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState(apptTypes[0] || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setDate('');
      setTime('');
      setType(apptTypes[0] || '');
    }
  }, [open, apptTypes]);

  const handleSave = async () => {
    if (!user) return;

    const parsed = schema.safeParse({ name, date, time, type });
    if (!parsed.success) {
      toast({ title: 'Invalid input', description: parsed.error.errors[0].message, variant: 'destructive' });
      return;
    }

    // Reject past date/time
    const apptDateTime = new Date(`${date}T${time}`);
    if (isNaN(apptDateTime.getTime())) {
      toast({ title: 'Invalid date or time', variant: 'destructive' });
      return;
    }
    if (apptDateTime.getTime() <= Date.now()) {
      toast({ title: 'Cannot book in the past', description: 'Please choose a future date and time.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    // Duplicate check: same user, same date, same time
    const { data: existing, error: dupErr } = await supabase
      .from('appointments')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', date)
      .eq('time', time)
      .maybeSingle();

    if (dupErr) {
      setSaving(false);
      toast({ title: 'Error', description: dupErr.message, variant: 'destructive' });
      return;
    }
    if (existing) {
      setSaving(false);
      toast({ title: 'Duplicate appointment', description: 'You already have an appointment at that date and time.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('appointments').insert({
      user_id: user.id,
      client_or_lead_name: parsed.data.name,
      date,
      time,
      appointment_type: type || apptTypes[0],
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    await logActivity('Appointment Booked', `Booked appointment with ${parsed.data.name}`);
    toast({ title: 'Appointment booked' });
    onOpenChange(false);
    onCreated?.();
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Client or Lead Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={date} min={todayStr} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Time *</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Appointment Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {apptTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Book Appointment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
