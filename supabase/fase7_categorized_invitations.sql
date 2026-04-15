-- Fase 7: Invitaciones Categorizadas y Banco de Identidades Maestro

-- 1. Actualizar tabla de Invitaciones
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('visit', 'worker', 'permanent')) DEFAULT 'visit';
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS end_date DATE;

-- 2. Asegurar que existan las tablas de Trabajadores y Permanentes (Sectores)
-- Estas tablas actúan como listas de acceso rápido para la guardia.

CREATE TABLE IF NOT EXISTS public.trabajadores (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  dni TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  category TEXT,
  employer TEXT,
  status TEXT DEFAULT 'active',
  face_descriptor JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.permanentes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  dni TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  category TEXT,
  employer TEXT,
  status TEXT DEFAULT 'active',
  face_descriptor JSONB,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Habilitar RLS para las nuevas tablas
ALTER TABLE public.trabajadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permanentes ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Seguridad (Guardia ve/edita todo)
CREATE POLICY "Guardia gestiona trabajadores" ON public.trabajadores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('guard', 'admin'))
  );

CREATE POLICY "Guardia gestiona permanentes" ON public.permanentes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('guard', 'admin'))
  );

-- Permitir lectura anónima o general para el pool de biometría (Optimización)
CREATE POLICY "Lectura general trabajadores" ON public.trabajadores FOR SELECT USING (true);
CREATE POLICY "Lectura general permanentes" ON public.permanentes FOR SELECT USING (true);
