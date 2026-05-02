import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SUBSCRIPTION_CACHE_KEY = 'agencyos_subscription_cache_v1';
const SUBSCRIPTION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SUBSCRIPTION_HEALTH_TTL_MS = 60 * 1000; // 1 minute
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readSubscriptionCache(userId: string): SubscriptionStatus | null {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId: string; ts: number; data: SubscriptionStatus };
    if (parsed.userId !== userId) return null;
    if (Date.now() - parsed.ts > SUBSCRIPTION_CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeSubscriptionCache(userId: string, data: SubscriptionStatus) {
  try {
    localStorage.setItem(
      SUBSCRIPTION_CACHE_KEY,
      JSON.stringify({ userId, ts: Date.now(), data })
    );
  } catch {
    // ignore quota errors
  }
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  company_name: string;
  phone: string;
  business_type: string;
  business_description: string;
  plan: string;
  subscription_status: string;
  trial_ends_at: string;
  grace_period_ends_at: string | null;
  onboarding_completed: boolean;
  created_at: string;
  ai_generations_count: number;
  ai_generations_reset_at: string;
}

interface SubscriptionStatus {
  subscribed: boolean;
  price_id: string | null;
  product_id: string | null;
  subscription_end: string | null;
  status: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  subscription: SubscriptionStatus | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata: Record<string, string>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    setProfile(data as Profile | null);
  };

  const failureToastShownRef = useRef(false);
  const subscriptionRef = useRef<SubscriptionStatus | null>(null);
  const subscriptionCheckInFlightRef = useRef<Promise<void> | null>(null);
  const healthReadyUntilRef = useRef(0);

  useEffect(() => {
    subscriptionRef.current = subscription;
  }, [subscription]);

  const checkSubscription = useCallback(async () => {
    if (subscriptionCheckInFlightRef.current) return subscriptionCheckInFlightRef.current;

    const runCheck = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const userId = sessionData?.session?.user?.id;
      if (!accessToken || !userId) return;

      // Hydrate from cache immediately so UI never blank-screens during transient errors
      const cached = readSubscriptionCache(userId);
      if (cached && !subscriptionRef.current) setSubscription(cached);

      if (Date.now() > healthReadyUntilRef.current) {
        const health = await supabase.functions.invoke('check-subscription/health');
        if (health.error || health.data?.ready !== true) {
          throw health.error ?? new Error('check-subscription is not ready');
        }
        healthReadyUntilRef.current = Date.now() + SUBSCRIPTION_HEALTH_TTL_MS;
      }

      // Retry with exponential backoff on 503 / network errors
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const res = await supabase.functions.invoke('check-subscription', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (res.error) {
            const status = (res.error as any)?.context?.status ?? (res.error as any)?.status;
            // Retry only on 5xx / 503; bail immediately on 4xx
            if (status && status >= 400 && status < 500) {
              lastErr = res.error;
              break;
            }
            lastErr = res.error;
            if (attempt < MAX_RETRIES - 1) {
              await sleep(Math.pow(2, attempt) * 1000); // 1s, 2s, 4s
              continue;
            }
            break;
          }

          const data = res.data as SubscriptionStatus & { fallback?: boolean; error?: string };
          // Edge function returned soft-fallback (transient internal error)
          if (data?.fallback) {
            lastErr = new Error(data.error || 'fallback');
            if (attempt < MAX_RETRIES - 1) {
              await sleep(Math.pow(2, attempt) * 1000);
              continue;
            }
            break;
          }

          setSubscription(data);
          writeSubscriptionCache(userId, data);
          failureToastShownRef.current = false;
          return;
        } catch (e) {
          lastErr = e;
          if (attempt < MAX_RETRIES - 1) {
            await sleep(Math.pow(2, attempt) * 1000);
          }
        }
      }

      // All retries exhausted — keep cached value, show non-blocking toast once
      if (lastErr && !failureToastShownRef.current) {
        failureToastShownRef.current = true;
        toast.error('Subscription status temporarily unavailable', {
          description: 'Using last known status. We\'ll retry automatically.',
        });
      }
    } catch {
      // silently fail — UI keeps last known subscription
    }
    };

    subscriptionCheckInFlightRef.current = runCheck().finally(() => {
      subscriptionCheckInFlightRef.current = null;
    });
    return subscriptionCheckInFlightRef.current;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setSubscription(null);
        }
        setLoading(false);
      }
    );

    return () => authSub.unsubscribe();
  }, []);

  // Check subscription on login + 15s safety poll + realtime instant updates on profile changes
  useEffect(() => {
    if (!user) return;
    checkSubscription();

    // 15s safety poll — keeps state fresh if realtime/webhook is delayed
    const interval = setInterval(checkSubscription, 15000);

    // Realtime: instant gating when stripe-webhook updates the profile row
    const channel = supabase
      .channel(`profile-changes-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
        () => {
          fetchProfile(user.id);
          checkSubscription();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, checkSubscription]);

  const signUp = async (email: string, password: string, metadata: Record<string, string>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    
    // Update profile with additional fields
    if (data.user) {
      await supabase.from('profiles').update({
        full_name: metadata.full_name,
        company_name: metadata.company_name,
        phone: metadata.phone,
        business_type: metadata.business_type,
      }).eq('user_id', data.user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, subscription, loading, signUp, signIn, signOut, resetPassword, refreshProfile, checkSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
