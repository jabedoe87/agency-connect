import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Users, UserCheck, CalendarDays, PenTool, Star, Zap, Settings, LogOut, Lock, Menu, X, Sparkles, BarChart3, ChevronDown, FolderOpen, ChevronRight,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import TrialBanner from '@/components/TrialBanner';
import PaymentFailedBanner from '@/components/PaymentFailedBanner';
import UsageBanner from '@/components/UsageBanner';
import UpgradeNudge from '@/components/UpgradeNudge';
import GracePeriodLimitMessage from '@/components/GracePeriodLimitMessage';
import TrialEndedModal from '@/components/TrialEndedModal';
import { trackEvent } from '@/lib/analytics';

const primaryNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', locked: false },
  { label: 'Content Generator', icon: Sparkles, path: '/generator', locked: false },
  { label: 'Projects', icon: FolderOpen, path: '/projects', locked: false },
  { label: 'Clients', icon: UserCheck, path: '/clients', locked: false },
  { label: 'Analytics', icon: BarChart3, path: '/analytics', locked: false },
  { label: 'Settings', icon: Settings, path: '/settings', locked: false },
];

const secondaryNav = [
  { label: 'Leads', icon: Users, path: '/leads', locked: false },
  { label: 'Booking', icon: CalendarDays, path: '/booking', locked: false },
  { label: 'AI Content', icon: PenTool, path: '#', locked: true },
  { label: 'Reviews', icon: Star, path: '#', locked: true },
  { label: 'Automations', icon: Zap, path: '#', locked: true },
];

const mobileNavItems = primaryNav.filter(i => !i.locked).slice(0, 5);

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile, subscription, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const now = new Date();
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 7;

  // PAID PLAN = ALWAYS UNLOCK. Source of truth: live Stripe (subscription.subscribed) OR persisted plan.
  const hasPaidPlan =
    subscription?.subscribed === true ||
    (profile?.plan === 'starter' || profile?.plan === 'pro' || profile?.plan === 'business');
  // Wait for subscription check to complete before deciding trial is expired (avoids modal flash post-checkout).
  const subscriptionChecked = subscription !== null;
  const trialExpired =
    subscriptionChecked &&
    !hasPaidPlan &&
    profile?.plan === 'trial' &&
    trialEndsAt &&
    trialEndsAt < now;

  // Soft nudge: no blocking modal — render dismissible UsageBanner instead.
  // Used/limit are dynamic from real profile data.
  const usedCount = profile?.ai_generations_count ?? 0;
  const limitCount = usedCount; // free tier: at-limit when trial expired
  const showUsageBanner = !!trialExpired;

  const handleNavClick = (item: { path: string; locked: boolean }) => {
    if (item.locked) {
      setShowUpgrade(true);
      return;
    }
    navigate(item.path);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const renderNavButton = (item: typeof primaryNav[0], active: boolean) => (
    <button
      key={item.label}
      onClick={() => handleNavClick(item)}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm tracking-wide transition-all duration-150 ${
        active
          ? 'bg-white/[0.07] text-foreground font-medium border-l-2 border-primary pl-[10px]'
          : 'text-sidebar-foreground/60 hover:text-sidebar-foreground/80 hover:bg-white/[0.04]'
      }`}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left">{item.label}</span>
      {item.locked && <Lock className="w-3 h-3 text-muted-foreground" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <TrialEndedModal />
      {/* Desktop Sidebar — deepest layer */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/10 bg-sidebar fixed h-full">
        <div className="px-6 py-5 border-b border-white/10">
          <span className="font-display text-xl text-foreground tracking-tight">AgencyOS</span>
        </div>

        {/* Trial countdown moved to global TrialBanner above the top bar */}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {primaryNav.map((item) => renderNavButton(item, location.pathname === item.path))}

          <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
            <CollapsibleTrigger className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm tracking-wide text-sidebar-foreground/50 hover:text-sidebar-foreground/75 hover:bg-white/[0.03] transition-all duration-150">
              <Menu className="w-4 h-4" />
              <span className="flex-1 text-left">More</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${moreOpen ? 'rotate-90' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-3 space-y-0.5 mt-0.5">
              {secondaryNav.map((item) => renderNavButton(item, location.pathname === item.path))}
            </CollapsibleContent>
          </Collapsible>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-medium text-primary">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || 'User'}</p>
              <Badge variant="outline" className="text-[10px] px-1.5 opacity-70">{profile?.plan || 'trial'}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground transition-colors duration-150" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0">
        <PaymentFailedBanner />
        <TrialBanner />
        {showUsageBanner && (
          <UsageBanner
            used={usedCount}
            limit={limitCount}
            onUpgrade={() => navigate('/pricing')}
          />
        )}
        <UpgradeNudge />
        <GracePeriodLimitMessage />
        {/* Top bar */}
        <div className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-6 h-14">
            <div className="md:hidden flex items-center gap-3">
              <span className="font-display text-lg text-foreground tracking-tight">AgencyOS</span>
            </div>
            <div className="hidden md:block" />

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors duration-150">
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-medium text-primary">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </div>
                    <span className="hidden sm:inline truncate max-w-[150px]">{user?.email}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/settings')}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/pricing')}>Billing</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile slide menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-14 bg-background/95 backdrop-blur z-30 p-4 space-y-1 overflow-y-auto">
            {[...primaryNav, ...secondaryNav].map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-150 ${
                  location.pathname === item.path ? 'bg-white/[0.07] text-primary font-medium' : 'text-foreground/70'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {item.locked && <Lock className="w-3 h-3 text-muted-foreground ml-auto" />}
              </button>
            ))}
            <Button variant="ghost" className="w-full justify-start mt-4 text-muted-foreground" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        )}

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-white/10 z-40 flex justify-around py-2">
          {mobileNavItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 min-h-[44px] justify-center text-[10px] transition-colors duration-150 ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {children}
      </main>

      {/* Upgrade modal — fully dismissible (X, ESC, backdrop, Maybe later) */}
      <Dialog
        open={showUpgrade}
        onOpenChange={(open) => {
          if (!open) trackEvent('upgrade_dismissed', { source: 'modal' });
          setShowUpgrade(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Pro</DialogTitle>
            <DialogDescription>
              This feature is available on the Pro plan. Upgrade to unlock AI Content, Reviews, Automations, and more.
            </DialogDescription>
          </DialogHeader>
          <Link to="/pricing">
            <Button className="w-full cta-primary">View Plans</Button>
          </Link>
          <button
            onClick={() => {
              trackEvent('upgrade_dismissed', { source: 'modal' });
              setShowUpgrade(false);
            }}
            className="mt-4 text-sm text-muted-foreground hover:underline w-full text-center"
          >
            Maybe later
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
