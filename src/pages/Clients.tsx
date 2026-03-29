import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import AppLayout from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { CUSTOM_FIELDS_CONFIG } from '@/lib/constants';
import type { Json } from '@/integrations/supabase/types';

interface Client {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  monthly_value: number | null;
  status: string;
  notes: string | null;
  custom_fields: Json | null;
  created_at: string;
  user_id: string;
}

const CLIENT_STATUSES = ['Active', 'Inactive', 'Churned'];

export default function Clients() {
  const { user, profile } = useAuth();
  const { logActivity } = useActivityLog();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [formNotes, setFormNotes] = useState('');
  const [formCustom, setFormCustom] = useState<Record<string, string>>({});

  const businessType = profile?.business_type || 'Other';
  const customFields = CUSTOM_FIELDS_CONFIG[businessType] || [];

  const fetchClients = async () => {
    if (!user) return;
    const { data } = await supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setClients((data as Client[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [user]);

  const resetForm = () => {
    setFormName(''); setFormCompany(''); setFormPhone(''); setFormEmail('');
    setFormValue(''); setFormStatus('Active'); setFormNotes(''); setFormCustom({});
    setEditing(null);
  };

  const openAdd = () => { resetForm(); setShowModal(true); };

  const openEdit = (client: Client) => {
    setEditing(client);
    setFormName(client.name);
    setFormCompany(client.company || '');
    setFormPhone(client.phone || '');
    setFormEmail(client.email || '');
    setFormValue(String(client.monthly_value || ''));
    setFormStatus(client.status);
    setFormNotes(client.notes || '');
    setFormCustom((client.custom_fields as Record<string, string>) || {});
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user || !formName.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    const payload = {
      user_id: user.id,
      name: formName.trim(),
      company: formCompany,
      phone: formPhone,
      email: formEmail,
      monthly_value: formValue ? parseFloat(formValue) : 0,
      status: formStatus,
      notes: formNotes,
      custom_fields: formCustom as unknown as Json,
    };

    if (editing) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      await logActivity('Client Updated', `Updated client: ${formName}`);
      toast({ title: 'Client updated' });
    } else {
      const { error } = await supabase.from('clients').insert(payload);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      await logActivity('Client Added', `Added client: ${formName}`);
      toast({ title: 'Client added' });
    }

    setShowModal(false);
    resetForm();
    fetchClients();
  };

  const handleDelete = async (client: Client) => {
    const { error } = await supabase.from('clients').delete().eq('id', client.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    await logActivity('Client Deleted', `Deleted client: ${client.name}`);
    toast({ title: 'Client deleted' });
    fetchClients();
  };

  const filtered = clients.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <AppLayout>
      <div className="p-4 md:p-8 fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Client</Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {CLIENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 && clients.length === 0 ? (
          <EmptyState
            icon={<UserCheck className="w-8 h-8" />}
            title="No clients yet"
            description="Add your first client or convert a lead."
            actionLabel="Add Client"
            onAction={openAdd}
          />
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No clients match your search.</p>
        ) : (
          <div className="glass-card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Company</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Phone</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Value (€)</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{client.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{client.company}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{client.phone}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{client.email}</td>
                    <td className="px-4 py-3 text-sm text-foreground">€{Number(client.monthly_value || 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={client.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(client)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(client)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Client' : 'Add Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={formCompany} onChange={(e) => setFormCompany(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monthly Value (€)</Label>
                <Input type="number" value={formValue} onChange={(e) => setFormValue(e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLIENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {customFields.map((field) => (
              <div key={field.name}>
                <Label>{field.label}</Label>
                {field.type === 'select' && field.options ? (
                  <Select value={formCustom[field.name] || ''} onValueChange={(v) => setFormCustom({ ...formCustom, [field.name]: v })}>
                    <SelectTrigger><SelectValue placeholder={`Select ${field.label}`} /></SelectTrigger>
                    <SelectContent>
                      {field.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={formCustom[field.name] || ''} onChange={(e) => setFormCustom({ ...formCustom, [field.name]: e.target.value })} />
                )}
              </div>
            ))}
            <div>
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Update Client' : 'Add Client'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
