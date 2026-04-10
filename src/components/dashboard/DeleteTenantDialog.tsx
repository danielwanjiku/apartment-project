import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface DeleteTenantDialogProps {
  open: boolean;
  onClose: () => void;
  tenantName: string;
  onConfirm: () => void;
}

const DELETE_PASSWORD = 'admin123';

const DeleteTenantDialog = ({ open, onClose, tenantName, onConfirm }: DeleteTenantDialogProps) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleConfirm = () => {
    if (password === DELETE_PASSWORD) {
      setPassword('');
      setError(false);
      onConfirm();
    } else {
      setError(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPassword(''); setError(false); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <DialogTitle className="font-heading text-center">Move Out Tenant</DialogTitle>
          <DialogDescription className="text-center">
            Remove <strong>{tenantName}</strong> from this unit? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Enter Password to Confirm</Label>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          />
          {error && <p className="text-xs text-destructive">Incorrect password. Try again.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setPassword(''); setError(false); onClose(); }}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm}>Remove Tenant</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteTenantDialog;
