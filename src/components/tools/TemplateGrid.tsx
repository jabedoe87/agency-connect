import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TEMPLATES } from './toolTemplates';
import type { NicheId, ToolTemplate } from './types';

interface Props {
  niche: NicheId | 'all';
  onPick: (t: ToolTemplate) => void;
}

export default function TemplateGrid({ niche, onPick }: Props) {
  const items = niche === 'all' ? TEMPLATES : TEMPLATES.filter((t) => t.niche === niche);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((t) => (
        <div
          key={t.id}
          className="rounded-xl border border-white/10 bg-card p-5 flex flex-col gap-3 hover:border-white/20 transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="text-3xl">{t.icon}</div>
            <div className="flex gap-1 flex-wrap justify-end">
              {t.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="font-semibold">{t.name}</div>
            <div className="text-sm text-muted-foreground">{t.desc}</div>
          </div>
          <Button className="mt-auto" onClick={() => onPick(t)}>
            Build This Tool
          </Button>
        </div>
      ))}
    </div>
  );
}
