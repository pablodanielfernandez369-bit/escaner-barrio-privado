"use client";

import Link from "next/link";
import { ShieldCheck, User, ArrowRight, Camera, QrCode } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl z-10 grid md:grid-cols-2 gap-8"
      >
        {/* Branding Column */}
        <div className="flex flex-col justify-center text-center md:text-left space-y-6">
          <div className="inline-flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10 w-fit self-center md:self-start">
             <ShieldCheck className="w-6 h-6 text-emerald-500" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/80">Security System v3.0</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-none">
            Santa <br/>
            <span className="text-gradient-emerald italic">Inés</span>
          </h1>
          <p className="text-slate-500 text-sm md:text-base max-w-sm leading-relaxed font-medium">
            Sistema de gestión de accesos con biometría facial inteligente y control de pases digitales de última generación.
          </p>
        </div>

        {/* Action Column */}
        <div className="flex flex-col gap-4">
          <Link href="/login">
            <motion.div 
              whileHover={{ x: 10, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              className="glass p-8 rounded-[2rem] border border-white/5 flex items-center justify-between group cursor-pointer transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all text-emerald-500">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-white tracking-tight leading-none mb-1">Acceso Guardia</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Escáner Biométrico</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-700 group-hover:text-emerald-500 transition-colors" />
            </motion.div>
          </Link>

          <Link href="/login">
            <motion.div 
              whileHover={{ x: 10, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              className="glass p-8 rounded-[2rem] border border-white/5 flex items-center justify-between group cursor-pointer transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-white group-hover:text-slate-950 transition-all text-slate-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-white tracking-tight leading-none mb-1">Portal Vecinos</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pases e Invitaciones</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-700 group-hover:text-white transition-colors" />
            </motion.div>
          </Link>

          <div className="mt-8 flex items-center justify-center gap-12 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all">
             <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-white" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white">QR Secure</span>
             </div>
             <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-white" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white">Auth0 Verified</span>
             </div>
          </div>
        </div>
      </motion.div>

      {/* Footer Decoration */}
      <div className="absolute bottom-10 left-12 transform -rotate-90 hidden md:block">
        <p className="text-[8px] font-black uppercase text-slate-800 tracking-[0.8em]">BARRIO PRIVADO SANTA INÉS • INFRASTRUCTURE</p>
      </div>
    </div>
  );
}
