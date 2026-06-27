import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { NICHES } from './toolTemplates';
import type { GeneratedTool } from './types';

interface Props {
  tool: GeneratedTool;
  onDelete: (id: string) => void;
  focusEmbed?: boolean;
}

export default function ToolCard({ tool, onDelete, focusEmbed = false }: Props) {
  const [showEmbed, setShowEmbed] = useState(focusEmbed);
  const previewUrl = `${window.location.origin}/tools/${tool.id}`;
  const embedCode = `<iframe src="${previewUrl}" width="100%" height="500" frameborder="0"></iframe>`;

  const download = () => {
    const blob = new Blob([tool.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tool.templateId}-${tool.bizName.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded ✓');
  };

  const copyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      toast.success('Embed code copied ✓');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-card p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-2xl">{tool.templateIcon}</div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{tool.templateName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {tool.bizName} · {new Date(tool.createdAt).toLocaleDateString()}
            </div>
          </div>
          <Badge variant="outline">{NICHES[tool.niche].label}</Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild size="sm" variant="outline">
            <Link to={`/tools/${tool.id}`}>👁 Preview</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={download}>⬇ Download</Button>
          <Button size="sm" variant="outline" onClick={() => setShowEmbed((s) => !s)}>
            🔗 Embed
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(tool.id)}>🗑</Button>
        </div>
      </div>
      {showEmbed && (
        <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-white/5 text-xs font-mono break-all">
          {embedCode}
          <div className="mt-2">
            <Button size="sm" onClick={copyEmbed}>Copy embed code</Button>
          </div>
        </div>
      )}
    </div>
  );
}
