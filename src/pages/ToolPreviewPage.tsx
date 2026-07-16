import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getTemplateIcon } from '@/components/tools/toolTemplates';
import type { GeneratedTool } from '@/components/tools/types';

const STORAGE_KEY = 'agencyos_tools_v2';

export default function ToolPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [tool, setTool] = useState<GeneratedTool | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: GeneratedTool[] = raw ? JSON.parse(raw) : [];
      const found = list.find((t) => t.id === id) || null;
      setTool(found);
      setMissing(!found);
    } catch {
      setMissing(true);
    }
  }, [id]);

  const download = () => {
    if (!tool) return;
    const blob = new Blob([tool.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tool.templateId}-${tool.bizName.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded ✓');
  };

  if (missing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Tool not found.</p>
        <Button asChild><Link to="/tools">Back to Tool Builder</Link></Button>
      </div>
    );
  }
  if (!tool) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <Button asChild variant="outline" size="sm">
          <Link to="/tools">← Back</Link>
        </Button>
        <div className="text-sm text-muted-foreground truncate px-3 flex items-center gap-2">
          {(() => {
            const Icon = getTemplateIcon(tool.templateId);
            return <Icon className="h-4 w-4 text-primary" aria-hidden="true" />;
          })()}
          <span className="truncate">{tool.templateName} · {tool.bizName}</span>
        </div>
        <Button size="sm" onClick={download}><Download className="h-4 w-4 mr-1" aria-hidden="true" />Download</Button>
      </div>
      <iframe
        title={tool.templateName}
        srcDoc={tool.html}
        sandbox="allow-scripts allow-forms"
        className="flex-1 w-full bg-white"
      />
    </div>
  );
}
