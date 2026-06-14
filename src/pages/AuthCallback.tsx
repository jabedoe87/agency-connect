import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      try {
        // Check URL for OAuth error first
        const url = new URL(window.location.href);
        const errorDescription =
          url.searchParams.get('error_description') ||
          new URLSearchParams(url.hash.replace(/^#/, '')).get('error_description');
        if (errorDescription) {
          throw new Error(errorDescription);
        }

        // The Supabase client auto-detects the session from the URL hash/query.
        // Give it a brief moment, then check.
        for (let i = 0; i < 20; i++) {
          const { data } = await supabase.auth.getSession();
          if (cancelled) return;
          if (data.session) {
            navigate('/dashboard', { replace: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 150));
        }

        throw new Error('No session could be established.');
      } catch (err: any) {
        if (cancelled) return;
        toast({
          title: 'Google sign-in failed',
          description: err?.message || 'Could not complete sign-in. Please try again.',
          variant: 'destructive',
        });
        navigate('/login', { replace: true });
      }
    };

    finish();
    return () => {
      cancelled = true;
    };
  }, [navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
