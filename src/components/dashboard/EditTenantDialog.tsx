import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tenant } from '@/lib/types';
import { isValidKenyanPhone, normaliseKenyanPhone, phoneErrorMessage } from '@/lib/phone';

interface EditTenantDialogProps {
  open: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  onSave: (tenantId: string, data: { name: string; idNumber: string; contact: string; monthlyRent: number; securityDeposit: number; moveInDate: string }) => void;
}

const EditTenantDialog = ({ open, onClose, tenant, onSave }: EditTenantDialogProps) => {
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [contact, setContact] = useState('');
  const [contactError, setContactError] = useState('');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [moveIn, setMoveIn] = useState('');

  // Populate fields when tenant changes
  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setIdNumber(tenant.idNumber || '');
      setContact(tenant.contact);
      setContactError('');
      setRent(tenant.monthlyRent.toString());
      setDeposit(tenant.securityDeposit.toString());
      setMoveIn(tenant.moveInDate);
    }
  }, [tenant]);

  const handlePhoneChange = (val: string) => {
    setContact(val);
    if (val && !isValidKenyanPhone(val)) setContactError(phoneErrorMessage);
    else setContactError('');
  };

  const handleSave = () => {
    if (!tenant) return;
    if (!name.trim() || !contact.trim() || !rent || !deposit || !moveIn) return;
    if (!isValidKenyanPhone(contact)) { setContactError(phoneErrorMessage); return; }
    onSave(tenant.id, {
      name: name.trim(),
      idNumber: idNumber.trim(),
      contact: normaliseKenyanPhone(contact),
      monthlyRent: Number(rent),
      securityDeposit: Number(deposit),
      moveInDate: moveIn,
    });
    onClose();
  };

  const isValid = name.trim() && contact.trim() && !contactError && rent && deposit;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Tenant — Unit {tenant?.unitId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label>National ID Number</Label>
            <Input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="e.g. 12345678" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input
              value={contact}
              onChange={e => handlePhoneChange(e.target.value)}
              placeholder="07XXXXXXXX or +254XXXXXXXXX"
              className={contactError ? 'border-destructive' : ''}
            />
            {contactError && <p className="text-xs text-destructive">{contactError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monthly Rent (KSh)</Label>
              <Input type="number" value={rent} onChange={e => setRent(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Security Deposit (KSh)</Label>
              <Input type="number" value={deposit} onChange={e => setDeposit(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Move-in Date</Label>
            <Input type="date" value={moveIn} onChange={e => setMoveIn(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTenantDialog;
