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
import { Users, Plus, Search, Pencil, Trash2, UserCheck } from 'lucide-react';
import { LEAD_SOURCES, PIPELINE_STAGES, CUSTOM_FIELDS_CONFIG } from '@/lib/constants';
import type { Json } from '@/integrations/supabase/types';

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  custom_fields: Json | null;
  created_at: string;
  user_id: string;
}

export default function Leads() {
  const { user, profile } = useAuth();
  const { logActivity } = useActivityLog();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSource, setFormSource] = useState('Website');
  const [formStatus, setFormStatus] = useState('New');
  const [formNotes, setFormNotes] = useState('');
  const [formCustom, setFormCustom] = useState<Record<string, string>>({});

  const businessType = profile?.business_type || 'Other';
  const stages = PIPELINE_STAGES[businessType] || PIPELINE_STAGES['Other'];
  const customFields = CUSTOM_FIELDS_CONFIG[businessType] || [];

  const fetchLeads = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [user]);

  const resetForm = () => {
    setFormName(''); setFormPhone(''); setFormEmail(''); setFormSource('Website');
    setFormStatus(stages[0] || 'New'); setFormNotes(''); setFormCustom({});
    setEditing(null);
  };

  const openAdd = () => { resetForm(); setFormStatus(stages[0] || 'New'); setShowModal(true); };

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setFormName(lead.name);
    setFormPhone(lead.phone || '');
    setFormEmail(lead.email || '');
    setFormSource(lead.source || 'Website');
    setFormStatus(lead.status);
    setFormNotes(lead.notes || '');
    setFormCustom((lead.custom_fields as Record<string, string>) || {});
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
      phone: formPhone,
      email: formEmail,
      source: formSource,
      status: formStatus,
      notes: formNotes,
      custom_fields: formCustom as unknown as Json,
    };

    if (editing) {
      const { error } = await supabase.from('leads').update(payload).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      await logActivity('Lead Updated', `Updated lead: ${formName}`);
      toast({ title: 'Lead updated' });
    } else {
      const { error } = await supabase.from('leads').insert(payload);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      await logActivity('Lead Added', `Added lead: ${formName}`);
      toast({ title: 'Lead added' });
    }

    setShowModal(false);
    resetForm();
    fetchLeads();
  };

  const handleDelete = async (lead: Lead) => {
    const { error } = await supabase.from('leads').delete().eq('id', lead.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    await logActivity('Lead Deleted', `Deleted lead: ${lead.name}`);
    toast({ title: 'Lead deleted' });
    fetchLeads();
  };

  const handleConvert = async (lead: Lead) => {
    if (!user) return;
    const { error } = await supabase.from('clients').insert({
      user_id: user.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      notes: lead.notes,
      custom_fields: lead.custom_fields,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

    await supabase.from('leads').update({ status: 'Won' }).eq('id', lead.id);
    await logActivity('Lead Converted', `Converted ${lead.name} to client`);
    toast({ title: `${lead.name} converted to client!` });
    fetchLeads();
  };

  const filtered = leads.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.email || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <AppLayout>
      <div className="p-4 md:p-8 fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Lead</Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 && leads.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="No leads yet"
            description="Add your first lead to get started."
            actionLabel="Add Lead"
            onAction={openAdd}
          />
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No leads match your search.</p>
        ) : (
          <div className="glass-card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Phone</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Source</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{lead.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{lead.phone}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{lead.email}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">{lead.source}</td>
                    <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(lead)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleConvert(lead)} title="Convert to Client">
                          <UserCheck className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(lead)} title="Delete">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
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
            <DialogTitle>{editing ? 'Edit Lead' : 'Add Lead'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
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
                <Label>Source</Label>
                <Select value={formSource} onValueChange={setFormSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
            <Button onClick={handleSave} className="w-full">{editing ? 'Update Lead' : 'Add Lead'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
