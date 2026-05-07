import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      navigate('/dashboard', { replace: true });
      return;
    }

    try {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (_) {
      // confetti failed silently
    }

    const timer = setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
      <CheckCircle className="w-16 h-16 text-[hsl(var(--success,142_71%_45%))]" />
      <h1 className="text-2xl font-bold text-foreground">You're in!</h1>
      <p className="text-muted-foreground">Let's get your first client.</p>
      <p className="text-xs text-muted-foreground mt-2">Redirecting to dashboard...</p>
    </div>
  );
}
