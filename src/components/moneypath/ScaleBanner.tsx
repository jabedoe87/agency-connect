import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ScaleBannerProps {
  platform: string;
  hookType: string;
  outcome: 'leads' | 'client';
  onConfirm: () => void;
}

export default function ScaleBanner({ platform, hookType, outcome, onConfirm }: ScaleBannerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-success/40 bg-gradient-to-r from-success/10 via-success/5 to-transparent p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
          <Rocket className="w-5 h-5 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="label-uppercase text-success text-[10px] font-semibold mb-1">▸ This worked — do more of this</p>
          <p className="text-sm text-foreground">
            Your <span className="font-semibold">{platform || 'recent'}</span> ad with <span className="font-semibold">Hook {hookType}</span> got <span className="font-semibold">{outcome === 'client' ? 'a client' : 'leads'}</span>.
          </p>
          <p className="text-[11px] text-muted-foreground italic mt-1">Scale this before momentum drops.</p>
        </div>
        <Button size="sm" className="cta-primary gap-1.5 shrink-0" onClick={() => setOpen(true)}>
          <Rocket className="w-3.5 h-3.5" /> Create 3 variations of this winner
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Use this winning setup for variations?</AlertDialogTitle>
            <AlertDialogDescription>
              We'll lock your niche, platform, and Hook {hookType} structure, then generate 3 fresh variations that vary the opening and CTA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              Yes, generate variations
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
