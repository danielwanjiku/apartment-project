import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Home, ArrowLeft, ArrowRight, Phone, Loader2 } from 'lucide-react';
import { isValidKenyanPhone, normaliseKenyanPhone, phoneErrorMessage } from '@/lib/phone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FloorConfig, getUnitId, getFloorLabel } from '@/lib/types';

type Step = 'search' | 'select-unit' | 'confirm';

interface ApartmentResult {
  id: string;
  name: string;
  floors: FloorConfig[];
}

const TenantSetup = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [apartments, setApartments] = useState<ApartmentResult[]>([]);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentResult | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [takenUnits, setTakenUnits] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (val && !isValidKenyanPhone(val)) setPhoneError(phoneErrorMessage);
    else setPhoneError('');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { navigate('/tenant/login'); return; }
      setUserId(session.user.id);
      supabase.from('profiles')
        .select('unit_id, apartment_id')
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.unit_id && data?.apartment_id) navigate('/tenant');
        });
    });
  }, [navigate]);

  // Live search — fires 300ms after the user stops typing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setApartments([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('apartments')
          .select('id, name, floors')
          .ilike('name', `${searchQuery}%`)
          .eq('configured', true)
          .limit(8);
        setApartments((data || []).map(a => ({
          id: a.id,
          name: a.name,
          floors: (a.floors as any) || [],
        })));
      } catch {
        toast.error('Search failed. Please try again.');
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectApartment = async (apt: ApartmentResult) => {
    setSelectedApartment(apt);
    const { data: tenants } = await supabase
      .from('tenants').select('unit_id').eq('apartment_id', apt.id);
    setTakenUnits((tenants || []).map(t => t.unit_id));
    setStep('select-unit');
  };

  const handleSelectUnit = (unitId: string) => {
    setSelectedUnit(unitId);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!userId || !selectedApartment || !selectedUnit) return;
    setSaving(true);
    try {
      await supabase.from('user_roles').upsert({ user_id: userId, role: 'tenant' });
      await supabase.from('profiles').update({
        phone: phone && isValidKenyanPhone(phone) ? normaliseKenyanPhone(phone) : null,
        apartment_id: selectedApartment.id,
        unit_id: selectedUnit,
      }).eq('user_id', userId);
      toast.success('All set! Welcome to your portal.');
      navigate('/tenant');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <Building2 className="w-10 h-10 mx-auto text-primary" />
            <h1 className="font-heading text-2xl font-bold">Find Your Unit</h1>
            <p className="text-sm text-muted-foreground">
              {step === 'search' && 'Search for your apartment'}
              {step === 'select-unit' && `Pick your unit in ${selectedApartment?.name}`}
              {step === 'confirm' && `Confirm Unit ${selectedUnit}`}
            </p>
          </div>

          {/* Step: Search */}
          {step === 'search' && (
            <div className="space-y-3">
              <div className="relative">
                <Input
                  placeholder="Type apartment name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {apartments.length > 0 && (
                <div className="space-y-1.5">
                  {apartments.map(apt => (
                    <button
                      key={apt.id}
                      onClick={() => handleSelectApartment(apt)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                    >
                      <Building2 className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="font-medium">{apt.name}</p>
                        <p className="text-xs text-muted-foreground">{apt.floors.length} floor{apt.floors.length !== 1 ? 's' : ''}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {apartments.length === 0 && searchQuery && !searching && (
                <p className="text-center text-sm text-muted-foreground py-2">No apartments found.</p>
              )}
            </div>
          )}

          {/* Step: Select Unit */}
          {step === 'select-unit' && selectedApartment && (
            <div className="space-y-4">
              {selectedApartment.floors.map(floor => (
                <div key={floor.floorIndex}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    {getFloorLabel(floor.floorIndex)}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: floor.unitCount }).map((_, i) => {
                      const unitId = getUnitId(floor.floorIndex, i);
                      const isTaken = takenUnits.includes(unitId);
                      return (
                        <button
                          key={unitId}
                          disabled={isTaken}
                          onClick={() => handleSelectUnit(unitId)}
                          className={`p-2 rounded-lg border text-sm font-medium transition-all flex flex-col items-center gap-1
                            ${isTaken
                              ? 'border-border bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                              : 'border-border hover:border-primary hover:bg-primary/10 cursor-pointer'
                            }`}
                        >
                          <Home className="w-4 h-4" />
                          {unitId}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button onClick={() => setStep('search')} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Apartment:</span> <strong>{selectedApartment?.name}</strong></p>
                <p><span className="text-muted-foreground">Unit:</span> <strong>{selectedUnit}</strong></p>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone (optional)</Label>
                <Input value={phone} onChange={e => handlePhoneChange(e.target.value)} placeholder="07XXXXXXXX or +254XXXXXXXXX" className={phoneError ? 'border-destructive' : ''} />
                {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
              </div>
              <Button className="w-full" onClick={handleConfirm} disabled={saving}>
                {saving ? 'Saving...' : 'Confirm & Enter Portal'}
              </Button>
              <button onClick={() => setStep('select-unit')} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Change unit
              </button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default TenantSetup;
