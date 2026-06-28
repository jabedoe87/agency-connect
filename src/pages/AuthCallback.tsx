import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const CALLBACK_LOG_PREFIX = '[oauth-callback]';

const getAuthErrorDetails = (error: unknown) => {
  const maybe = error as { message?: string; status?: number; code?: string; name?: string } | null;
  return {
    name: maybe?.name,
    message: maybe?.message ?? String(error),
    status: maybe?.status,
    code: maybe?.code,
  };
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const log = (msg: string, extra?: Record<string, unknown>) => {
      // Tagged so it's easy to filter in browser/console and remote logs
      console.info(`${CALLBACK_LOG_PREFIX} ${msg}`, extra ?? {});
    };
    const logError = (msg: string, extra?: Record<string, unknown>) => {
      console.error(`${CALLBACK_LOG_PREFIX} ${msg}`, extra ?? {});
    };

    const navigateToLoginWithError = (message: string) => {
      navigate('/login', {
        replace: true,
        state: { authError: message },
      });
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

        if (hasCode) {
          log('authorization code detected; exchanging for session');
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            searchParams.get('code')!
          );

          if (cancelled) return;

          if (error) {
            logError('exchangeCodeForSession failed', getAuthErrorDetails(error));
            throw error;
          }

          if (data.session) {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) {
              logError('getUser after exchange failed', getAuthErrorDetails(userError));
            }
            log('session established after code exchange', {
              elapsedMs: Date.now() - startedAt,
              userId: userData.user?.id ?? data.session.user.id,
            });
            navigate('/dashboard', { replace: true });
            return;
          }

          logError('code exchange returned no session', {
            elapsedMs: Date.now() - startedAt,
          });
        }

        // Supabase client auto-detects session from URL.
        // Poll briefly for the session to appear.
        for (let i = 0; i < 30; i++) {
          const { data, error } = await supabase.auth.getSession();
          if (cancelled) return;
          if (error) {
            logError('getSession error', { attempt: i, ...getAuthErrorDetails(error) });
          }
          if (data.session) {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) {
              logError('getUser after polling failed', getAuthErrorDetails(userError));
            }
            log('session established', {
              attempt: i,
              elapsedMs: Date.now() - startedAt,
              userId: userData.user?.id ?? data.session.user.id,
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
        logError('callback failed', getAuthErrorDetails(err));
        toast({
          title: 'Google sign-in failed',
          description: message,
          variant: 'destructive',
        });
        navigateToLoginWithError(message);
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
