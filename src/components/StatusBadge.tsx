import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  // Positive
  Won: 'bg-success/15 text-success border-success/20',
  Active: 'bg-success/15 text-success border-success/20',
  Enrolled: 'bg-success/15 text-success border-success/20',
  Member: 'bg-success/15 text-success border-success/20',
  Regular: 'bg-success/15 text-success border-success/20',
  'Project Won': 'bg-success/15 text-success border-success/20',
  Returning: 'bg-success/15 text-success border-success/20',

  // Warning
  Contacted: 'bg-warning/15 text-warning border-warning/20',
  'Follow-up': 'bg-warning/15 text-warning border-warning/20',
  'Visit Planned': 'bg-warning/15 text-warning border-warning/20',
  'Quote Sent': 'bg-warning/15 text-warning border-warning/20',
  'Program Sent': 'bg-warning/15 text-warning border-warning/20',
  'Discovery Call': 'bg-warning/15 text-warning border-warning/20',
  'Site Visit': 'bg-warning/15 text-warning border-warning/20',
  'Offer Made': 'bg-warning/15 text-warning border-warning/20',
  'Trial Session': 'bg-warning/15 text-warning border-warning/20',
  Appointment: 'bg-warning/15 text-warning border-warning/20',
  Reservation: 'bg-warning/15 text-warning border-warning/20',
  Visited: 'bg-warning/15 text-warning border-warning/20',

  // Negative
  Lost: 'bg-destructive/15 text-destructive border-destructive/20',
  Churned: 'bg-destructive/15 text-destructive border-destructive/20',

  // Neutral / New
  New: 'bg-info/15 text-info border-info/20',
  'New Lead': 'bg-info/15 text-info border-info/20',
  Inactive: 'bg-muted text-muted-foreground border-border',
};

export function StatusBadge({ status }: { status: string }) {
  const colors = statusColors[status] || 'bg-muted text-muted-foreground border-border';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', colors)}>
      {status}
    </span>
  );
}
