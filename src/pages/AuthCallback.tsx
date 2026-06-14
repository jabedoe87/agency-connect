import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const log = (msg: string, extra?: Record<string, unknown>) => {
      // Tagged so it's easy to filter in browser/console and remote logs
      console.info(`[oauth-callback] ${msg}`, extra ?? {});
    };
    const logError = (msg: string, extra?: Record<string, unknown>) => {
      console.error(`[oauth-callback] ${msg}`, extra ?? {});
    };

    const finish = async () => {
      const startedAt = Date.now();
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const searchParams = url.searchParams;

        const oauthError = searchParams.get('error') || hashParams.get('error');
        const errorCode =
          searchParams.get('error_code') || hashParams.get('error_code');
        const errorDescription =
          searchParams.get('error_description') ||
          hashParams.get('error_description');
        const hasCode = Boolean(searchParams.get('code'));
        const hasAccessToken = Boolean(hashParams.get('access_token'));

        log('callback hit', {
          path: url.pathname,
          hasCode,
          hasAccessToken,
          oauthError,
          errorCode,
        });

        if (oauthError || errorDescription) {
          logError('OAuth provider returned error', {
            oauthError,
            errorCode,
            errorDescription,
          });
          throw new Error(errorDescription || oauthError || 'OAuth error');
        }

        // Supabase client auto-detects session from URL.
        // Poll briefly for the session to appear.
        for (let i = 0; i < 30; i++) {
          const { data, error } = await supabase.auth.getSession();
          if (cancelled) return;
          if (error) {
            logError('getSession error', { attempt: i, error: error.message });
          }
          if (data.session) {
            log('session established', {
              attempt: i,
              elapsedMs: Date.now() - startedAt,
              userId: data.session.user.id,
            });
            navigate('/dashboard', { replace: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 150));
        }

        logError('no session after polling', {
          elapsedMs: Date.now() - startedAt,
        });
        throw new Error('No session could be established.');
      } catch (err: any) {
        if (cancelled) return;
        const message = err?.message || 'Could not complete sign-in.';
        logError('callback failed', { message });
        toast({
          title: 'Google sign-in failed',
          description: message,
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
