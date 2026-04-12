// src/app/owner/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  QrCode, 
  Share2, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  Plus, 
  ShieldAlert, 
  MessageCircle, 
  Building2, 
  LogOut, 
  Trash2, 
  ShieldCheck,
  Settings,
  Users,
  Lock,
  Save,
  CheckCircle,
  X,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { CONFIG } from "@/lib/config";
import { motion, AnimatePresence } from "framer-motion";

export default function OwnerDashboard() {
  const router = useRouter();
  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [frequentVisitors, setFrequentVisitors] = useState<any[]>([]);
  const [activeInvitations, setActiveInvitations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Helper para obtener fecha local YYYY-MM-DD en Argentina (UTC-3)
  const getLocalDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    verificarAcceso();
    
    // CANAL UNICO (10s): Sincronización rápida de invitaciones
    const criticalInterval = setInterval(() => {
      if (userProfile?.id) {
        fetchActiveInvitations(userProfile.id);
      }
    }, 10000);

    return () => {
      clearInterval(criticalInterval);
    };
  }, [userProfile?.id]);

  const verificarAcceso = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.role !== 'owner' || profile.status !== 'active') {
      router.push("/login");
      return;
    }

    setUserProfile(profile);
    setNewUsername(profile.username || "");
    fetchFrequentVisitors(session.user.id);
    fetchActiveInvitations(session.user.id);
    setLoading(false);
  };

  const fetchFrequentVisitors = async (ownerId: string) => {
    const { data: invitations } = await supabase
      .from('invitations')
      .select('visitor_dni')
      .eq('owner_id', ownerId);
    
    if (invitations && invitations.length > 0) {
      const dnis = [...new Set(invitations.map(i => i.visitor_dni).filter(Boolean))];
      const { data: visitors } = await supabase
        .from('visitors')
        .select('*')
        .in('dni', dnis);
      
      if (visitors) setFrequentVisitors(visitors);
    }
  };

  const fetchActiveInvitations = async (ownerId: string) => {
    // ELIMINADO FILTRO DE FECHA: Ahora es un historial persistente (últimas 50)
    const { data } = await supabase
      .from('invitations')
      .select(`
        *,
        visitor_records (status, entry_at, full_name, dni, created_at)
      `)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) {
      const sortedData = data.map(inv => ({
        ...inv,
        visitor_records: inv.visitor_records?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      }));
      setActiveInvitations(sortedData);
    }
  };

  const handleAutoInvite = async (visitor: any) => {
    setSubmitting(true);
    const today = getLocalDate();
    
    const { data: inv, error: invErr } = await supabase
      .from("invitations")
      .insert([{ 
          visitor_name: visitor.full_name, 
          expected_date: today, 
          owner_id: userProfile.id,
          visitor_dni: visitor.dni
      }])
      .select().single();

    if (invErr) {
        setErrorDetails("No se pudo crear la invitación automática.");
        setSubmitting(false);
        return;
    }

    const { error: recErr } = await supabase
        .from('visitor_records')
        .insert([{
            invitation_id: inv.id,
            dni: visitor.dni,
            full_name: visitor.full_name,
            dni_front_url: visitor.dni_front_url,
            selfie_url: visitor.selfie_url,
            face_descriptor: visitor.face_descriptor,
            status: 'approved'
        }]);

    if (recErr) {
        console.error("Error al crear registro automático:", recErr);
    }

    await fetchActiveInvitations(userProfile.id);
    setSubmitting(false);
    alert(`Invitación automática generada para ${visitor.full_name}. El guardia ya puede verlo en el sistema.`);
  };

  const handleReAuthorize = async (inv: any) => {
    setSubmitting(true);
    try {
        const today = getLocalDate();
        const { data: records, error: fetchErr } = await supabase
          .from('visitor_records')
          .select('*')
          .eq('invitation_id', inv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchErr || !records || records.length === 0) {
          alert("No se encontraron registros biométricos previos.");
          return;
        }

        const pastRecord = records[0];

        const { error: recErr } = await supabase
            .from('visitor_records')
            .insert([{
                invitation_id: inv.id,
                dni: pastRecord.dni,
                full_name: pastRecord.full_name,
                dni_front_url: pastRecord.dni_front_url,
                selfie_url: pastRecord.selfie_url,
                face_descriptor: pastRecord.face_descriptor,
                status: 'approved'
            }]);

        if (recErr) throw recErr;

        await supabase.from('invitations').update({ 
          visitor_name: pastRecord.full_name + " [APROBADO]" 
        }).eq('id', inv.id);

        await fetchActiveInvitations(userProfile.id);
        alert(`Acceso Express RE-ACTIVADO para ${pastRecord.full_name}.`);
    } catch (err: any) {
        alert("Error al re-autorizar: " + err.message);
    } finally {
        setSubmitting(false);
    }
  };

  const handleUpdateSettings = async () => {
    setIsUpdating(true);
    setSettingsError("");
    setSettingsSuccess("");
    
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("No autenticado");

      if (newUsername && newUsername.length >= 6) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ username: newUsername.toLowerCase() })
          .eq('id', user.id);
        
        if (profileError) throw profileError;
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setUserProfile(profileData);
          setNewUsername(profileData.username || "");
        }
      }

      if (newPassword) {
        if (newPassword.length < 6) throw new Error("La clave debe tener 6+ caracteres.");
        const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
        if (authError) throw authError;
      }

      setSettingsSuccess("Configuración actualizada.");
      setTimeout(() => setShowSettings(false), 2000);
    } catch (err: any) {
      setSettingsError(err.message || "Error al actualizar.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    const previousInvitations = [...activeInvitations];
    setActiveInvitations(prev => prev.filter(inv => inv.id !== id));
    setConfirmDeleteId(null);
    
    try {
      const { error } = await supabase.from('invitations').delete().eq('id', id);
      if (error) throw error;
      if (userProfile) fetchFrequentVisitors(userProfile.id);
    } catch (error: any) {
      setActiveInvitations(previousInvitations);
      alert("Error al eliminar: " + error.message);
    }
  };

  const handleExpressAuthorization = async (inv: any) => {
    setSubmitting(true);
    
    // Buscar en registros anteriores para autorizar automáticamente
    const { data: pastInvites } = await supabase
      .from('invitations')
      .select('visitor_dni')
      .eq('owner_id', userProfile.id)
      .ilike('visitor_name', `%${inv.visitor_name}%`)
      .not('visitor_dni', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (pastInvites && pastInvites.length > 0) {
      const matchedDni = pastInvites[0].visitor_dni;
      const { data: visitorData } = await supabase.from('visitors').select('*').eq('dni', matchedDni).single();
      
      if (visitorData) {
        const { error } = await supabase
          .from('visitor_records')
          .insert([{
            invitation_id: inv.id,
            dni: visitorData.dni,
            full_name: visitorData.full_name,
            dni_front_url: visitorData.dni_front_url,
            selfie_url: visitorData.selfie_url,
            face_descriptor: visitorData.face_descriptor,
            status: 'approved'
          }]);
        
        if (!error) {
          await supabase.from('invitations').update({ visitor_dni: visitorData.dni }).eq('id', inv.id);
          alert(`Encontrado: ${visitorData.full_name} fue autorizado automáticamente.`);
          await fetchActiveInvitations(userProfile.id);
          setSubmitting(false);
          return;
        }
      }
    }

    // SI NO EXISTE, generar link de registro
    const link = `${window.location.origin}/visitante/${inv.id}`;
    setInvitationLink(link);
    setSubmitting(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    window.location.href = "/";
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase
      .from("invitations")
      .insert([{ 
        visitor_name: "Invitado a Identificar", 
        expected_date: expectedDate, 
        owner_id: userProfile.id
      }])
      .select().single();

    if (error) {
      setErrorDetails(`Error: ${error.message}`);
    } else if (data) {
      setInvitationLink(`${window.location.origin}/visitante/${data.id}`);
    }
    setSubmitting(false);
  };

  const [copied, setCopied] = useState(false);
  const shareByWhatsApp = () => {
    if (!invitationLink) return;
    const message = `¡Hola! Aquí tienes tu pase para ingresar al Barrio Seguro: ${invitationLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const copyToClipboard = async () => {
    if (!invitationLink) return;
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = invitationLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const visibleInvitations = activeInvitations.filter(inv => {
    const rec = inv.visitor_records?.[0];
    const invName = rec?.full_name || inv.visitor_name || "Invitado a Identificar";
    const cleanName = invName.replace(/ \[.*\]/, "");
    const isBlankInvite = cleanName === "Invitado a Identificar" && !inv.visitor_dni;
    const status = rec?.status || 'no_registered';
    const matchesSearch = cleanName.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
                         (rec?.dni || inv.visitor_dni || "").includes(activeSearchTerm);
    const isHidden = isBlankInvite && status === 'no_registered';
    return matchesSearch && !isHidden;
  });

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 right-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-2xl mx-auto relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 mb-8 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1" />
          Volver al Inicio
        </Link>
        
        <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <Building2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">{CONFIG.brandName}</h1>
              <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.3em]">{CONFIG.neighborhoodName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSettings(true)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 group">
              <Settings className="w-5 h-5 text-slate-500 group-hover:text-emerald-500" />
            </button>
            <button onClick={handleLogout} className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl border border-red-500/20">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

         <div className="mb-8 flex items-center justify-between">
           <div>
             <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">Panel de Propietario</h2>
             <p className="text-slate-500 text-sm mt-1">Genera una nueva invitación para acceder al barrio.</p>
           </div>
         </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl overflow-hidden">
          {!invitationLink ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-8">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-lg">
                <QrCode className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black uppercase text-white">Generar Nuevo Pase</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">
                  El invitado se identificará al llegar a guardia.
                </p>
              </div>
              <button 
                onClick={handleCreateInvitation}
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white py-6 rounded-3xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs"
              >
                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Plus className="w-6 h-6" /> Crear Invitación</>}
              </button>
            </div>
          ) : (
             <div className="text-center py-8 space-y-6">
                <div className="flex justify-center flex-col items-center gap-4">
                  <div className="p-4 bg-emerald-500/20 rounded-full text-emerald-400"><CheckCircle2 className="w-12 h-12" /></div>
                  <h2 className="text-2xl font-bold text-white">¡Pase Generado Exitosamente!</h2>
                </div>
                
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-3xl shadow-xl border-4 border-emerald-500/20">
                     <QRCodeSVG value={invitationLink} size={220} level={"H"} includeMargin={true} />
                  </div>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl break-all">
                  <p className="text-emerald-400 text-sm font-mono">{invitationLink}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={shareByWhatsApp} className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-xl font-black shadow-lg">
                    <MessageCircle className="w-6 h-6 fill-current" /> Enviar por WhatsApp
                  </button>
                  <div className="flex gap-4">
                    <button onClick={copyToClipboard} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${copied ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                      {copied ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />} {copied ? "¡Copiado!" : "Copiar Enlace"}
                    </button>
                    <button onClick={() => setInvitationLink(null)} className="flex-1 flex items-center justify-center gap-2 border border-slate-700 hover:bg-slate-800 py-3 rounded-xl">
                      <Plus className="w-4 h-4" /> Crear Otra
                    </button>
                  </div>
                </div>
             </div>
          )}
        </div>

        <div className="mt-12 space-y-6">
            <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Invitados</h3>
                </div>
            </div>

            <div className="relative">
                <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 rotate-45" />
                <input 
                    type="text" 
                    value={activeSearchTerm}
                    onChange={(e) => setActiveSearchTerm(e.target.value)}
                    placeholder="BUSCAR EN LOS ACCESOS..." 
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500/30"
                />
            </div>

            <div className="grid grid-cols-1 gap-3">
                {visibleInvitations.map((inv) => {
                    const rec = inv.visitor_records?.[0];
                    let status = rec?.status || 'no_registered';
                    const invName = rec?.full_name || inv.visitor_name || "Invitado a Identificar";
                    const cleanName = invName.replace(/ \[.*\]/, "");
                    const initChar = cleanName !== "Invitado a Identificar" ? cleanName[0].toUpperCase() : "I";
                
                    return (
                        <div key={inv.id} className="bg-slate-900 border border-white/5 p-5 rounded-[2rem] flex items-center justify-between group hover:border-emerald-500/20">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${status === 'inside' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                    {initChar}
                                </div>
                                <div>
                                    <h4 className="font-black uppercase text-xs text-white group-hover:text-emerald-400">{cleanName}</h4>
                                    <div className="mt-2 flex items-center gap-2">
                                        {status === 'no_registered' && <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded border border-white/5">Esperando Registro</span>}
                                        {status === 'pending' && <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">Registro Pendiente</span>}
                                        {status === 'approved' && <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Autorizado (Pendiente Ingreso)</span>}
                                        {status === 'inside' && <span className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Dentro del Barrio</span>}
                                        {status === 'completed' && <span className="text-[8px] font-black uppercase text-red-500 bg-red-500/10 px-2 py-0.5 rounded">Salió del Barrio</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {status === 'completed' && (
                                    <button onClick={() => handleReAuthorize(inv)} disabled={submitting} className="p-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl transition-all border border-emerald-500/20">
                                        <Zap className="w-4 h-4 fill-current" />
                                    </button>
                                )}
                                <button onClick={() => setConfirmDeleteId(inv.id)} className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Modal Configuracion */}
        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900 w-full max-w-md border border-white/10 rounded-[3rem] overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-xl font-black uppercase text-white">Configuración</h2>
                  <button onClick={() => setShowSettings(false)}><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-8 space-y-6">
                  <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Usuario" className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white" />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nueva Clave" className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white" />
                  <button onClick={handleUpdateSettings} disabled={isUpdating} className="w-full bg-emerald-600 py-5 rounded-[2rem] font-black uppercase tracking-widest">
                    {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cambios"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

