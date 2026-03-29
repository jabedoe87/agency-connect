import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useActivityLog() {
  const { user } = useAuth();

  const logActivity = async (action: string, description: string) => {
    if (!user) return;
    await supabase.from('activity_log').insert({
      user_id: user.id,
      action,
      description,
    });
  };

  return { logActivity };
}
