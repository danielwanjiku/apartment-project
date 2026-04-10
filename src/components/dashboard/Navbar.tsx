import { Building2, Bell, Settings, LayoutDashboard, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface NavbarProps {
  apartmentName: string;
  duesCount: number;
  showDuesOnly: boolean;
  onToggleDues: () => void;
  onOpenSettings: () => void;
  reminderMessage: string | null;
}

const Navbar = ({ apartmentName, duesCount, showDuesOnly, onToggleDues, onOpenSettings, reminderMessage }: NavbarProps) => {
  const { signOut, user } = useAuth();

  return (
    <nav className="bg-navbar text-navbar-foreground shadow-lg sticky top-0 z-50">
      {reminderMessage && (
        <div className="bg-destructive text-destructive-foreground text-center text-sm py-2 px-4 font-medium">
          <Bell className="inline w-4 h-4 mr-2" />
          {reminderMessage}
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Building2 className="w-7 h-7 text-primary-foreground" />
            <div>
              <h1 className="font-heading text-lg font-bold leading-tight">
                {apartmentName || 'Property Dashboard'}
              </h1>
              <p className="text-xs opacity-70">Management Console</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleDues}
              className="relative text-navbar-foreground hover:bg-navbar-foreground/10"
            >
              {showDuesOnly ? (
                <LayoutDashboard className="w-5 h-5" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
              {duesCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] h-5 min-w-5 flex items-center justify-center p-0 rounded-full">
                  {duesCount}
                </Badge>
              )}
              <span className="ml-1 text-sm hidden sm:inline">
                {showDuesOnly ? 'Show All' : 'Dues'}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSettings}
              className="text-navbar-foreground hover:bg-navbar-foreground/10"
            >
              <Settings className="w-5 h-5" />
              <span className="ml-1 text-sm hidden sm:inline">Settings</span>
            </Button>

            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-navbar-foreground hover:bg-navbar-foreground/10"
              >
                <LogOut className="w-5 h-5" />
                <span className="ml-1 text-sm hidden sm:inline">Logout</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
