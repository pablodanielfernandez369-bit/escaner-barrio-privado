"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Camera, 
  User, 
  Calendar, 
  MapPin, 
  ArrowRight,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  Car,
  Briefcase,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

export default function VisitorPass() {
  const { id } = useParams();
  const [visitor, setVisitor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  
  // Registration States
  const [fullName, setFullName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [dniPhoto, setDniPhoto] = useState<string | null>(null);
  const [dniBackPhoto, setDniBackPhoto] = useState<string | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);

  // Vehicle States
  const [hasVehicle, setHasVehicle] = useState(false);
  const [vehiclePatente, setVehiclePatente] = useState("");
  const [vehicleModelo, setVehicleModelo] = useState("");
  const [vehicleAnio, setVehicleAnio] = useState("");
  const [vehicleInsurancePhoto, setVehicleInsurancePhoto] = useState<string | null>(null);
  const [vehicleInsuranceBackPhoto, setVehicleInsuranceBackPhoto] = useState<string | null>(null);

  // Work Insurance States
  const [hasWorkInsurance, setHasWorkInsurance] = useState(false);
  const [workInsurancePhoto, setWorkInsurancePhoto] = useState<string | null>(null);

  
  // Camera States
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturingInsurance, setIsCapturingInsurance] = useState<'vehicle' | 'vehicle_back' | 'work' | null>(null);
  const [isCapturingDni, setIsCapturingDni] = useState<'front' | 'back' | null>(null);


  // EFECTO PRINCIPAL: Se asegura de que el video reciba el stream cuando el elemento ya fue dibujado en el DOM
  useEffect(() => {
    if (isCapturing && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Error al reproducir video (useEffect):", e));
    }
  }, [isCapturing, stream, step]);

  useEffect(() => {
    async function loadInvitation() {
      try {
        const { data: inv, error } = await supabase
          .from("invitations")
          .select("*, visitor_records(*), profiles(full_name, lote)")
          .eq("id", id)
          .single();
        
        if (inv) {
          if (inv.visitor_records?.[0]) {
            setVisitor({ ...inv.visitor_records[0], invitations: inv });
          } else {
            setVisitor({ invitations: inv });
            if (inv.visitor_name && inv.visitor_name !== "Invitado a Identificar") {
              setFullName(inv.visitor_name);
            } else {
              setFullName("");
            }
          }
        }
      } catch (err) {
        console.error("Error loading invitation:", err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadInvitation();
  }, [id]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => {
        t.stop();
        t.enabled = false;
      });
    }
    setStream(null);
    setIsCapturing(false);
  };

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const startCamera = async () => {
    // Limpiar antes de empezar
    if (stream) stopCamera();

    // Pequeño retardo para que el hardware se libere (Crítico para Android)
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      // Intentar primero con la cámara trasera si es el DNI (Paso 2)
      let constraints: any = { 
        video: { 
          facingMode: step === 3 ? "user" : "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      };

      let s;
      try {
        console.log(`[Camera] Intentando iniciar (${step === 3 ? 'user' : 'environment'})...`);
        s = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        console.warn("[Camera] Falló constraints específicos, intentando fallback general...");
        // Fallback: Cualquier cámara, cualquier resolución
        s = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: false 
        });
      }
      
      setIsCapturing(true);
      setStream(s);
    } catch (err: any) {
      console.error("[Camera] Error fatal:", err);
      setIsCapturing(false);
      alert("No se pudo activar la cámara. Por favor intenta subir una foto desde tu galería.");
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const data = reader.result as string;
        if (step === 2) {
          if (isCapturingDni === 'back') setDniBackPhoto(data);
          else setDniPhoto(data);
        }
        else if (step === 3) setSelfiePhoto(data);
        else if (step === 4) {
          if (isCapturingInsurance === 'vehicle') setVehicleInsurancePhoto(data);
          else if (isCapturingInsurance === 'vehicle_back') setVehicleInsuranceBackPhoto(data);
          else if (isCapturingInsurance === 'work') setWorkInsurancePhoto(data);
        }
        stopCamera();
        setIsCapturingInsurance(null);
        setIsCapturingDni(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      // Feedback visual antes de capturar
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const data = canvas.toDataURL("image/webp", 0.8);
        if (step === 2) {
          if (isCapturingDni === 'back') setDniBackPhoto(data);
          else setDniPhoto(data);
        }
        else if (step === 3) setSelfiePhoto(data);
        else if (step === 4) {
          if (isCapturingInsurance === 'vehicle') setVehicleInsurancePhoto(data);
          else if (isCapturingInsurance === 'vehicle_back') setVehicleInsuranceBackPhoto(data);
          else if (isCapturingInsurance === 'work') setWorkInsurancePhoto(data);
        }
        stopCamera();
        setIsCapturingInsurance(null);
        setIsCapturingDni(null);
      }
    }
  };

  const handleSubmitRegistration = async () => {
    if (!fullName || !dni || !dniPhoto || !selfiePhoto) {
      alert("Por favor completa todos los pasos.");
      return;
    }

    setLoading(true);
    try {
      const vName = `${fullName.trim()} ${lastName.trim()}`.toUpperCase();
      
      // 1. Crear el registro detallado para el guardia
      const { data, error } = await supabase
        .from("visitor_records")
        .insert([{
          invitation_id: visitor.invitations.id, 
          full_name: vName,
          dni,
          dni_front_url: dniPhoto,
          dni_back_url: dniBackPhoto,
          selfie_url: selfiePhoto,
          vehicle_patente: hasVehicle ? vehiclePatente.toUpperCase() : null,
          vehicle_modelo: hasVehicle ? vehicleModelo.toUpperCase() : null,
          vehicle_anio: hasVehicle ? vehicleAnio : null,
          vehicle_insurance_url: hasVehicle ? vehicleInsurancePhoto : null,
          vehicle_insurance_back_url: hasVehicle ? vehicleInsuranceBackPhoto : null,
          work_insurance_url: hasWorkInsurance ? workInsurancePhoto : null,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      // 2. ACTUALIZACIÓN REDUNDANTE EN LA INVITACIÓN (Para que el dueño lo vea sin problemas de RLS)
      const { error: invUpdateErr } = await supabase
        .from('invitations')
        .update({
            visitor_name: vName,
            visitor_dni: dni
        })
        .eq('id', visitor.invitations.id);
      
      if (invUpdateErr) console.warn("Fallo actualización de invitación redundante:", invUpdateErr);

      setVisitor({ ...data, invitations: visitor.invitations });
    } catch (err: any) {
      alert("Error al registrar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-6" />
        <p className="text-emerald-500 font-black uppercase tracking-[0.3em] animate-pulse text-[10px]">Santa Inés • Acceso Digital</p>
      </div>
    );
  }

  if (!visitor?.invitations) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="mb-6 w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-black uppercase mb-4">Pase no encontrado</h1>
        <p className="text-slate-500 text-sm italic uppercase tracking-widest text-[10px]">El enlace es inválido o ha expirado.</p>
      </div>
    );
  }

  const hasRecord = !!visitor.id;

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center pb-20">
      {/* Branding Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md flex flex-col items-center mb-10 mt-4">
        <div className="p-4 bg-emerald-500/10 rounded-2xl mb-4 border border-emerald-500/20">
          <ShieldCheck className="w-8 h-8 text-emerald-500" />
        </div>
        <h1 className="text-xl font-black uppercase tracking-[0.2em] text-white">Barrio Seguro</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/70">Santa Inés • Acceso Digital <span className="opacity-30">v5.5</span></p>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        
        {hasRecord ? (
          /* PASE DIGITAL */
          <div className="glass-card rounded-[3rem] p-8 flex flex-col items-center relative overflow-hidden shadow-2xl border border-white/5">
            <div className={`absolute top-6 right-6 px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-[0.2em] ${visitor.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
              {visitor.status === 'approved' ? 'ACCESO AUTORIZADO' : 'AUDITORÍA PENDIENTE'}
            </div>

            {visitor.status === 'approved' ? (
              <>
                <div className="bg-white p-6 rounded-3xl mb-8 shadow-2xl ring-[12px] ring-white/5">
                  <QRCodeSVG value={typeof window !== 'undefined' ? window.location.href : id as string} size={200} level="H" />
                </div>
                <div className="text-center w-full space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em] mb-2">Pasaporte Bio-Digital</p>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white leading-none mb-1">{visitor.full_name}</h2>
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 mt-2">
                       <MapPin className="w-3 h-3 text-emerald-400" />
                       <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Lote {visitor.invitations.profiles?.lote}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-6 border-t border-white/5">
                    <div className="p-4 bg-white/5 rounded-2xl flex flex-col items-center justify-center">
                       <Calendar className="w-4 h-4 text-slate-500 mb-2" />
                       <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Vence</p>
                       <p className="text-[10px] font-bold text-white uppercase">{new Date(visitor.invitations.expected_date).toLocaleDateString('es-AR')}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl flex flex-col items-center justify-center">
                       <User className="w-4 h-4 text-slate-500 mb-2" />
                       <p className="text-[8px] font-black uppercase text-slate-500 mb-1">DNI</p>
                       <p className="text-[10px] font-bold text-white uppercase">{visitor.dni}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 flex flex-col items-center text-center space-y-6">
                 <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 border border-amber-500/20 animate-pulse">
                    <ShieldAlert className="w-10 h-10" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black uppercase text-white mb-2 leading-none">{visitor.full_name}</h2>
                    <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl mt-4">
                       <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest mb-4">
                          Tu solicitud de acceso ha sido enviada. Por favor, aguardá en la guardia para la validación final.
                       </p>
                       <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest px-4 py-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10 flex items-center justify-center gap-2">
                         <CheckCircle2 className="w-3 h-3" /> Registro Exitoso
                       </span>
                    </div>
                 </div>
              </div>
            )}
          </div>
        ) : (
          /* REGISTRO POR PASOS */
          <div className="glass-card rounded-[3rem] p-8 flex flex-col shadow-2xl relative min-h-[500px] border border-white/5">
            <div className="flex items-center justify-between mb-8 px-2">
               {[1,2,3,4].map(i => (
                 <div key={i} className={`flex-1 h-1.5 rounded-full mx-1 transition-all duration-500 ${step >= i ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`} />
               ))}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-black uppercase text-white mb-1">Paso 1 de 3</h2>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Identificación</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-4">Nombre</label>
                       <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value.toUpperCase())} placeholder="JUAN" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black uppercase focus:border-emerald-500/50 transition-all text-white" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-4">Apellido</label>
                       <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value.toUpperCase())} placeholder="PEREZ" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black uppercase focus:border-emerald-500/50 transition-all text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-4">DNI / Documento</label>
                     <input type="text" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="12345678" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black uppercase focus:border-emerald-500/50 transition-all text-white" />
                  </div>
                  <button disabled={!fullName || !lastName || !dni} onClick={() => setStep(2)} className="w-full bg-emerald-600 disabled:opacity-30 hover:bg-emerald-500 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest mt-8 flex items-center justify-center gap-3">Continuar <ArrowRight className="w-4 h-4" /></button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 flex flex-col items-center">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-black uppercase text-white mb-1">Paso 2 de 3</h2>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Foto del Documento</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Frente</p>
                      <div className="aspect-[16/10] bg-slate-950 rounded-3xl overflow-hidden border-2 border-white/5 relative flex items-center justify-center group">
                        {isCapturing && isCapturingDni === 'front' ? (
                          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        ) : dniPhoto ? (
                          <img src={dniPhoto} className="w-full h-full object-cover" alt="DNI Frente" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                             <div className="p-4 bg-emerald-500/10 rounded-full mb-2">
                               <Camera className="w-8 h-8 text-emerald-500" />
                             </div>
                             <p className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Tocar para capturar</p>
                          </div>
                        )}
                        {!dniPhoto && !isCapturing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                             <button onClick={() => { setIsCapturingDni('front'); startCamera(); }} className="px-6 py-3 bg-emerald-500 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all">
                               <Camera className="w-4 h-4" /> Tomar Foto
                             </button>
                          </div>
                        )}
                        {dniPhoto && !isCapturing && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                             <button onClick={() => { setIsCapturingDni('front'); startCamera(); }} className="p-3 bg-emerald-500 rounded-full text-white shadow-lg"><Camera className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Dorso</p>
                      <div className="aspect-[16/10] bg-slate-950 rounded-3xl overflow-hidden border-2 border-white/5 relative flex items-center justify-center group">
                        {isCapturing && isCapturingDni === 'back' ? (
                          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        ) : dniBackPhoto ? (
                          <img src={dniBackPhoto} className="w-full h-full object-cover" alt="DNI Dorso" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                             <div className="p-4 bg-emerald-500/10 rounded-full mb-2">
                               <Camera className="w-8 h-8 text-emerald-500" />
                             </div>
                             <p className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Tocar para capturar</p>
                          </div>
                        )}
                        {!dniBackPhoto && !isCapturing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                             <button onClick={() => { setIsCapturingDni('back'); startCamera(); }} className="px-6 py-3 bg-emerald-500 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all">
                               <Camera className="w-4 h-4" /> Tomar Foto
                             </button>
                          </div>
                        )}
                        {dniBackPhoto && !isCapturing && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                             <button onClick={() => { setIsCapturingDni('back'); startCamera(); }} className="p-3 bg-emerald-500 rounded-full text-white shadow-lg"><Camera className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full gap-3 mt-4">
                    <button onClick={() => { stopCamera(); setStep(1); }} className="flex-1 bg-white/5 border border-white/5 py-4 rounded-2xl font-black text-[9px] uppercase text-slate-500">Volver</button>
                    {isCapturing ? (
                       <button onClick={capturePhoto} className="flex-[2] bg-emerald-600 py-4 rounded-2xl font-black text-[9px] uppercase flex items-center justify-center gap-2 ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/20">Tomar Foto</button>
                    ) : (
                       <div className="flex-[2] flex gap-2">
                          <label className="flex-1 bg-slate-800 py-4 rounded-2xl font-black text-[9px] uppercase flex items-center justify-center gap-2 cursor-pointer border border-white/5">
                            <ImageIcon className="w-4 h-4" /> Galería
                            <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
                          </label>
                       </div>
                    )}
                  </div>
                  {dniPhoto && dniBackPhoto && !isCapturing && <button onClick={() => setStep(3)} className="w-full bg-emerald-600 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest mt-6 flex items-center justify-center gap-3">Siguiente: Tu Selfie <ArrowRight className="w-4 h-4" /></button>}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 flex flex-col items-center">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-black uppercase text-white mb-1">Paso 3 de 3</h2>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Selfie Biométrica</p>
                  </div>

                  <div className="w-56 h-56 bg-slate-950 rounded-full overflow-hidden border-4 border-emerald-500/30 relative flex items-center justify-center shadow-2xl group">
                    {isCapturing && (isCapturingDni === 'selfie' || isCapturingDni === true) ? (
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                    ) : selfiePhoto ? (
                      <img src={selfiePhoto} className="w-full h-full object-cover scale-x-[-1]" alt="Selfie Preview" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                         <div className="p-4 bg-emerald-500/10 rounded-full mb-1">
                            <User className="w-10 h-10 text-emerald-500" />
                         </div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Selfie</p>
                      </div>
                    )}
                    {!selfiePhoto && !isCapturing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                         <button onClick={startCamera} className="px-6 py-3 bg-emerald-500 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all">
                           <Camera className="w-4 h-4" /> Tomar Foto
                         </button>
                      </div>
                    )}
                    {selfiePhoto && !isCapturing && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                         <button onClick={startCamera} className="p-4 bg-emerald-500 rounded-full text-white shadow-xl"><Camera className="w-5 h-5" /></button>
                      </div>
                    )}
                  </div>

                  <div className="flex w-full gap-3 mt-8">
                    <button onClick={() => { stopCamera(); setStep(2); }} className="flex-1 bg-white/5 border border-white/5 py-5 rounded-2xl font-black text-[10px] uppercase text-slate-500">Volver</button>
                    {!selfiePhoto && !isCapturing ? (
                       <div className="flex-[2] flex gap-2">
                         <button onClick={startCamera} className="flex-1 bg-emerald-600 py-5 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 px-2"><Camera className="w-4 h-4" /> Cámara</button>
                         <label className="flex-1 bg-slate-800 py-5 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 cursor-pointer border border-white/5 px-2">
                           <ImageIcon className="w-4 h-4" /> Galería
                           <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
                         </label>
                       </div>
                    ) : isCapturing ? (
                       <button onClick={capturePhoto} className="flex-[2] bg-emerald-600 py-5 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 ring-4 ring-emerald-500/20">Capturar Rostro</button>
                    ) : (
                       <div className="flex-[2] flex gap-2">
                          <button onClick={startCamera} className="flex-1 bg-amber-600 py-5 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2">Reintentar</button>
                          <label className="flex-1 bg-slate-800 py-5 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 cursor-pointer border border-white/5">
                            <ImageIcon className="w-4 h-4" /> Nueva
                            <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
                          </label>
                       </div>
                    )}
                  </div>
                  {selfiePhoto && !isCapturing && (
                    <button onClick={() => setStep(4)} className="w-full bg-emerald-600 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest mt-6 flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20">
                      Continuar <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-black uppercase text-white mb-1">Paso 4 de 4</h2>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vehículo y Seguros (Opcional)</p>
                  </div>

                  {/* Vehículo Toggle */}
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4">
                    <button 
                      onClick={() => setHasVehicle(!hasVehicle)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${hasVehicle ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-slate-900 border-white/5'} border`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${hasVehicle ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          <Car className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Tengo Vehículo</span>
                      </div>
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${hasVehicle ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hasVehicle ? 'left-5' : 'left-1'}`} />
                      </div>
                    </button>

                    {hasVehicle && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-4 bg-black/20 p-4 rounded-2xl">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                             <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-4">Patente</label>
                             <input type="text" value={vehiclePatente} onChange={(e) => setVehiclePatente(e.target.value.toUpperCase())} placeholder="ABC 123" className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-black uppercase text-white" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-4">Año</label>
                             <input type="text" value={vehicleAnio} onChange={(e) => setVehicleAnio(e.target.value)} placeholder="2024" className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-black uppercase text-white" />
                          </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-4">Modelo/Versión</label>
                           <input type="text" value={vehicleModelo} onChange={(e) => setVehicleModelo(e.target.value.toUpperCase())} placeholder="TOYOTA HILUX" className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-black uppercase text-white" />
                        </div>

                        {/* Fotos Seguro Vehículo */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest text-center block">Frente Seguro</label>
                              <div className="aspect-video bg-slate-900 rounded-xl relative overflow-hidden border border-white/5 group">
                                {isCapturing && isCapturingInsurance === 'vehicle' ? (
                                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                ) : vehicleInsurancePhoto ? (
                                  <img src={vehicleInsurancePhoto} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                     <Camera className="w-6 h-6 text-slate-700" />
                                     <p className="text-[8px] font-black text-slate-700 uppercase">Frente</p>
                                  </div>
                                )}
                                {!vehicleInsurancePhoto && !isCapturing && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                     <button onClick={() => { setIsCapturingInsurance('vehicle'); startCamera(); }} className="px-4 py-2 bg-emerald-500 text-white rounded-full font-black text-[8px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                                       <Camera className="w-3 h-3" /> Tomar Foto
                                     </button>
                                  </div>
                                )}
                                {vehicleInsurancePhoto && !isCapturing && (
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                     <button onClick={() => { setIsCapturingInsurance('vehicle'); startCamera(); }} className="p-2 bg-emerald-500 rounded-full text-white shadow-md"><Camera className="w-3 h-3" /></button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest text-center block">Dorso Seguro</label>
                              <div className="aspect-video bg-slate-900 rounded-xl relative overflow-hidden border border-white/5 group">
                                {isCapturing && isCapturingInsurance === 'vehicle_back' ? (
                                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                ) : vehicleInsuranceBackPhoto ? (
                                  <img src={vehicleInsuranceBackPhoto} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                     <Camera className="w-6 h-6 text-slate-700" />
                                     <p className="text-[8px] font-black text-slate-700 uppercase">Dorso</p>
                                  </div>
                                )}
                                {!vehicleInsuranceBackPhoto && !isCapturing && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                     <button onClick={() => { setIsCapturingInsurance('vehicle_back'); startCamera(); }} className="px-4 py-2 bg-emerald-500 text-white rounded-full font-black text-[8px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                                       <Camera className="w-3 h-3" /> Tomar Foto
                                     </button>
                                  </div>
                                )}
                                {vehicleInsuranceBackPhoto && !isCapturing && (
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                     <button onClick={() => { setIsCapturingInsurance('vehicle_back'); startCamera(); }} className="p-2 bg-emerald-500 rounded-full text-white shadow-md"><Camera className="w-3 h-3" /></button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                   
                          <div className="flex gap-2">
                             <label className="flex-1 p-3 bg-slate-800 rounded-xl text-white flex items-center justify-center gap-2 cursor-pointer text-[9px] font-black uppercase"><ImageIcon className="w-4 h-4" /> Desde Galería<input type="file" accept="image/*" className="hidden" onChange={(e) => { setIsCapturingInsurance('vehicle'); handleGalleryUpload(e); }} /></label>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Seguro de Trabajo (Solo para Trabajadores) */}
                  {visitor.invitations.type === 'worker' && (
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4">
                      <button 
                        onClick={() => setHasWorkInsurance(!hasWorkInsurance)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${hasWorkInsurance ? 'bg-blue-500/20 border-blue-500/30' : 'bg-slate-900 border-white/5'} border`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${hasWorkInsurance ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Tengo Seguro de Trabajo</span>
                        </div>
                        <div className={`w-10 h-6 rounded-full relative transition-colors ${hasWorkInsurance ? 'bg-blue-500' : 'bg-slate-700'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hasWorkInsurance ? 'left-5' : 'left-1'}`} />
                        </div>
                      </button>

                      {hasWorkInsurance && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-4 bg-black/20 p-4 rounded-2xl">
                          <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-4">Credencial / Póliza</label>
                            <div className="flex items-center gap-3">
                                <div className="flex-[2] relative group aspect-video">
                                  {isCapturing && isCapturingInsurance === 'work' ? (
                                    <div className="w-full h-full bg-black rounded-xl overflow-hidden">
                                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                      <button onClick={capturePhoto} className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 p-2 rounded-full shadow-lg"><Camera className="w-4 h-4 text-white" /></button>
                                    </div>
                                  ) : workInsurancePhoto ? (
                                    <div className="w-full h-full bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 overflow-hidden relative">
                                      <img src={workInsurancePhoto} className="w-full h-full object-cover" />
                                      <button onClick={() => setWorkInsurancePhoto(null)} className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-md"><X className="w-3 h-3 text-white" /></button>
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                         <button onClick={() => { setIsCapturingInsurance('work'); startCamera(); }} className="p-3 bg-blue-500 rounded-full text-white shadow-lg"><Camera className="w-4 h-4" /></button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-full h-full bg-slate-900 rounded-xl flex flex-col items-center justify-center border border-white/5 gap-2">
                                      <Camera className="w-6 h-6 text-slate-700" />
                                      <p className="text-[8px] font-black text-slate-700 uppercase">Certificado ART</p>
                                      <button onClick={() => { setIsCapturingInsurance('work'); startCamera(); }} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-full font-black text-[8px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                                        <Camera className="w-3 h-3" /> Tomar Foto
                                      </button>
                                    </div>
                                  )}
                                </div>
                              <div className="flex-1 flex flex-col gap-2">
                                <button onClick={() => { setIsCapturingInsurance('work'); startCamera(); }} className="p-3 bg-blue-600 rounded-xl text-white flex items-center justify-center gap-2"><Camera className="w-4 h-4" /></button>
                                <label className="p-3 bg-slate-800 rounded-xl text-white flex items-center justify-center gap-2 cursor-pointer"><ImageIcon className="w-4 h-4" /><input type="file" accept="image/*" className="hidden" onChange={(e) => { setIsCapturingInsurance('work'); handleGalleryUpload(e); }} /></label>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-8">
                    <button onClick={() => { stopCamera(); setStep(3); }} className="flex-1 bg-white/5 border border-white/5 py-6 rounded-[2rem] font-black text-xs uppercase text-slate-500">Volver</button>
                    <button onClick={handleSubmitRegistration} className="flex-[2] bg-emerald-600 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Finalizar Registro <ShieldCheck className="w-5 h-5" /></>}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
            
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
      </motion.div>
    </div>
  );
}
