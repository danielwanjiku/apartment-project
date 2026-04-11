import { useNavigate } from 'react-router-dom';
import { Building2, Shield, Users } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-3 mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Building2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="font-heading text-4xl font-bold">Apartment Manager Pro</h1>
        <p className="text-muted-foreground text-lg">Who are you signing in as?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">
        {/* Owner */}
        <button
          onClick={() => navigate('/owner/login')}
          className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all duration-200"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="font-heading font-bold text-xl">I'm an Owner</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage your apartment, tenants and payments</p>
          </div>
        </button>

        {/* Tenant */}
        <button
          onClick={() => navigate('/tenant')}
          className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all duration-200"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="font-heading font-bold text-xl">I'm a Tenant</h2>
            <p className="text-sm text-muted-foreground mt-1">Find your apartment and manage your rent</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Landing;
