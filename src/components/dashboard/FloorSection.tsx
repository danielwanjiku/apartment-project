import { FloorConfig, getUnitId, getFloorLabel, Tenant, getArrearsMonths } from '@/lib/types';
import TenantCard from './TenantCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface FloorSectionProps {
  floor: FloorConfig;
  tenants: Tenant[];
  showDuesOnly: boolean;
  searchQuery: string;
  onAddTenant: (unitId: string) => void;
  onMarkPaid: (tenantId: string, month: string) => void;
  onDeleteTenant: (tenantId: string) => void;
  onEditTenant: (tenantId: string) => void;
}

const FloorSection = ({ floor, tenants, showDuesOnly, searchQuery, onAddTenant, onMarkPaid, onDeleteTenant, onEditTenant }: FloorSectionProps) => {
  const units: string[] = [];
  for (let i = 0; i < floor.unitCount; i++) {
    units.push(getUnitId(floor.floorIndex, i));
  }

  const query = searchQuery.toLowerCase();
  const filteredUnits = units.filter((uid) => {
    const t = tenants.find((t) => t.unitId === uid);
    if (showDuesOnly && (!t || getArrearsMonths(t).length === 0)) return false;
    if (query && t && !t.name.toLowerCase().includes(query) && !uid.toLowerCase().includes(query)) return false;
    if (query && !t && !uid.toLowerCase().includes(query)) return false;
    return true;
  });

  if (filteredUnits.length === 0 && showDuesOnly) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-heading font-semibold text-lg text-foreground">
        {getFloorLabel(floor.floorIndex)}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredUnits.map((unitId) => {
          const tenant = tenants.find((t) => t.unitId === unitId);
          if (tenant) {
            return (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onMarkPaid={onMarkPaid}
                onDelete={onDeleteTenant}
                onEdit={onEditTenant}
              />
            );
          }
          if (showDuesOnly) return null;
          return (
            <div
              key={unitId}
              className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-2 min-h-[120px]"
            >
              <span className="font-heading font-bold text-muted-foreground">{unitId}</span>
              <span className="text-xs text-muted-foreground">Vacant</span>
              <Button size="sm" variant="outline" className="mt-1 gap-1" onClick={() => onAddTenant(unitId)}>
                <Plus className="w-3.5 h-3.5" /> Add Tenant
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FloorSection;
