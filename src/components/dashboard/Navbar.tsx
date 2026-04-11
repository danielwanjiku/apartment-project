import { Bell } from 'lucide-react';

interface NavbarProps {
  reminderMessage: string | null;
}

const Navbar = ({ reminderMessage }: NavbarProps) => {
  if (!reminderMessage) return null;

  return (
    <div className="bg-destructive text-destructive-foreground text-center text-sm py-2 px-4 font-medium sticky top-0 z-50">
      <Bell className="inline w-4 h-4 mr-2" />
      {reminderMessage}
    </div>
  );
};

export default Navbar;
