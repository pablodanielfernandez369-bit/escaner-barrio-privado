-- 1. Permitir que cualquier persona (visitantes o guardias) actualice la invitación
-- Esto es crucial para que el visitante pueda anclar su nombre y el guardia pueda cambiar estados
create policy "Cualquiera actualiza invitaciones" on public.invitations
  for update using (true);

-- 2. Permitir que el Propietario lea los registros biométricos (visitor_records)
-- SOLAMENTE de las invitaciones que él mismo generó.
-- Sin esta política, el Propietario recibe NULL al consultar el estado de su propio invitado!
create policy "Propietarios leen registros de sus propias invitaciones" on public.visitor_records
  for select using (
    exists (
      select 1 from public.invitations i 
      where i.id = public.visitor_records.invitation_id 
      and i.owner_id = auth.uid()
    )
  );
