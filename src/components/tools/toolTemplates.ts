import type { NicheId, ToolTemplate } from './types';

export const NICHES: Record<NicheId, { label: string; icon: string }> = {
  realestate: { label: 'Real Estate', icon: '🏠' },
  salon:      { label: 'Salon & Beauty', icon: '💅' },
  gym:        { label: 'Gym & Fitness', icon: '💪' },
  coach:      { label: 'Coaching', icon: '🎯' },
  contractor: { label: 'Contractor', icon: '🔧' },
};

export const TEMPLATES: ToolTemplate[] = [
  // Real Estate
  { id: 'mortgage',   niche: 'realestate', icon: '🏦', name: 'Mortgage Calculator',  desc: 'Estimate monthly mortgage payments', tags: ['Calculator', 'Lead Magnet'] },
  { id: 'homevalue',  niche: 'realestate', icon: '🏡', name: 'Home Value Estimator', desc: 'Quick property value estimate',      tags: ['Quiz', 'Lead Magnet'] },
  { id: 'rentvsown',  niche: 'realestate', icon: '⚖️', name: 'Rent vs Own',           desc: 'Compare renting and buying',          tags: ['Calculator', 'Tool'] },
  { id: 'openhouse',  niche: 'realestate', icon: '📋', name: 'Open House Checklist', desc: 'Print-ready buyer checklist',         tags: ['Tool', 'Printable'] },

  // Salon
  { id: 'haircolor',  niche: 'salon', icon: '🎨', name: 'Hair Color Quiz',        desc: 'Find your perfect hair color',   tags: ['Quiz', 'Lead Magnet'] },
  { id: 'appointment',niche: 'salon', icon: '📅', name: 'Appointment Estimator',  desc: 'Estimate booking duration & cost', tags: ['Calculator', 'Tool'] },
  { id: 'skintype',   niche: 'salon', icon: '🧴', name: 'Skin Type Quiz',         desc: 'Personalized skincare routine',  tags: ['Quiz', 'Lead Magnet'] },
  { id: 'lookbook',   niche: 'salon', icon: '📖', name: 'Style Lookbook',         desc: 'Browse style inspirations',      tags: ['Tool', 'Showcase'] },

  // Gym
  { id: 'bmi',        niche: 'gym', icon: '📏', name: 'BMI Calculator',         desc: 'Body Mass Index + ideal weight', tags: ['Calculator', 'Lead Magnet'] },
  { id: 'workout',    niche: 'gym', icon: '🏋️', name: 'Workout Plan Generator', desc: 'Personalized weekly plan',       tags: ['Tool', 'Lead Magnet'] },
  { id: 'calories',   niche: 'gym', icon: '🥗', name: 'Calorie & Macro Calc',   desc: 'Daily calorie + macro targets',  tags: ['Calculator', 'Lead Magnet'] },
  { id: 'progress',   niche: 'gym', icon: '📈', name: 'Progress Tracker',       desc: 'Track strength over time',       tags: ['Tool', 'Printable'] },

  // Coach
  { id: 'goalsetter', niche: 'coach', icon: '🎯', name: 'SMART Goal Worksheet', desc: 'Build an action plan',           tags: ['Tool', 'Printable'] },
  { id: 'assessment', niche: 'coach', icon: '🧭', name: 'Life Balance Wheel',   desc: '8-area life assessment',         tags: ['Quiz', 'Lead Magnet'] },
  { id: 'habits',     niche: 'coach', icon: '✅', name: 'Habit Tracker',        desc: '30-day habit calendar',          tags: ['Tool', 'Printable'] },
  { id: 'values',     niche: 'coach', icon: '💎', name: 'Values Finder',        desc: 'Discover your core values',      tags: ['Quiz', 'Lead Magnet'] },

  // Contractor
  { id: 'estimate',   niche: 'contractor', icon: '💰', name: 'Project Cost Estimator', desc: 'Quick budget estimate',     tags: ['Calculator', 'Lead Magnet'] },
  { id: 'timeline',   niche: 'contractor', icon: '🗓️', name: 'Project Timeline',       desc: 'Estimated duration',         tags: ['Tool', 'Calculator'] },
  { id: 'materials',  niche: 'contractor', icon: '🧱', name: 'Materials Calculator',   desc: 'Tiles, paint, flooring qty', tags: ['Calculator', 'Lead Magnet'] },
  { id: 'inspection', niche: 'contractor', icon: '🔍', name: 'Inspection Checklist',   desc: 'Pre-purchase inspection',    tags: ['Tool', 'Printable'] },
];
