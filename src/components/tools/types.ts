import type { LucideIcon } from 'lucide-react';

export type NicheId = 'realestate' | 'salon' | 'gym' | 'coach' | 'contractor';

export interface ToolTemplate {
  id: string;
  niche: NicheId;
  Icon: LucideIcon;
  name: string;
  desc: string;
  tags: string[];
}

export interface GeneratedTool {
  id: string;
  templateId: string;
  templateName: string;
  niche: NicheId;
  bizName: string;
  color: string;
  ctaLink: string;
  html: string;
  createdAt: string;
}

export interface BuilderFormValues {
  bizName: string;
  niche: NicheId;
  templateId: string;
  color: string;
  ctaLink: string;
  extraInstructions: string;
}
