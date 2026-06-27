import ToolCard from './ToolCard';
import type { GeneratedTool } from './types';

interface Props {
  tools: GeneratedTool[];
  onDelete: (id: string) => void;
  focusEmbed?: boolean;
}

export default function MyToolsList({ tools, onDelete, focusEmbed }: Props) {
  if (tools.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-card/40 p-10 text-center">
        <div className="text-4xl mb-2">🔨</div>
        <p className="text-muted-foreground">
          No tools yet. Go to <b>Build New Tool</b> to create your first one!
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {tools.map((t) => (
        <ToolCard key={t.id} tool={t} onDelete={onDelete} focusEmbed={focusEmbed} />
      ))}
    </div>
  );
}
