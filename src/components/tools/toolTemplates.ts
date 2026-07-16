import {
  Home, Landmark, Scale, ClipboardList,
  Palette, CalendarDays, Droplets, BookOpen,
  Ruler, Dumbbell, Salad, TrendingUp,
  Target, Compass, CheckCircle2, Gem,
  Wallet, CalendarRange, Blocks, Search,
  Sparkles, type LucideIcon,
} from 'lucide-react';
import type { NicheId, ToolTemplate } from './types';

export const NICHES: Record<NicheId, { label: string; Icon: LucideIcon }> = {
  realestate: { label: 'Real Estate',     Icon: Home },
  salon:      { label: 'Salon & Beauty',  Icon: Palette },
  gym:        { label: 'Gym & Fitness',   Icon: Dumbbell },
  coach:      { label: 'Coaching',        Icon: Target },
  contractor: { label: 'Contractor',      Icon: Wallet },
};

export const ALL_NICHE_ICON: LucideIcon = Sparkles;

export const TEMPLATES: ToolTemplate[] = [
  // Real Estate
  { id: 'mortgage',   niche: 'realestate', Icon: Landmark,       name: 'Mortgage Calculator',  desc: 'Estimate monthly mortgage payments', tags: ['Calculator', 'Lead Magnet'] },
  { id: 'homevalue',  niche: 'realestate', Icon: Home,           name: 'Home Value Estimator', desc: 'Quick property value estimate',      tags: ['Quiz', 'Lead Magnet'] },
  { id: 'rentvsown',  niche: 'realestate', Icon: Scale,          name: 'Rent vs Own',           desc: 'Compare renting and buying',        tags: ['Calculator', 'Tool'] },
  { id: 'openhouse',  niche: 'realestate', Icon: ClipboardList,  name: 'Open House Checklist', desc: 'Print-ready buyer checklist',        tags: ['Tool', 'Printable'] },

  // Salon
  { id: 'haircolor',  niche: 'salon', Icon: Palette,       name: 'Hair Color Quiz',        desc: 'Find your perfect hair color',      tags: ['Quiz', 'Lead Magnet'] },
  { id: 'appointment',niche: 'salon', Icon: CalendarDays,  name: 'Appointment Estimator',  desc: 'Estimate booking duration & cost',  tags: ['Calculator', 'Tool'] },
  { id: 'skintype',   niche: 'salon', Icon: Droplets,      name: 'Skin Type Quiz',         desc: 'Personalized skincare routine',     tags: ['Quiz', 'Lead Magnet'] },
  { id: 'lookbook',   niche: 'salon', Icon: BookOpen,      name: 'Style Lookbook',         desc: 'Browse style inspirations',         tags: ['Tool', 'Showcase'] },

  // Gym
  { id: 'bmi',        niche: 'gym', Icon: Ruler,       name: 'BMI Calculator',         desc: 'Body Mass Index + ideal weight',    tags: ['Calculator', 'Lead Magnet'] },
  { id: 'workout',    niche: 'gym', Icon: Dumbbell,    name: 'Workout Plan Generator', desc: 'Personalized weekly plan',          tags: ['Tool', 'Lead Magnet'] },
  { id: 'calories',   niche: 'gym', Icon: Salad,       name: 'Calorie & Macro Calc',   desc: 'Daily calorie + macro targets',     tags: ['Calculator', 'Lead Magnet'] },
  { id: 'progress',   niche: 'gym', Icon: TrendingUp,  name: 'Progress Tracker',       desc: 'Track strength over time',          tags: ['Tool', 'Printable'] },

  // Coach
  { id: 'goalsetter', niche: 'coach', Icon: Target,        name: 'SMART Goal Worksheet', desc: 'Build an action plan',            tags: ['Tool', 'Printable'] },
  { id: 'assessment', niche: 'coach', Icon: Compass,       name: 'Life Balance Wheel',   desc: '8-area life assessment',          tags: ['Quiz', 'Lead Magnet'] },
  { id: 'habits',     niche: 'coach', Icon: CheckCircle2,  name: 'Habit Tracker',        desc: '30-day habit calendar',           tags: ['Tool', 'Printable'] },
  { id: 'values',     niche: 'coach', Icon: Gem,           name: 'Values Finder',        desc: 'Discover your core values',       tags: ['Quiz', 'Lead Magnet'] },

  // Contractor
  { id: 'estimate',   niche: 'contractor', Icon: Wallet,         name: 'Project Cost Estimator', desc: 'Quick budget estimate',   tags: ['Calculator', 'Lead Magnet'] },
  { id: 'timeline',   niche: 'contractor', Icon: CalendarRange,  name: 'Project Timeline',       desc: 'Estimated duration',      tags: ['Tool', 'Calculator'] },
  { id: 'materials',  niche: 'contractor', Icon: Blocks,         name: 'Materials Calculator',   desc: 'Tiles, paint, flooring qty', tags: ['Calculator', 'Lead Magnet'] },
  { id: 'inspection', niche: 'contractor', Icon: Search,         name: 'Inspection Checklist',   desc: 'Pre-purchase inspection', tags: ['Tool', 'Printable'] },
];

export function getTemplateIcon(templateId: string): LucideIcon {
  return TEMPLATES.find((t) => t.id === templateId)?.Icon ?? Sparkles;
}
