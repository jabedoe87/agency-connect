import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Plus, Send, Trash2, MessageSquare, Loader2, User as UserIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ThreadRow { id: string; title: string; updated_at: string }

export default function CommandChat() {
  const { threadId } = useParams<{ threadId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [session, setSession] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => setSession(s?.access_token ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshThreads = async () => {
    if (!user) return;
    const { data } = await supabase.from('ai_threads').select('id,title,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false });
    setThreads((data ?? []) as ThreadRow[]);
    return (data ?? []) as ThreadRow[];
  };

  // Bootstrap: load threads, ensure one exists, navigate.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const list = await refreshThreads();
      if (!threadId) {
        const target = list && list.length > 0 ? list[0].id : await createThread();
        if (target) navigate(`/ai-command/${target}`, { replace: true });
      }
    })();
  }, [user, threadId]);

  // Load messages for the active thread
  useEffect(() => {
    if (!threadId || !user) return;
    (async () => {
      const { data } = await supabase.from('ai_messages').select('id,role,parts,created_at').eq('thread_id', threadId).order('created_at', { ascending: true });
      const msgs: UIMessage[] = (data ?? []).map((m: any) => ({
        id: m.id,
        role: m.role,
        parts: Array.isArray(m.parts) ? m.parts : [{ type: 'text', text: String(m.parts ?? '') }],
      }));
      setInitialMessages(msgs);
    })();
  }, [threadId, user]);

  const transport = new DefaultChatTransport({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-command-chat`,
    headers: () => ({
      Authorization: `Bearer ${session ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    }),
    body: { threadId },
  });

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages ?? [],
    transport,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, status]);

  useEffect(() => {
    if (status === 'ready') textareaRef.current?.focus();
  }, [status, threadId]);

  const createThread = async (): Promise<string | undefined> => {
    if (!user) return;
    const { data, error } = await supabase.from('ai_threads').insert({ user_id: user.id, title: 'New conversation' }).select('id').single();
    if (error || !data) return;
    await refreshThreads();
    return data.id;
  };

  const handleNewThread = async () => {
    const id = await createThread();
    if (id) navigate(`/ai-command/${id}`);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('ai_threads').delete().eq('id', id);
    const list = await refreshThreads();
    if (id === threadId) {
      const next = list && list.length > 0 ? list[0].id : await createThread();
      if (next) navigate(`/ai-command/${next}`, { replace: true });
    }
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !threadId) return;
    setInput('');
    await sendMessage({ text });
    refreshThreads();
  };

  const loading = status === 'submitted' || status === 'streaming';

  return (
    <div className="glass-card overflow-hidden flex flex-col md:flex-row h-[600px]">
      {/* Threads sidebar */}
      <aside className="md:w-64 border-b md:border-b-0 md:border-r border-white/10 flex flex-col">
        <div className="p-3 border-b border-white/10">
          <Button size="sm" className="w-full gap-1.5 cta-primary" onClick={handleNewThread}>
            <Plus className="w-3.5 h-3.5" /> New chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 max-h-40 md:max-h-none">
          {threads.length === 0 && <p className="text-xs text-muted-foreground text-center p-4">No conversations yet.</p>}
          {threads.map((t) => (
            <div
              key={t.id}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/[0.05] cursor-pointer group',
                t.id === threadId && 'bg-white/[0.06]',
              )}
              onClick={() => navigate(`/ai-command/${t.id}`)}
            >
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{t.title}</p>
                <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(t.updated_at), { addSuffix: true })}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                aria-label="Delete conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat window */}
      <section className="flex-1 flex flex-col min-w-0">
        <div className="p-3 border-b border-white/10 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Command Assistant</p>
            <p className="text-[10px] text-muted-foreground">Powered by Gemini · grounded on your data</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground space-y-3">
              <Bot className="w-8 h-8 mx-auto text-primary/60" />
              <p>Ask about your pipeline, priorities, or next best actions.</p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {['Give me a briefing', 'What should I do first today?', 'Which leads are cold?'].map((q) => (
                  <button key={q} onClick={() => setInput(q)} className="text-xs px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/[0.05] text-foreground">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const text = m.parts.map((p) => (p.type === 'text' ? p.text : '')).join('');
            const isUser = m.role === 'user';
            return (
              <div key={m.id} className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                  isUser ? 'bg-primary text-primary-foreground' : 'bg-white/[0.06] text-foreground',
                )}>
                  {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                  isUser ? 'bg-primary text-primary-foreground' : 'bg-white/[0.04] text-foreground',
                )}>
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{text}</p>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                      <ReactMarkdown>{text || '…'}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-foreground" />
              </div>
              <div className="bg-white/[0.04] rounded-2xl px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="p-3 border-t border-white/10">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
              }}
              placeholder="Ask about leads, priorities, next steps…"
              rows={1}
              className="min-h-[42px] max-h-32 resize-none bg-white/[0.03] border-white/10"
              disabled={loading || !threadId}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim() || !threadId} className="cta-primary shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
