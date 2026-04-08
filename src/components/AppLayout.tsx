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
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showTrialExpired, setShowTrialExpired] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const now = new Date();
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 7;
  const trialExpired = profile?.plan === 'trial' && trialEndsAt && trialEndsAt < now;

  useEffect(() => {
    if (trialExpired) setShowTrialExpired(true);
  }, [trialExpired]);

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
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
        active
          ? 'bg-sidebar-accent text-primary font-medium'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
      }`}
    >
      <item.icon className="w-4 h-4" />
      <span className="flex-1 text-left">{item.label}</span>
      {item.locked && <Lock className="w-3 h-3 text-muted-foreground" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-sidebar fixed h-full">
        <div className="p-4 border-b border-sidebar-border">
          <span className="font-display text-xl text-foreground">AgencyOS</span>
        </div>

        {profile?.plan === 'trial' && daysLeft <= 3 && !trialExpired && (
          <div className="mx-3 mt-3 p-2 rounded-md bg-warning/10 border border-warning/20">
            <p className="text-xs text-warning font-medium">Your trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</p>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {primaryNav.map((item) => renderNavButton(item, location.pathname === item.path))}

          <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
            <CollapsibleTrigger className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
              <Menu className="w-4 h-4" />
              <span className="flex-1 text-left">More</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${moreOpen ? 'rotate-90' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-3 space-y-1 mt-1">
              {secondaryNav.map((item) => renderNavButton(item, location.pathname === item.path))}
            </CollapsibleContent>
          </Collapsible>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || 'User'}</p>
              <Badge variant="outline" className="text-[10px] px-1.5">{profile?.plan || 'trial'}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0">
        {/* Top bar */}
        <div className="sticky top-0 z-40 border-b border-border bg-sidebar/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="md:hidden flex items-center gap-3">
              <span className="font-display text-lg text-foreground">AgencyOS</span>
            </div>
            <div className="hidden md:block" />

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
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
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm ${
                  location.pathname === item.path ? 'bg-muted text-primary font-medium' : 'text-foreground'
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
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-border z-40 flex justify-around py-2">
          {mobileNavItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${
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

      {/* Upgrade modal */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Pro</DialogTitle>
            <DialogDescription>
              This feature is available on the Pro plan. Upgrade to unlock AI Content, Reviews, Automations, and more.
            </DialogDescription>
          </DialogHeader>
          <Link to="/pricing">
            <Button className="w-full">View Plans</Button>
          </Link>
        </DialogContent>
      </Dialog>

      {/* Trial expired modal */}
      <Dialog open={showTrialExpired} onOpenChange={() => {}}>
        <DialogContent className="[&>button]:hidden">
          <DialogHeader>
            <DialogTitle>Your free trial has ended</DialogTitle>
            <DialogDescription>
              Your 7-day free trial has expired. Choose a plan to continue using AgencyOS.
            </DialogDescription>
          </DialogHeader>
          <Link to="/pricing">
            <Button className="w-full">Choose a Plan</Button>
          </Link>
        </DialogContent>
      </Dialog>
    </div>
  );
}
