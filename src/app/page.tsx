"use client";

import Link from "next/link";
import { ShieldCheck, User, ArrowRight, Camera, QrCode, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { CONFIG } from "@/lib/config";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-emerald-500/10">
      {/* Mesh Background */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-emerald-900/10 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="w-full max-w-5xl z-10 grid md:grid-cols-2 gap-12 items-center"
      >
        {/* Branding Column */}
        <div className="flex flex-col justify-center text-center md:text-left space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 p-2 bg-white/5 luxury-card px-4 py-2 rounded-2xl w-fit self-center md:self-start border border-white/5">
               <ShieldCheck className="w-4 h-4 text-emerald-500" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/80">Security Infrastructure v6.5</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-white leading-[0.85] italic">
              {CONFIG.brandName.split(' ')[0]} <br/>
              <span className="text-emerald-500 not-italic">{CONFIG.neighborhoodName}</span>
            </h1>
          </div>
          
          <div className="space-y-6">
            <p className="text-slate-400 text-sm md:text-base max-w-sm leading-relaxed font-bold uppercase tracking-widest">
              Biometría facial inteligente y gestión de accesos de alta gama.
            </p>
            <div className="h-0.5 w-12 bg-emerald-500/20 hidden md:block" />
          </div>
        </div>

        {/* Action Column */}
        <div className="flex flex-col gap-6">
          <Link href="/login">
            <motion.div 
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="bg-slate-900/40 luxury-card p-10 rounded-[3rem] flex items-center justify-between group cursor-pointer transition-all border border-white/5 shadow-2xl"
            >
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 shadow-inner">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase text-white tracking-tighter leading-none mb-2 italic">Terminal Guardia</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Escáner de Rostro y DNI</p>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
              </div>
            </motion.div>
          </Link>

          <Link href="/login">
            <motion.div 
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="bg-slate-900/40 luxury-card p-10 rounded-[3rem] flex items-center justify-between group cursor-pointer transition-all border border-white/5 shadow-2xl"
            >
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 bg-emerald-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase text-white tracking-tighter leading-none mb-2 italic">Portal Propietarios</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Pases Digitales al Instante</p>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
              </div>
            </motion.div>
          </Link>

          <div className="mt-12 flex items-center justify-center md:justify-start gap-12 opacity-30 hover:opacity-100 transition-opacity duration-700 grayscale">
             <div className="flex items-center gap-3">
                <QrCode className="w-4 h-4 text-[#064e3b]" />
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#064e3b]">Secure QR</span>
             </div>
             <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-[#064e3b]" />
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#064e3b]">FaceID Ready</span>
             </div>
          </div>
        </div>
      </motion.div>

      {/* Footer Decoration */}
      <div className="fixed bottom-12 text-center w-full z-0 opacity-10">
        <p className="text-[10px] font-black uppercase tracking-[1.5em] text-white underline decoration-emerald-500 decoration-2 underline-offset-8">{CONFIG.brandName} • 2026</p>
      </div>
    </div>
  );
}
