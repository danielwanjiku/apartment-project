
-- Create apartments table
CREATE TABLE public.apartments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  floors JSONB NOT NULL DEFAULT '[]',
  configured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE CASCADE NOT NULL,
  unit_id TEXT NOT NULL,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  monthly_rent NUMERIC NOT NULL DEFAULT 0,
  security_deposit NUMERIC NOT NULL DEFAULT 0,
  move_in_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth for now - simple app)
CREATE POLICY "Anyone can view apartments" ON public.apartments FOR SELECT USING (true);
CREATE POLICY "Anyone can create apartments" ON public.apartments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update apartments" ON public.apartments FOR UPDATE USING (true);

CREATE POLICY "Anyone can view tenants" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Anyone can create tenants" ON public.tenants FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tenants" ON public.tenants FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tenants" ON public.tenants FOR DELETE USING (true);

CREATE POLICY "Anyone can view payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Anyone can create payments" ON public.payments FOR INSERT WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX idx_tenants_apartment ON public.tenants(apartment_id);
CREATE INDEX idx_tenants_unit ON public.tenants(unit_id);
CREATE INDEX idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX idx_payments_month ON public.payments(month);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_apartments_updated_at
  BEFORE UPDATE ON public.apartments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
