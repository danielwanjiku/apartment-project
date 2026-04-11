import { useState } from 'react';
import { Building2, TrendingUp, AlertTriangle, Settings, LogOut, Sun, Moon, Bell, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  apartmentName,
  duesCount,
  showDuesOnly,
  onToggleDues,
  onOpenSettings,
  onOpenRevenue,
  onOpenDues,
}: DashboardSidebarProps) => {
  const { signOut, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    {
      label: showDuesOnly ? 'Show All' : 'Filter Dues',
      icon: showDuesOnly ? LayoutDashboard : Bell,
      onClick: onToggleDues,
      badge: !showDuesOnly && duesCount > 0 ? duesCount : null,
    },
    {
      label: 'Dues Report',
      icon: AlertTriangle,
      onClick: onOpenDues,
    },
    {
      label: 'Revenue',
      icon: TrendingUp,
      onClick: onOpenRevenue,
    },
    {
      label: 'Settings',
      icon: Settings,
      onClick: onOpenSettings,
    },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-navbar text-navbar-foreground min-h-screen transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(p => !p)}
        className="absolute -right-3 top-6 z-10 bg-navbar text-navbar-foreground border border-navbar-foreground/20 rounded-full w-6 h-6 flex items-center justify-center shadow hover:opacity-80 transition"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Logo / Name */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-navbar-foreground/10 ${collapsed ? 'justify-center px-0' : ''}`}>
        <Building2 className="w-7 h-7 shrink-0 text-primary-foreground" />
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-heading font-bold text-sm leading-tight truncate">{apartmentName || 'Dashboard'}</p>
            <p className="text-xs opacity-60">Management</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-navbar-foreground/10 transition-colors relative ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
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
        {/* Dark mode toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-navbar-foreground/10 transition-colors ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* Logout */}
        <button
          onClick={signOut}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-navbar-foreground/10 transition-colors opacity-80 hover:opacity-100 ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
