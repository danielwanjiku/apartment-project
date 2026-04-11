import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Home, ArrowLeft, ArrowRight, User, Phone, Mail, Lock, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FloorConfig, getUnitId, getFloorLabel, getAllUnits } from '@/lib/types';
import { isValidKenyanPhone, normaliseKenyanPhone, phoneErrorMessage } from '@/lib/phone';

type Step = 'search' | 'select-unit' | 'register';

interface ApartmentResult {
  id: string;
  name: string;
  floors: FloorConfig[];
}

const TenantOnboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [apartments, setApartments] = useState<ApartmentResult[]>([]);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentResult | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [takenUnits, setTakenUnits] = useState<string[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (val && !isValidKenyanPhone(val)) setPhoneError(phoneErrorMessage);
    else setPhoneError('');
  };

  // Live search — fires 300ms after typing stops
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
    setStep('register');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApartment || !selectedUnit) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin + '/tenant',
        },
      });
      if (error) throw error;
      if (data.user) {
        await supabase.from('user_roles').insert({ user_id: data.user.id, role: 'tenant' });
        await supabase.from('profiles').update({
          full_name: fullName,
          phone: phone && isValidKenyanPhone(phone) ? normaliseKenyanPhone(phone) : null,
          apartment_id: selectedApartment.id,
          unit_id: selectedUnit,
        }).eq('user_id', data.user.id);
      }
      toast.success('Account created! Check your email to verify, then log in.');
      navigate('/tenant/login');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <Building2 className="w-10 h-10 mx-auto text-primary" />
            <h1 className="font-heading text-2xl font-bold">Tenant Portal</h1>
            <p className="text-sm text-muted-foreground">
              {step === 'search' && 'Find your apartment'}
              {step === 'select-unit' && `Select your unit in ${selectedApartment?.name}`}
              {step === 'register' && `Create your account for Unit ${selectedUnit}`}
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

              <div className="pt-2 flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <button onClick={() => navigate('/')} className="hover:text-primary flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <span>
                  Already have an account?{' '}
                  <button className="text-primary font-medium hover:underline" onClick={() => navigate('/tenant/login')}>
                    Sign in
                  </button>
                </span>
              </div>
            </div>
          )}

          {/* Step: Select Unit */}
          {step === 'select-unit' && selectedApartment && (
            <div className="space-y-4">
              {selectedApartment.floors.map(floor => (
                <div key={floor.floorIndex}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{getFloorLabel(floor.floorIndex)}</p>
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

          {/* Step: Register */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" required />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</Label>
                <Input value={phone} onChange={e => handlePhoneChange(e.target.value)} placeholder="07XXXXXXXX or +254XXXXXXXXX" className={phoneError ? 'border-destructive' : ''} />
                {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
              <button type="button" onClick={() => setStep('select-unit')} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            </form>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default TenantOnboarding;
