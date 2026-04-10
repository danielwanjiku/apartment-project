import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, Plus, Minus } from 'lucide-react';
import { FloorConfig, getFloorLabel } from '@/lib/types';

interface SetupWizardProps {
  initialName?: string;
  initialFloors?: FloorConfig[];
  onComplete: (name: string, floors: FloorConfig[]) => void;
}

const SetupWizard = ({ initialName = '', initialFloors, onComplete }: SetupWizardProps) => {
  const [name, setName] = useState(initialName);
  const [floorCount, setFloorCount] = useState(initialFloors ? initialFloors.length : 2);
  const [floors, setFloors] = useState<FloorConfig[]>(
    initialFloors || [
      { floorIndex: 0, unitCount: 2 },
      { floorIndex: 1, unitCount: 2 },
    ]
  );

  const handleFloorCountChange = (count: number) => {
    if (count < 1) return;
    setFloorCount(count);
    const newFloors: FloorConfig[] = [];
    for (let i = 0; i < count; i++) {
      newFloors.push(floors[i] || { floorIndex: i, unitCount: 2 });
    }
    // Fix indices
    newFloors.forEach((f, i) => (f.floorIndex = i));
    setFloors(newFloors);
  };

  const setUnitCount = (index: number, count: number) => {
    if (count < 1) return;
    const updated = [...floors];
    updated[index] = { ...updated[index], unitCount: count };
    setFloors(updated);
  };

  const canSubmit = name.trim() && floors.length > 0 && floors.every(f => f.unitCount > 0);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="font-heading text-2xl">Set Up Your Property</CardTitle>
          <CardDescription>Configure your apartment building details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="apt-name">Apartment Name</Label>
            <Input
              id="apt-name"
              placeholder="e.g. Sunrise Residency"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Number of Floors (including Ground)</Label>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => handleFloorCountChange(floorCount - 1)}>
                <Minus className="w-4 h-4" />
              </Button>
              <span className="font-heading text-xl font-bold w-10 text-center">{floorCount}</span>
              <Button variant="outline" size="icon" onClick={() => handleFloorCountChange(floorCount + 1)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Units Per Floor</Label>
            {floors.map((floor, idx) => (
              <div key={idx} className="flex items-center justify-between bg-muted rounded-lg px-4 py-3">
                <span className="text-sm font-medium">{getFloorLabel(floor.floorIndex)}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setUnitCount(idx, floor.unitCount - 1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="font-heading font-bold w-8 text-center">{floor.unitCount}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setUnitCount(idx, floor.unitCount + 1)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!canSubmit}
            onClick={() => onComplete(name.trim(), floors)}
          >
            Save & Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupWizard;
