-- Fase 5: Identidad Centralizada y Registro Único (Santa Inés)

-- 1. Crear Tabla de Visitantes Permanentes (Maestra)
CREATE TABLE IF NOT EXISTS public.visitors (
  dni TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  dni_front_url TEXT,
  selfie_url TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Vincular Invitaciones a Visitantes por DNI (Opcional)
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS visitor_dni TEXT;

-- 3. Corregir Tabla de Registros (Añadir columnas de tiempo para el historial y seguimiento)
ALTER TABLE public.visitor_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.visitor_records ADD COLUMN IF NOT EXISTS entry_at TIMESTAMP WITH TIME ZONE;

-- 4. Habilitar RLS para Visitantes
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Seguridad (RLS)
-- Visitantes pueden registrarse (anónimos)
CREATE POLICY "Visitantes se registran" ON public.visitors
  FOR INSERT WITH CHECK (true);

-- La Guardia puede ver y aprobar a todos
CREATE POLICY "Guardia gestiona visitantes" ON public.visitors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('guard', 'admin'))
  );

-- Propietarios ven a sus visitantes invitados
CREATE POLICY "Propietarios ven sus visitas previos" ON public.visitors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invitations i 
      WHERE i.owner_id = auth.uid() AND i.visitor_dni = public.visitors.dni
    )
  );

-- 6. Actualizar Registros Existentes (Opcional - Limpieza)
-- (Opcional si ya hay datos)
INSERT INTO public.visitors (dni, full_name, dni_front_url, selfie_url, status)
SELECT DISTINCT dni, full_name, dni_front_url, selfie_url, 'approved'
FROM public.visitor_records
ON CONFLICT (dni) DO NOTHING;
