-- OPTIMIZACIÓN DE RENDIMIENTO: SANTA INÉS SECURITY PORTAL
-- Ejecutar en el SQL Editor de Supabase para corregir la lentitud de los paneles.

-- 1. Acelerar panel de Propietarios (Filtrado por dueño y fecha)
CREATE INDEX IF NOT EXISTS idx_invitations_owner_date ON public.invitations(owner_id, expected_date);

-- 2. Acelerar Join entre Invitaciones y Registros Biométricos
CREATE INDEX IF NOT EXISTS idx_visitor_records_invitation_id ON public.visitor_records(invitation_id);

-- 3. Acelerar Panel de Guardia (Filtrado por estado: pending, inside, etc)
CREATE INDEX IF NOT EXISTS idx_visitor_records_status ON public.visitor_records(status);

-- 4. Acelerar Historial y Ordenamiento Cronológico
CREATE INDEX IF NOT EXISTS idx_visitor_records_created_at ON public.visitor_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_records_updated_at ON public.visitor_records(updated_at DESC);

-- 5. Acelerar búsqueda por DNI (Banco de Identidades)
CREATE INDEX IF NOT EXISTS idx_visitor_records_dni ON public.visitor_records(dni);
CREATE INDEX IF NOT EXISTS idx_profiles_dni ON public.profiles(dni);
CREATE INDEX IF NOT EXISTS idx_profiles_lote ON public.profiles(lote);

ANALYZE public.invitations;
ANALYZE public.visitor_records;
ANALYZE public.profiles;
