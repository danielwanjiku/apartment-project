import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FloorConfig, getFloorLabel } from '@/lib/types';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  apartmentName: string;
  floors: FloorConfig[];
  onSave: (name: string, floors: FloorConfig[]) => void;
}

const SettingsDialog = ({ open, onClose, apartmentName, floors, onSave }: SettingsDialogProps) => {
  const [name, setName] = useState(apartmentName);
  const [localFloors, setLocalFloors] = useState<FloorConfig[]>(floors);

  // Sync when dialog opens
  useEffect(() => {
    if (open) {
      setName(apartmentName);
      setLocalFloors(floors);
    }
  }, [open, apartmentName, floors]);

  const handleAddFloor = () => {
    const nextIndex = localFloors.length === 0
      ? 0
      : Math.max(...localFloors.map(f => f.floorIndex)) + 1;
    setLocalFloors(prev => [...prev, { floorIndex: nextIndex, unitCount: 1 }]);
  };

  const handleRemoveFloor = (floorIndex: number) => {
    setLocalFloors(prev => prev.filter(f => f.floorIndex !== floorIndex));
  };

  const handleUnitCountChange = (floorIndex: number, value: string) => {
    const count = Math.max(1, Math.min(50, Number(value) || 1));
    setLocalFloors(prev =>
      prev.map(f => f.floorIndex === floorIndex ? { ...f, unitCount: count } : f)
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Apartment name is required.');
      return;
    }
    if (localFloors.length === 0) {
      toast.error('Add at least one floor.');
      return;
    }
    onSave(name.trim(), localFloors);
    onClose();
    toast.success('Settings saved.');
  };

  const totalUnits = localFloors.reduce((s, f) => s + f.unitCount, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Apartment name */}
          <div className="space-y-1.5">
            <Label>Apartment Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunrise Apartments" />
          </div>

          {/* Floors & Units */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Floors & Units</Label>
              <span className="text-xs text-muted-foreground">{totalUnits} unit{totalUnits !== 1 ? 's' : ''} total</span>
            </div>

            {localFloors.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                No floors yet. Add one below.
              </p>
            )}

            <div className="space-y-2">
              {localFloors
                .sort((a, b) => a.floorIndex - b.floorIndex)
                .map((floor) => (
                  <div
                    key={floor.floorIndex}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{getFloorLabel(floor.floorIndex)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Units</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={floor.unitCount}
                        onChange={(e) => handleUnitCountChange(floor.floorIndex, e.target.value)}
                        className="w-16 h-8 text-center text-sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveFloor(floor.floorIndex)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleAddFloor}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Floor
            </Button>

            <p className="text-xs text-muted-foreground">
              Note: Removing a floor does not delete existing tenants in those units.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
