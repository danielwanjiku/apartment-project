import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddTenantDialogProps {
  open: boolean;
  onClose: () => void;
  unitId: string;
  onAdd: (data: { name: string; contact: string; monthlyRent: number; securityDeposit: number; moveInDate: string }) => void;
}

const AddTenantDialog = ({ open, onClose, unitId, onAdd }: AddTenantDialogProps) => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [moveIn, setMoveIn] = useState(new Date().toISOString().split('T')[0]);

  const reset = () => { setName(''); setContact(''); setRent(''); setDeposit(''); setMoveIn(new Date().toISOString().split('T')[0]); };

  const handleSubmit = () => {
    if (!name.trim() || !contact.trim() || !rent || !deposit || !moveIn) return;
    onAdd({ name: name.trim(), contact: contact.trim(), monthlyRent: Number(rent), securityDeposit: Number(deposit), moveInDate: moveIn });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Add Tenant to Unit {unitId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tenant Name</Label>
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Info</Label>
            <Input placeholder="Phone number" value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monthly Rent (₹)</Label>
              <Input type="number" placeholder="10000" value={rent} onChange={(e) => setRent(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Security Deposit (₹)</Label>
              <Input type="number" placeholder="20000" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Move-in Date</Label>
            <Input type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || !contact.trim() || !rent || !deposit}>Add Tenant</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTenantDialog;
