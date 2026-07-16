import type { LucideIcon } from 'lucide-react';
import { ALL_NICHE_ICON, NICHES } from './toolTemplates';
import type { NicheId } from './types';

interface Props {
  selected: NicheId | 'all';
  onSelect: (n: NicheId | 'all') => void;
}

export default function NicheGrid({ selected, onSelect }: Props) {
  const all: Array<{ id: NicheId | 'all'; label: string; Icon: LucideIcon }> = [
    { id: 'all', label: 'All Niches', Icon: ALL_NICHE_ICON },
    ...(Object.entries(NICHES) as [NicheId, { label: string; Icon: LucideIcon }][]).map(
      ([id, v]) => ({ id, label: v.label, Icon: v.Icon })
    ),
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {all.map((n) => {
        const active = selected === n.id;
        const Icon = n.Icon;
        return (
          <button
            key={n.id}
            onClick={() => onSelect(n.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              active
                ? 'border-primary bg-primary/10'
                : 'border-white/10 bg-card hover:border-white/20'
            }`}
          >
            <Icon className="h-6 w-6 mb-2 text-primary" aria-hidden="true" />
            <div className="text-sm font-medium">{n.label}</div>
          </button>
        );
      })}
    </div>
  );
}
