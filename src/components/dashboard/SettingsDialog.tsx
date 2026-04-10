import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FloorConfig } from '@/lib/types';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  apartmentName: string;
  floors: FloorConfig[];
  onSave: (name: string) => void;
}

const SettingsDialog = ({ open, onClose, apartmentName, onSave }: SettingsDialogProps) => {
  const [name, setName] = useState(apartmentName);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Apartment Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(name.trim()); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
