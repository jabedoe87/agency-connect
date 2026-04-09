import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const getAuthErrorMessage = (error: any): string => {
    const msg = error?.message?.toLowerCase() || '';
    console.log('[AUTH DEBUG] Supabase error:', error?.message, error?.status);
    if (msg.includes('invalid login credentials')) {
      return 'Invalid email or password. If you signed up with Google, use the "Continue with Google" button below.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Please confirm your email before logging in. Check your inbox.';
    }
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) {
      return 'Could not reach the authentication service. Check your connection and try again.';
    }
    return error?.message || 'Something went wrong. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log('[AUTH DEBUG] Provider attempted: email');
    try {
      // Clear any stale/corrupted session before attempting login
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        console.log('[AUTH DEBUG] Clearing stale session before login');
        await supabase.auth.signOut();
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('[AUTH DEBUG] error:', error?.message ?? 'none');
      console.log('[AUTH DEBUG] session:', !!data?.session);

      if (error) {
        // Check if this email is registered via Google OAuth only
        if (error.message === 'Invalid login credentials') {
          toast({
            title: 'Login failed',
            description: 'Invalid email or password. If you signed up with Google, use the "Continue with Google" button below.',
            variant: 'destructive',
          });
        } else {
          toast({ title: 'Login failed', description: getAuthErrorMessage(error), variant: 'destructive' });
        }
        return;
      }

      if (data.session) {
        console.log('[AUTH DEBUG] Session created: true, redirecting');
        navigate('/dashboard');
      } else {
        toast({ title: 'Login failed', description: 'No session returned. Please try again.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Login failed', description: getAuthErrorMessage(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your AgencyOS account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 glass-card p-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={async () => {
              const result = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (result.error) {
                toast({ title: 'Google sign-in failed', description: String(result.error), variant: 'destructive' });
              }
            }}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </Button>
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p><Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link></p>
            <p>Don't have an account? <Link to="/register" className="text-primary hover:underline">Sign up</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}
