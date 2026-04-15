# 🏢 Identidad del Proyecto: Santa Inés Security Portal v3.0

Este archivo asegura que la ubicación y el contexto del proyecto sean persistentes para cualquier sesión de desarrollo.

## 📍 Ubicación Local (PATH)
`C:\Users\USER\OneDrive\Documentos\Nikola\escaner-barrio-privado\web`

## 🌍 Producción (Vercel)
**Link Oficial**: [https://web-eta-smoky-m6eo1avjfs.vercel.app](https://web-eta-smoky-m6eo1avjfs.vercel.app)

## 🔑 Configuración Crítica
- **Tecnologías**: Next.js 16 (Turbopack), Tailwind CSS v4, Supabase.
- **GitHub**: `pablo.daniel.fernandez369@gmail.com` / `Calle11@` (Manual Deploy/Push).
- **Branding**: Santa Inés (Edition v3.1) - Paleta Esmeralda/Slate.
- **Biometría**: Integración con `face-api.js`.
- **Panel Propietario (Features)**:
    - Búsqueda Avanzada de Invitados.
    - Auto-Invite (Aprobación instantánea).
    - Gestión de Identidad con eliminación persistente.
- **Base de Datos**: 
    - Tabla Maestra: `public.visitors` (Banco de Identidades).
    - Registro Diario: `public.visitor_records`.
    - Perfiles: `public.profiles` (con `face_descriptor`).

## ✍️ Nota para el Asistente (PRÓXIMOS PASOS)
- **Estado Actual (v3.2)**: UI optimizada (Arriba limpia, Abajo con búsqueda Dual y formato 'Nombre - DNI').
- **BLOQUEO**: El botón de borrar (tacho) no persiste el borrado en Vercel. 
- **Hipótesis**: Revisar políticas RLS en Supabase para `visitor_records` e `invitations`. El código implementa borrado optimista y limpieza de FKs, pero falla en la escritura remota.
- **Despliegue**: Se realiza mediante `powershell -ExecutionPolicy Bypass -Command "npx vercel --prod --yes"`.

---
*Última actualización: 03 de abril de 2026 (Cierre de Sesión)*
