import { NICHES } from './toolTemplates';
import type { NicheId } from './types';

interface Props {
  selected: NicheId | 'all';
  onSelect: (n: NicheId | 'all') => void;
}

export default function NicheGrid({ selected, onSelect }: Props) {
  const all: Array<{ id: NicheId | 'all'; label: string; icon: string }> = [
    { id: 'all', label: 'All Niches', icon: '✨' },
    ...(Object.entries(NICHES) as [NicheId, { label: string; icon: string }][]).map(
      ([id, v]) => ({ id, label: v.label, icon: v.icon })
    ),
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {all.map((n) => {
        const active = selected === n.id;
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
            <div className="text-2xl mb-1">{n.icon}</div>
            <div className="text-sm font-medium">{n.label}</div>
          </button>
        );
      })}
    </div>
  );
}
