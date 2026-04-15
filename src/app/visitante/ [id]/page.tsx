"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, Share2, MapPin, Calendar, User } from "lucide-react";
import { motion } from "framer-motion";

export default function VisitorPass() {
  const { id } = useParams();
  const [visitor, setVisitor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVisitor() {
      const { data, error } = await supabase
        .from("visitor_records")
        .select("*, invitations(profiles(full_name, lote))")
        .eq("id", id)
        .single();
      
      if (data) setVisitor(data);
      setLoading(true); // Logic to show loader for a bit
      setTimeout(() => setLoading(false), 1000);
    }
    loadVisitor();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-6" />
        <p className="text-emerald-500 font-black uppercase tracking-[0.3em] animate-pulse">Cargando Pase Digital...</p>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <h1 className="text-2xl font-black uppercase mb-4">Pase no encontrado</h1>
        <p className="text-slate-500 text-sm">El enlace es inválido o ha expirado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center">
      {/* Branding Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col items-center mb-10 mt-4"
      >
        <div className="p-4 bg-emerald-500/10 rounded-2xl mb-4 border border-emerald-500/20">
          <ShieldCheck className="w-8 h-8 text-emerald-500" />
        </div>
        <h1 className="text-xl font-black uppercase tracking-[0.2em] text-white">Barrio Seguro</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/70">Santa Inés • Acceso Digital</p>
      </motion.div>

      {/* Main Pass Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md glass-card rounded-[3rem] p-8 flex flex-col items-center relative overflow-hidden"
      >
        {/* Decorative scanning line animation */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-scan" style={{ animation: 'scan 4s linear infinite' }} />

        {/* QR Code Section */}
        <div className="bg-white p-6 rounded-3xl mb-8 shadow-[0_0_50px_rgba(16,185,129,0.15)] ring-8 ring-white/5">
          <QRCodeSVG value={window.location.href} size={200} level="H" includeMargin={false} />
        </div>

        <div className="w-full space-y-6">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em] mb-2">Visitante Autorizado</p>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-1">{visitor.full_name}</h2>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Lote {visitor.invitations?.profiles?.lote || "S/D"}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
            <div className="p-4 bg-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
               <Calendar className="w-4 h-4 text-slate-500 mb-2" />
               <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Fecha</p>
               <p className="text-[10px] font-bold text-white whitespace-nowrap">{new Date(visitor.created_at).toLocaleDateString('es-AR')}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
               <User className="w-4 h-4 text-slate-500 mb-2" />
               <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">DNI</p>
               <p className="text-[10px] font-bold text-white">{visitor.dni || "PENDIENTE"}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Help / Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-12 text-center"
      >
        <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-4">Presente este código en la guardia</p>
        <button 
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'Pase Digital Santa Inés',
                text: `Mi pase de acceso para Santa Inés - ${visitor.full_name}`,
                url: window.location.href,
              });
            }
          }}
          className="inline-flex items-center gap-3 bg-white/5 hover:bg-white/10 px-8 py-4 rounded-2xl border border-white/10 transition-all text-xs font-black uppercase tracking-widest text-slate-300"
        >
          <Share2 className="w-4 h-4" />
          Compartir Pase
        </button>
      </motion.div>
    </div>
  );
}
