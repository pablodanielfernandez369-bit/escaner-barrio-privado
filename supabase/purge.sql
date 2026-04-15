-- PURGA ATÓMICA DE DATOS DE PRUEBA Y ENTIDADES HUÉRFANAS
-- Entorno: Banco de Identidades - Barrio Seguro (Santa Inés)
-- DNI Objetivo (Test Palacios): 35264897

BEGIN;

-- 1. Eliminar todos los registros biométricos e ingresos asociados a ese DNI
DELETE FROM public.visitor_records
WHERE dni = '35264897' OR dni LIKE '%35264897%';

-- 2. Eliminar todas las invitaciones creadas para ese visitante o creadas por usuarios defectuosos
DELETE FROM public.invitations
WHERE visitor_dni = '35264897' OR visitor_name LIKE '%Palacios%';

-- 3. Eliminar el registro permanente del Banco de Identidades
DELETE FROM public.visitors
WHERE dni = '35264897';

-- 4. Opcional: Eliminar invitaciones huérfanas o con owners borrados
DELETE FROM public.invitations 
WHERE owner_id NOT IN (SELECT id FROM public.profiles);

COMMIT;

-- Si todo está listo, en Supabase SQL Editor haz clic en "RUN".
