// Local-first lead storage. Persists last 10 entered recipients per browser.
// Cloud sync (per the leads table) is wired separately.

export type ContactKind = 'email' | 'instagram' | 'unknown';

export interface RecentLead {
  id: string;
  name: string;
  contact: string; // email or @handle
  kind: ContactKind;
  profile_note?: string;
  created_at: number;
}

const KEY = 'agencyos_recent_leads_v1';
const ACTIVE_KEY = 'agencyos_active_lead_v1';
const MAX = 10;

export function readActiveLead<T = unknown>(): T | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeActiveLead(value: unknown | null): void {
  try {
    if (value == null) {
      localStorage.removeItem(ACTIVE_KEY);
    } else {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(value));
    }
  } catch {
    /* ignore */
  }
}

export function detectContactKind(raw: string): ContactKind {
  const v = raw.trim();
  if (!v) return 'unknown';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'email';
  // looks like handle
  if (/^@?[\w.]{1,30}$/.test(v)) return 'instagram';
  return 'unknown';
}

export function normalizeContact(raw: string): { value: string; kind: ContactKind } {
  const v = raw.trim();
  const kind = detectContactKind(v);
  if (kind === 'instagram') {
    return { value: v.startsWith('@') ? v : `@${v}`, kind };
  }
  return { value: v, kind };
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function readRecentLeads(): RecentLead[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as RecentLead[];
  } catch {
    return [];
  }
}

export function saveRecentLead(input: Omit<RecentLead, 'id' | 'created_at'>): RecentLead {
  const lead: RecentLead = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: Date.now(),
  };
  const existing = readRecentLeads().filter(
    (l) => !(l.contact.toLowerCase() === lead.contact.toLowerCase()),
  );
  const next = [lead, ...existing].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return lead;
}
