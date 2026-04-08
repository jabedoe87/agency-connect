import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FolderOpen, Sparkles, Clock, Copy, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ContentItem {
  id: string;
  niche: string;
  preset: string;
  content: {
    hook: string;
    emotional_benefit: string;
    bullets: string[];
    objection_handler: string;
    cta: string;
  };
  created_at: string;
}

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('generated_content')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems((data as unknown as ContentItem[]) || []);
        setLoading(false);
      });
  }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('generated_content').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting', description: error.message, variant: 'destructive' });
    } else {
      setItems(prev => prev.filter(i => i.id !== id));
      toast({ title: 'Content deleted' });
    }
  };

  const handleCopy = async (item: ContentItem) => {
    const c = item.content;
    const text = `${c.hook}\n\n${c.emotional_benefit}\n\n${c.bullets.map(b => `• ${b}`).join('\n')}\n\n${c.objection_handler}\n\n${c.cta}`;
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl md:text-3xl text-foreground">Your Client Content Workspace</h1>
            <p className="text-sm text-muted-foreground mt-1">All your generated content in one place — designed to convert.</p>
          </div>
          <Button className="mt-3 md:mt-0 gap-2" onClick={() => navigate('/generator')}>
            <Sparkles className="w-4 h-4" /> Generate New Content
          </Button>
        </div>

        {loading ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
            <FolderOpen className="w-12 h-12 text-primary/40 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No content yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Generate your first piece of client-getting content to see it here.
            </p>
            <Button onClick={() => navigate('/generator')} className="gap-2">
              <Sparkles className="w-4 h-4" /> Generate My First Content
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="glass-card p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.niche}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {item.preset}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                  {item.content?.hook}
                </p>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => handleCopy(item)}>
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
