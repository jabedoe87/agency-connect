import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hammer, Lock } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import NicheGrid from '@/components/tools/NicheGrid';
import TemplateGrid from '@/components/tools/TemplateGrid';
import BuilderModal from '@/components/tools/BuilderModal';
import MyToolsList from '@/components/tools/MyToolsList';
import { TEMPLATES, NICHES } from '@/components/tools/toolTemplates';
import type { GeneratedTool, NicheId, ToolTemplate } from '@/components/tools/types';

const STORAGE_KEY = 'agencyos_tools_v2';
type Tab = 'build' | 'my' | 'embed';

function readTools(): GeneratedTool[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GeneratedTool[]) : [];
  } catch {
    return [];
  }
}

export default function ToolsPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>('build');
  const [niche, setNiche] = useState<NicheId | 'all'>('all');
  const [tools, setTools] = useState<GeneratedTool[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<ToolTemplate | null>(null);

  useEffect(() => setTools(readTools()), []);

  const plan =
    (user as { app_metadata?: { plan?: string } } | null)?.app_metadata?.plan ??
    profile?.plan ??
    'starter';
  const gated = plan === 'starter';

  const stats = useMemo(() => {
    const niches = new Set(tools.map((t) => t.niche));
    return {
      generated: tools.length,
      niches: niches.size,
      templates: TEMPLATES.length,
      embed: tools.length,
    };
  }, [tools]);

  const openBuilder = (t: ToolTemplate) => {
    setActiveTemplate(t);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setTools(readTools());
    setTab('my');
  };

  const handleDelete = (id: string) => {
    const next = tools.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setTools(next);
  };

  const TabBtn = ({ id, label }: { id: Tab; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        tab === id
          ? 'bg-primary text-primary-foreground'
          : 'bg-card text-muted-foreground hover:text-foreground border border-white/10'
      }`}
    >
      {label}
    </button>
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display flex items-center gap-2">
              <Hammer className="h-7 w-7 text-primary" aria-hidden="true" />
              Mini Tool Builder
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Generate embeddable lead-magnet tools for your clients in seconds.
            </p>
          </div>
          <Button
            onClick={() => {
              setActiveTemplate(TEMPLATES[0]);
              setModalOpen(true);
            }}
          >
            + Build New Tool
          </Button>
        </div>

        {gated && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm flex items-center gap-2">
              <Lock className="h-4 w-4" aria-hidden="true" />
              <span><b>Tool Builder</b> is a Pro feature. Upgrade to unlock all 20 templates.</span>
            </div>
            <Button asChild size="sm">
              <Link to="/upgrade">Upgrade →</Link>
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <TabBtn id="build" label="Build New Tool" />
          <TabBtn id="my" label={`My Tools (${tools.length})`} />
          <TabBtn id="embed" label="Embed & Share" />
        </div>

        {tab === 'build' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Tools generated', value: stats.generated },
                { label: 'Niches active', value: stats.niches },
                { label: 'Templates', value: stats.templates },
                { label: 'Embed-ready', value: stats.embed },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-card p-4">
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Pick a niche</h2>
                {niche !== 'all' && (
                  <Badge variant="outline">{NICHES[niche].label}</Badge>
                )}
              </div>
              <NicheGrid selected={niche} onSelect={setNiche} />
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Templates</h2>
              <TemplateGrid niche={niche} onPick={openBuilder} />
            </div>
          </>
        )}

        {tab === 'my' && <MyToolsList tools={tools} onDelete={handleDelete} />}
        {tab === 'embed' && <MyToolsList tools={tools} onDelete={handleDelete} focusEmbed />}
      </div>

      <BuilderModal
        open={modalOpen}
        template={activeTemplate}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </AppLayout>
  );
}
