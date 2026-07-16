import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { NICHES, TEMPLATES } from './toolTemplates';
import { generateToolHTML } from './toolGenerators';
import type { BuilderFormValues, GeneratedTool, NicheId, ToolTemplate } from './types';

const STORAGE_KEY = 'agencyos_tools_v2';

interface Props {
  open: boolean;
  template: ToolTemplate | null;
  onClose: () => void;
  onSaved: (t: GeneratedTool) => void;
}

type Stage = 'form' | 'generating' | 'preview';

export default function BuilderModal({ open, template, onClose, onSaved }: Props) {
  const [stage, setStage] = useState<Stage>('form');
  const [form, setForm] = useState<BuilderFormValues>({
    bizName: '',
    niche: 'realestate',
    templateId: '',
    color: '#6366f1',
    ctaLink: '',
    extraInstructions: '',
  });
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    if (open && template) {
      setStage('form');
      setHtml('');
      setForm((f) => ({
        ...f,
        niche: template.niche,
        templateId: template.id,
      }));
    }
  }, [open, template]);

  const nicheTemplates = useMemo(
    () => TEMPLATES.filter((t) => t.niche === form.niche),
    [form.niche]
  );

  const update = <K extends keyof BuilderFormValues>(k: K, v: BuilderFormValues[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const generate = () => {
    if (!form.bizName.trim()) {
      toast.error('Please enter a business name');
      return;
    }
    setStage('generating');
    window.setTimeout(() => {
      const out = generateToolHTML(form.templateId, {
        bizName: form.bizName,
        color: form.color,
        ctaLink: form.ctaLink,
      });
      setHtml(out);
      setStage('preview');
    }, 800);
  };

  const save = () => {
    const tpl = TEMPLATES.find((t) => t.id === form.templateId);
    if (!tpl) return;
    const tool: GeneratedTool = {
      id: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      templateId: tpl.id,
      templateName: tpl.name,
      niche: tpl.niche,
      bizName: form.bizName,
      color: form.color,
      ctaLink: form.ctaLink,
      html,
      createdAt: new Date().toISOString(),
    };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: GeneratedTool[] = raw ? JSON.parse(raw) : [];
      list.unshift(tool);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      toast.error('Could not save to local storage');
      return;
    }
    toast.success('Tool saved');
    onSaved(tool);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {template && (
              <span className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                <template.Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
            )}
            Build: {template?.name}
          </DialogTitle>
          <DialogDescription>
            Configure your tool — it generates a self-contained HTML widget you can embed anywhere.
          </DialogDescription>
        </DialogHeader>

        {stage === 'form' && (
          <div className="space-y-4">
            <div>
              <Label>Business Name</Label>
              <Input
                placeholder="Acme Co."
                value={form.bizName}
                onChange={(e) => update('bizName', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Niche</Label>
                <Select value={form.niche} onValueChange={(v) => update('niche', v as NicheId)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(NICHES) as [NicheId, { label: string }][]).map(
                      ([id, v]) => (
                        <SelectItem key={id} value={id}>{v.label}</SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tool Type</Label>
                <Select value={form.templateId} onValueChange={(v) => update('templateId', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {nicheTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Brand Color</Label>
                <Input
                  type="color"
                  value={form.color}
                  onChange={(e) => update('color', e.target.value)}
                  className="h-10 p-1"
                />
              </div>
              <div>
                <Label>CTA Link (optional)</Label>
                <Input
                  type="url"
                  placeholder="https://yoursite.com/book"
                  value={form.ctaLink}
                  onChange={(e) => update('ctaLink', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Extra Instructions (optional)</Label>
              <Textarea
                rows={2}
                placeholder="Any notes for future customization…"
                value={form.extraInstructions}
                onChange={(e) => update('extraInstructions', e.target.value)}
              />
            </div>
          </div>
        )}

        {stage === 'generating' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Generating your tool…</p>
          </div>
        )}

        {stage === 'preview' && (
          <div className="border border-white/10 rounded-lg overflow-hidden bg-white">
            <iframe
              title="Tool preview"
              srcDoc={html}
              sandbox="allow-scripts allow-forms"
              className="w-full h-[480px] bg-white"
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {stage === 'form' && (
            <Button onClick={generate} disabled={!form.templateId}>Generate Tool</Button>
          )}
          {stage === 'generating' && (
            <Button disabled>Generating…</Button>
          )}
          {stage === 'preview' && (
            <>
              <Button variant="outline" onClick={generate}>Regenerate</Button>
              <Button onClick={save}>Save Tool</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
