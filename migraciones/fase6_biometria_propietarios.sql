-- Añadir soporte para firmas biométricas (Face Descriptors) a los propietarios
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS face_descriptor JSONB;

-- Comentario para documentación
COMMENT ON COLUMN public.profiles.face_descriptor IS 'Firma biométrica generada por face-api.js para reconocimiento instantáneo.';
