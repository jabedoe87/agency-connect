import { useEffect, useState } from 'react';
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
    if (!user || !name.trim() || !date || !time) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('appointments').insert({
      user_id: user.id,
      client_or_lead_name: name.trim(),
      date,
      time,
      appointment_type: type || apptTypes[0],
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    await logActivity('Appointment Booked', `Booked appointment with ${name}`);
    toast({ title: 'Appointment booked' });
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Client or Lead Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
