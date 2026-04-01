import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { BUSINESS_TYPES, LEAD_SOURCES, PIPELINE_STAGES, APPOINTMENT_TYPES, PLANS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Step 2 state
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('Other');
  const [businessDescription, setBusinessDescription] = useState('');

  // Pre-fill from profile when it loads
  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || '');
      setPhone(profile.phone || '');
      setBusinessType(profile.business_type || 'Other');
      setBusinessDescription(profile.business_description || '');
    }
  }, [profile]);

  // Step 3 state
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadSource, setLeadSource] = useState('Website');
  const [leadStatus, setLeadStatus] = useState('New');

  // Step 4 state
  const [apptName, setApptName] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [apptType, setApptType] = useState('');

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const stages = PIPELINE_STAGES[businessType] || PIPELINE_STAGES['Other'];
  const apptTypes = APPOINTMENT_TYPES[businessType] || APPOINTMENT_TYPES['Other'];

  const saveStep2 = async () => {
    if (!user) return;
    await supabase.from('profiles').update({
      company_name: companyName,
      phone,
      business_type: businessType,
      business_description: businessDescription,
    }).eq('user_id', user.id);
    await refreshProfile();
    setStep(3);
  };

  const saveStep3 = async () => {
    if (!user || !leadName) { setStep(4); return; }
    await supabase.from('leads').insert({
      user_id: user.id,
      name: leadName,
      phone: leadPhone,
      email: leadEmail,
      source: leadSource,
      status: leadStatus,
    });
    await supabase.from('activity_log').insert({
      user_id: user.id,
      action: 'Lead Added',
      description: `Added lead: ${leadName}`,
    });
    setStep(4);
  };

  const saveStep4 = async () => {
    if (!user || !apptName || !apptDate || !apptTime) { setStep(5); return; }
    await supabase.from('appointments').insert({
      user_id: user.id,
      client_or_lead_name: apptName,
      date: apptDate,
      time: apptTime,
      appointment_type: apptType || apptTypes[0],
    });
    await supabase.from('activity_log').insert({
      user_id: user.id,
      action: 'Appointment Booked',
      description: `Booked appointment with ${apptName}`,
    });
    setStep(5);
  };

  const finishOnboarding = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('user_id', user.id);
    await refreshProfile();
    toast({ title: "You're all set! Welcome to AgencyOS." });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg fade-in">
        <Progress value={(step / totalSteps) * 100} className="mb-8" />
        <p className="text-xs text-muted-foreground text-center mb-6">Step {step} of {totalSteps}</p>

        {step === 1 && (
          <div className="glass-card p-8 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to AgencyOS, {firstName}!</h1>
            <p className="text-muted-foreground mb-8">Let's set up your account in a few minutes.</p>
            <Button onClick={() => setStep(2)} className="w-full">Get Started</Button>
          </div>
        )}

        {step === 2 && (
          <div className="glass-card p-8 space-y-4">
            <h2 className="text-xl font-bold text-foreground mb-4">Business Profile</h2>
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
              <Textarea value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} placeholder="Briefly describe your business..." />
            </div>
            <Button onClick={saveStep2} className="w-full">Continue</Button>
          </div>
        )}

        {step === 3 && (
          <div className="glass-card p-8 space-y-4">
            <h2 className="text-xl font-bold text-foreground mb-4">Add Your First Lead</h2>
            <div>
              <Label>Name</Label>
              <Input value={leadName} onChange={(e) => setLeadName(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} />
            </div>
            <div>
              <Label>Source</Label>
              <Select value={leadSource} onValueChange={setLeadSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={leadStatus} onValueChange={setLeadStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(4)} className="flex-1">Skip</Button>
              <Button onClick={saveStep3} className="flex-1">Add Lead</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="glass-card p-8 space-y-4">
            <h2 className="text-xl font-bold text-foreground mb-4">Book Your First Appointment</h2>
            <div>
              <Label>Name</Label>
              <Input value={apptName} onChange={(e) => setApptName(e.target.value)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={apptTime} onChange={(e) => setApptTime(e.target.value)} />
            </div>
            <div>
              <Label>Appointment Type</Label>
              <Select value={apptType} onValueChange={setApptType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {apptTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(5)} className="flex-1">Skip</Button>
              <Button onClick={saveStep4} className="flex-1">Book Appointment</Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="glass-card p-8">
            <h2 className="text-xl font-bold text-foreground mb-2">Choose Your Plan</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You are on a 7-day free trial. Choose a plan to activate after your trial.
            </p>
            <div className="space-y-4 mb-6">
              {PLANS.map((plan) => (
                <div key={plan.name} className={`border rounded-lg p-4 ${plan.badge ? 'border-primary' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold text-foreground">{plan.name}</span>
                      {plan.badge && <Badge className="ml-2 bg-primary text-primary-foreground text-[10px]">{plan.badge}</Badge>}
                    </div>
                    <span className="text-lg font-bold text-foreground">€{plan.price}<span className="text-sm text-muted-foreground font-normal">/mo</span></span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {plan.features.map((f) => (
                      <span key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                        <Check className="w-3 h-3 text-primary" />{f}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={finishOnboarding} className="flex-1">Continue with Trial</Button>
              <Button onClick={finishOnboarding} className="flex-1">Select Plan</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
