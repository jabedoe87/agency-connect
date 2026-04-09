import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Wand2, Palette, Layers } from 'lucide-react';

const ASSIST_ACTIONS = [
  {
    id: 'rewrite',
    label: 'Rewrite',
    icon: RefreshCw,
    instruction: 'Rewrite this content with different wording while keeping the same meaning, structure, and offer. Make it feel fresh, not repetitive.',
  },
  {
    id: 'improve',
    label: 'Improve',
    icon: Wand2,
    instruction: 'Make this content more persuasive, more emotionally compelling, more specific, and more action-driven. Do not make it longer than necessary.',
  },
] as const;

const STYLE_OPTIONS = [
  { id: 'high-converting', label: 'High-Converting' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'aggressive', label: 'Aggressive' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'minimal', label: 'Minimal' },
];

interface AIAssistBlockProps {
  loading: boolean;
  loadingText: string;
  onAction: (instruction: string, newPreset?: string) => void;
  currentPreset: string;
}

export default function AIAssistBlock({ loading, loadingText, onAction, currentPreset }: AIAssistBlockProps) {
  const [showStylePicker, setShowStylePicker] = useState(false);

  return (
    <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">AI Assist</p>
        <p className="text-xs text-muted-foreground mt-0.5">Refine, rewrite, or expand this result in one tap.</p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{loadingText}</span>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        {ASSIST_ACTIONS.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            className="gap-1.5 border-white/10 opacity-80 hover:opacity-100"
            disabled={loading}
            onClick={() => onAction(action.instruction)}
          >
            <action.icon className="w-3.5 h-3.5" />
            {action.label}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-white/10 opacity-80 hover:opacity-100"
          disabled={loading}
          onClick={() => setShowStylePicker(!showStylePicker)}
        >
          <Palette className="w-3.5 h-3.5" />
          Change Style
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-white/10 opacity-80 hover:opacity-100"
          disabled={loading}
          onClick={() =>
            onAction(
              'Generate exactly 3 clearly different variations of this content. Keep the same offer and audience but vary the hook, opening line, and bullet phrasing. Return as JSON array with key "variations".'
            )
          }
        >
          <Layers className="w-3.5 h-3.5" />
          Generate Variations
        </Button>
      </div>

      {showStylePicker && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {STYLE_OPTIONS.filter((s) => s.id !== currentPreset).map((style) => (
            <Button
              key={style.id}
              variant="outline"
              size="sm"
              className="text-xs h-7 border-white/10"
              disabled={loading}
              onClick={() => {
                setShowStylePicker(false);
                onAction(
                  'Rewrite this content in the selected style. Keep the same offer and audience.',
                  style.id
                );
              }}
            >
              {style.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
