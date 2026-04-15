-- 🛠️ CORRECCIÓN DE ELIMINACIÓN DE REGISTROS (DUPLICADOS)

-- Habilitar a la guardia para borrar sus propios registros (especialmente duplicados)
CREATE POLICY "La Guardia borra registros de visitantes" ON public.visitor_records 
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'guard')
);

-- Asegurar que las invitaciones también se puedan limpiar si el guardia lo necesita
CREATE POLICY "La Guardia borra invitaciones huérfanas" ON public.invitations 
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'guard')
);
