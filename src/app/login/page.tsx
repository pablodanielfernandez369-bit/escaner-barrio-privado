"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ShieldCheck, User, Lock, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CONFIG } from "@/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [dni, setDni] = useState("");
  const [lote, setLote] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isRegistering && username.length < 6) {
      setError("El nombre de usuario debe tener al menos 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        // REGISTRO
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert([{
              id: authData.user.id,
              email,
              full_name: fullName.toUpperCase(),
              username: username.toLowerCase(),
              dni,
              lote,
              role: 'owner',
              status: 'pending'
            }]);

          if (profileError) throw profileError;
          setError("Registro exitoso. Tu cuenta está pendiente de aprobación por la guardia.");
          setIsRegistering(false);
        }
      } else {
        // LOGIN
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: email.includes("@") ? email : `${email}@santaines.com`,
          password,
        });

        if (loginError) throw loginError;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile?.role === "guard") router.push("/guardia");
        else router.push("/owner");
      }
    } catch (err: any) {
      setError(err.message || "Error de autenticación. Verifique sus datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg z-10"
      >
        <div className="text-center mb-6">
          <div className="inline-flex p-4 bg-emerald-500/10 rounded-3xl mb-4 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-transform hover:scale-110 duration-500">
            <ShieldCheck className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-[0.2em] text-white leading-none mb-2">{CONFIG.neighborhoodName}</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/60">{CONFIG.brandName} • Infrastructure v4.0</p>
        </div>

        <div className="glass-card rounded-[3rem] p-8 sm:p-10 shadow-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          
          {/* Main Toggle: Login/Register */}
          <div className="flex bg-white/5 p-1.5 rounded-2xl mb-8 border border-white/5">
            <button 
              onClick={() => { setIsRegistering(false); setError(""); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isRegistering ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Ingresar
            </button>
            <button 
              onClick={() => { setIsRegistering(true); setError(""); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isRegistering ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {isRegistering ? (
                <motion.div 
                  key="register-fields"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Nombre Completo</label>
                    <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="JUAN PEREZ" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-emerald-500/50 transition-all font-bold text-white text-xs placeholder:text-slate-700" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Usuario (min 6)</label>
                    <input type="text" required value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="juanperez" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-emerald-500/50 transition-all font-bold text-white text-xs placeholder:text-slate-700" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">DNI</label>
                    <input type="text" required value={dni} onChange={(e) => setDni(e.target.value)} placeholder="12345678" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-emerald-500/50 transition-all font-bold text-white text-xs placeholder:text-slate-700" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Número de Lote</label>
                    <input type="text" required value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Lote 123" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-emerald-500/50 transition-all font-bold text-white text-xs placeholder:text-slate-700" />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ej@mail.com" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-emerald-500/50 transition-all font-bold text-white text-xs placeholder:text-slate-700" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Contraseña</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-emerald-500/50 transition-all font-bold text-white text-xs placeholder:text-slate-700" />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 border rounded-2xl text-[9px] font-black uppercase tracking-wider text-center ${error.includes("exitoso") ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] text-white shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegistering ? "Crear Cuenta" : "Entrar al Portal")}
            </button>
          </form>
        </div>

        <p className="mt-10 text-center text-[10px] font-black uppercase text-slate-700 tracking-[0.2em]">
          {CONFIG.neighborhoodName} Neighbourhood &copy; 2026<br/>
          <span className="text-slate-800">{CONFIG.brandName} Infrastructure v3.0.0</span>
        </p>
      </motion.div>
    </div>
  );
}
