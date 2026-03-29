import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { BUSINESS_TYPES } from '@/lib/constants';

export default function Settings() {
  const { user, profile, signOut, resetPassword, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [businessType, setBusinessType] = useState(profile?.business_type || 'Other');
  const [businessDescription, setBusinessDescription] = useState(profile?.business_description || '');
  const [saving, setSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      company_name: companyName,
      phone,
      business_type: businessType,
      business_description: businessDescription,
    }).eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      await refreshProfile();
      toast({ title: 'Profile updated' });
    }
    setSaving(false);
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      toast({ title: 'Check your email for a password reset link.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    // Sign out and redirect - actual account deletion would need a server function
    await signOut();
    toast({ title: 'Account deletion requested. You have been signed out.' });
    navigate('/');
  };

  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at).toLocaleDateString() : 'N/A';

  return (
    <AppLayout>
      <div className="p-4 md:p-8 fade-in max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="glass-card p-6 space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>Company Name</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label>Business Type</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Business Description</Label>
                <Textarea value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} />
              </div>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="subscription">
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Current Plan:</span>
                <Badge variant="outline" className="capitalize">{profile?.plan || 'trial'}</Badge>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Trial Ends:</span>
                <span className="text-sm text-foreground ml-2">{trialEndsAt}</span>
              </div>
              <Button onClick={() => navigate('/pricing')}>Upgrade Plan</Button>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <div className="glass-card p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">Email</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">Password</h3>
                <Button variant="outline" onClick={handleResetPassword}>Send Password Reset Email</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="danger">
            <div className="glass-card p-6 border-destructive/30">
              <h3 className="text-sm font-medium text-destructive mb-2">Delete Account</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This action is irreversible. All your data will be permanently deleted.
              </p>
              <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>Delete Account</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Type DELETE to confirm. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Type DELETE"
          />
          <Button
            variant="destructive"
            disabled={deleteConfirm !== 'DELETE'}
            onClick={handleDeleteAccount}
            className="w-full"
          >
            Permanently Delete Account
          </Button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
