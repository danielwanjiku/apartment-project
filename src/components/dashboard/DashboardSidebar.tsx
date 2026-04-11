import { useState } from 'react';
import { Building2, TrendingUp, AlertTriangle, Settings, LogOut, Sun, Moon, Bell, LayoutDashboard, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';

interface DashboardSidebarProps {
  apartmentName: string;
  duesCount: number;
  showDuesOnly: boolean;
  onToggleDues: () => void;
  onOpenSettings: () => void;
  onOpenRevenue: () => void;
  onOpenDues: () => void;
}

const DashboardSidebar = ({
  apartmentName, duesCount, showDuesOnly,
  onToggleDues, onOpenSettings, onOpenRevenue, onOpenDues,
}: DashboardSidebarProps) => {
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: showDuesOnly ? 'Show All' : 'Filter Dues', icon: showDuesOnly ? LayoutDashboard : Bell, onClick: () => { onToggleDues(); setMobileOpen(false); }, badge: !showDuesOnly && duesCount > 0 ? duesCount : null },
    { label: 'Dues Report', icon: AlertTriangle, onClick: () => { onOpenDues(); setMobileOpen(false); } },
    { label: 'Revenue', icon: TrendingUp, onClick: () => { onOpenRevenue(); setMobileOpen(false); } },
    { label: 'Settings', icon: Settings, onClick: () => { onOpenSettings(); setMobileOpen(false); } },
  ];

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-navbar-foreground/10 ${!mobile && collapsed ? 'justify-center px-0' : ''}`}>
        <Building2 className="w-7 h-7 shrink-0" />
        {(mobile || !collapsed) && (
          <div className="overflow-hidden">
            <p className="font-heading font-bold text-sm leading-tight truncate">{apartmentName || 'Dashboard'}</p>
            <p className="text-xs opacity-60">Management</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(item => (
          <button key={item.label} onClick={item.onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-navbar-foreground/10 transition-colors relative ${!mobile && collapsed ? 'justify-center px-0' : ''}`}>
            <item.icon className="w-5 h-5 shrink-0" />
            {(mobile || !collapsed) && <span>{item.label}</span>}
            {item.badge && (
              <Badge className="ml-auto bg-destructive text-destructive-foreground text-[10px] h-5 min-w-5 flex items-center justify-center p-0 rounded-full">
                {item.badge}
              </Badge>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="py-4 px-2 border-t border-navbar-foreground/10 space-y-1">
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-navbar-foreground/10 transition-colors ${!mobile && collapsed ? 'justify-center px-0' : ''}`}>
          {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
          {(mobile || !collapsed) && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button onClick={signOut}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-navbar-foreground/10 transition-colors opacity-80 hover:opacity-100 ${!mobile && collapsed ? 'justify-center px-0' : ''}`}>
          <LogOut className="w-5 h-5 shrink-0" />
          {(mobile || !collapsed) && <span>Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-navbar text-navbar-foreground p-2 rounded-lg shadow-lg"
      >
        <Menu className="w-5 h-5" />
        {duesCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
            {duesCount}
          </span>
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative flex flex-col bg-navbar text-navbar-foreground w-64 min-h-screen z-10">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-navbar-foreground/60 hover:text-navbar-foreground">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent mobile />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col bg-navbar text-navbar-foreground min-h-screen relative transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
        <button onClick={() => setCollapsed(p => !p)}
          className="absolute -right-3 top-6 z-10 bg-navbar text-navbar-foreground border border-navbar-foreground/20 rounded-full w-6 h-6 flex items-center justify-center shadow hover:opacity-80 transition">
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
        <SidebarContent />
      </aside>
    </>
  );
};

export default DashboardSidebar;
