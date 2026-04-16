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
  MessageCircle, 
  Building2, 
  LogOut, 
  Trash2, 
  ShieldCheck,
  Settings,
  Users,
  X,
  Zap,
  Calendar,
  Briefcase,
  Clock,
  User,
  Search
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
  const [invitationType, setInvitationType] = useState<'visit' | 'worker' | 'permanent' | 'delivery'>('visit');
  const [deliveryQuantity, setDeliveryQuantity] = useState(1);
  const [workerCategory, setWorkerCategory] = useState('Obra');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeInvitations, setActiveInvitations] = useState<any[]>([]);
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Helper para obtener fecha local YYYY-MM-DD
  const getLocalDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    verificarAcceso();
    const criticalInterval = setInterval(() => {
      if (userProfile?.id) fetchActiveInvitations(userProfile.id);
    }, 10000);
    return () => clearInterval(criticalInterval);
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
      .maybeSingle();

    if (!profile || profile.role !== 'owner' || profile.status !== 'active') {
      router.push("/login");
      return;
    }

    setUserProfile(profile);
    setNewUsername(profile.username || "");
    fetchActiveInvitations(session.user.id);
    setLoading(false);
  };

  const fetchActiveInvitations = async (ownerId: string) => {
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

      const filteredData = sortedData.filter(inv => {
        if (inv.type === 'delivery' && (inv.delivery_exit_count || 0) >= inv.delivery_quantity) return false;
        const currentName = (inv.visitor_name || "").trim().toLowerCase();
        return (inv.visitor_records && inv.visitor_records.length > 0) || (currentName !== "" && currentName !== "invitado a identificar");
      });

      setActiveInvitations(filteredData);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const today = getLocalDate();
    const { data, error } = await supabase
      .from("invitations")
      .insert([{ 
        visitor_name: invitationType === 'delivery' ? `DELIVERY (${userProfile?.full_name})` : "Invitado a Identificar", 
        expected_date: invitationType === 'delivery' ? today : (invitationType === 'permanent' || invitationType === 'worker') ? startDate : expectedDate, 
        owner_id: userProfile.id,
        type: invitationType,
        category: invitationType === 'worker' ? workerCategory : null,
        start_date: (invitationType === 'permanent' || invitationType === 'worker') ? startDate : invitationType === 'delivery' ? today : null,
        end_date: (invitationType === 'permanent' || invitationType === 'worker') ? endDate : null,
        delivery_quantity: invitationType === 'delivery' ? deliveryQuantity : 1,
        delivery_count: 0
      }])
      .select().maybeSingle();

    if (data) setInvitationLink(`${window.location.origin}/visitante/${data.id}`);
    setSubmitting(false);
    fetchActiveInvitations(userProfile.id);
  };

  const handleDeleteInvitation = async (id: string) => {
    await supabase.from('invitations').delete().eq('id', id);
    setConfirmDeleteId(null);
    fetchActiveInvitations(userProfile.id);
  };

  const handleExpressAuthorization = async (inv: any) => {
    setSubmitting(true);
    const { data: pastInvites } = await supabase
      .from('invitations')
      .select('visitor_dni')
      .eq('owner_id', userProfile.id)
      .ilike('visitor_name', `%${inv.visitor_name}%`)
      .not('visitor_dni', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (pastInvites?.[0]?.visitor_dni) {
      const { data: visitorData } = await supabase.from('visitors').select('*').eq('dni', pastInvites[0].visitor_dni).maybeSingle();
      if (visitorData) {
        await supabase.from('visitor_records').insert([{
          invitation_id: inv.id,
          dni: visitorData.dni,
          full_name: visitorData.full_name,
          dni_front_url: visitorData.dni_front_url,
          selfie_url: visitorData.selfie_url,
          face_descriptor: visitorData.face_descriptor,
          status: 'approved'
        }]);
        await supabase.from('invitations').update({ visitor_dni: visitorData.dni }).eq('id', inv.id);
        fetchActiveInvitations(userProfile.id);
        setSubmitting(false);
        return;
      }
    }
    setInvitationLink(`${window.location.origin}/visitante/${inv.id}`);
    setSubmitting(false);
  };

  const handleUpdateSettings = async () => {
    setIsUpdating(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      if (newUsername) await supabase.from('profiles').update({ username: newUsername.toLowerCase() }).eq('id', user.id);
      if (newPassword) await supabase.auth.updateUser({ password: newPassword });
      setShowSettings(false);
    }
    setIsUpdating(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const shareByWhatsApp = () => {
    const message = `¡Hola! Aquí tienes tu pase para ingresar al Barrio Seguro. Por favor, completá el registro antes de llegar a la guardia: ${invitationLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const copyToClipboard = async () => {
    if (invitationLink) {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const visibleInvitations = activeInvitations.filter(inv => {
    const rec = inv.visitor_records?.[0];
    const name = (rec?.full_name || inv.visitor_name || "").toLowerCase();
    const dni = (rec?.dni || inv.visitor_dni || "");
    return name.includes(activeSearchTerm.toLowerCase()) || dni.includes(activeSearchTerm);
  });

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/40">{CONFIG.neighborhoodName}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-8 md:px-20 md:py-16 overflow-x-hidden selection:bg-emerald-500/10">
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-emerald-900/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-20 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="space-y-4">
             <Link href="/" className="inline-flex items-center gap-3 text-slate-500 opacity-60 hover:opacity-100 transition-all group mb-4">
               <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Inicio</span>
             </Link>
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/5 luxury-card rounded-[2rem] flex items-center justify-center border border-white/5">
                   <Building2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                   <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-500 tracking-tighter uppercase leading-none">
                     {CONFIG.brandName}
                   </h1>
                   <p className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.5em] mt-3 flex items-center gap-2">
                     <ShieldCheck className="w-4 h-4" /> {CONFIG.neighborhoodName}
                   </p>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right mr-4">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Propietario</p>
               <p className="text-sm font-black text-white uppercase">Lote {userProfile?.lote || "..."}</p>
            </div>
            <button onClick={() => setShowSettings(true)} className="w-14 h-14 bg-white/5 luxury-card border border-white/5 rounded-2xl flex items-center justify-center group">
              <Settings className="w-5 h-5 text-slate-500 group-hover:text-emerald-500 transition-colors" />
            </button>
            <button onClick={handleLogout} className="w-14 h-14 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-red-500/20">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-10">
            <div className="space-y-2">
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Crear Autorización</h2>
               <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Gestión de invitados y personal</p>
            </div>

            <div className="luxury-card p-10 relative overflow-hidden bg-slate-900/40 border border-white/5 shadow-2xl">
               {!invitationLink ? (
                <form onSubmit={handleCreateInvitation} className="space-y-10 animate-in fade-in duration-700">
                   <div className="grid grid-cols-4 gap-3">
                      {[
                        { id: 'visit', label: 'Visita', icon: User },
                        { id: 'worker', label: 'Obra', icon: Briefcase },
                        { id: 'delivery', label: 'Delivery', icon: Zap },
                        { id: 'permanent', label: 'Perma', icon: Clock }
                      ].map((t) => (
                        <button key={t.id} type="button" onClick={() => setInvitationType(t.id as any)}
                          className={`flex flex-col items-center gap-3 p-4 rounded-2xl transition-all border ${invitationType === t.id ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}>
                          <t.icon className="w-5 h-5" />
                          <span className="text-[8px] font-black uppercase tracking-widest">{t.label}</span>
                        </button>
                      ))}
                   </div>

                   <div className="space-y-8">
                     {invitationType === 'visit' && (
                       <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fecha Programada</label>
                         <div className="relative">
                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                            <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="w-full h-16 luxury-input px-14 rounded-2xl text-sm font-black text-white" />
                         </div>
                       </div>
                     )}
                     {invitationType === 'worker' && (
                       <div className="space-y-6">
                         <div className="grid grid-cols-2 gap-2">
                             {['Obra', 'Jardín', 'Pileta', 'Limpieza'].map(cat => (
                               <button key={cat} type="button" onClick={() => setWorkerCategory(cat)}
                                 className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${workerCategory === cat ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}>
                                 {cat}
                               </button>
                             ))}
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="luxury-input h-14 px-6 rounded-xl text-[10px] font-black" />
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="luxury-input h-14 px-6 rounded-xl text-[10px] font-black" />
                         </div>
                       </div>
                     )}
                     {invitationType === 'delivery' && (
                        <div className="flex justify-center gap-2">
                           {[1, 2, 3, 5].map(q => (
                             <button key={q} type="button" onClick={() => setDeliveryQuantity(q)}
                               className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all ${deliveryQuantity === q ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}>{q}</button>
                           ))}
                        </div>
                     )}
                     {invitationType === 'permanent' && (
                        <div className="grid grid-cols-2 gap-4">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="luxury-input h-14 px-6 rounded-xl text-[10px] font-black" />
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="luxury-input h-14 px-6 rounded-xl text-[10px] font-black" />
                        </div>
                     )}
                   </div>

                   <button type="submit" disabled={submitting} className="w-full h-20 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] transition-all flex items-center justify-center gap-4 shadow-xl shadow-emerald-900/20 active:scale-95">
                     {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-4 h-4" /> Generar Pase Digital</>}
                   </button>
                </form>
               ) : (
                <div className="text-center space-y-8 animate-in zoom-in-95 duration-500">
                   <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-10 h-10 text-emerald-400" /></div>
                   <h3 className="text-xl font-black uppercase text-white tracking-tighter italic">¡Pase Activo!</h3>
                   <div className="bg-white p-8 rounded-[3rem] shadow-2xl inline-block relative group border-4 border-white/5">
                      <QRCodeSVG value={invitationLink} size={200} level="H" includeMargin={true} />
                      <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]"><QrCode className="w-12 h-12 text-slate-900" /></div>
                   </div>
                   <div className="flex flex-col gap-4">
                      <button onClick={shareByWhatsApp} className="h-16 bg-[#25D366] text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-green-900/20"><MessageCircle className="w-5 h-5" /> WhatsApp</button>
                      <div className="grid grid-cols-2 gap-4">
                         <button onClick={copyToClipboard} className={`h-14 rounded-2xl font-black text-[9px] uppercase transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}>{copied ? "Copiado" : "Copiar Enlace"}</button>
                         <button onClick={() => setInvitationLink(null)} className="h-14 bg-white/5 text-slate-500 hover:text-white rounded-2xl font-black text-[9px] uppercase">Nuevo</button>
                      </div>
                   </div>
                </div>
               )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
               <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Accesos Vigentes</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase flex items-center gap-2"><Users className="w-3 h-3" /> {visibleInvitations.length} autorizados</p>
               </div>
               <div className="w-full sm:w-64 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input type="text" value={activeSearchTerm} onChange={(e) => setActiveSearchTerm(e.target.value)} placeholder="Filtrar..." className="w-full h-12 luxury-input pl-12 pr-4 rounded-xl text-[10px] font-black uppercase text-white bg-slate-900/50" />
               </div>
            </div>

            <div className="grid grid-cols-1 gap-4 h-[700px] overflow-y-auto pb-20 pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {visibleInvitations.map((inv, idx) => {
                  const rec = inv.visitor_records?.[0];
                  let status = rec?.status || 'no_registered';
                  const invName = rec?.full_name || inv.visitor_name || "Invitado a Identificar";
                  const cleanName = inv.type === 'delivery' ? "DELIVERY" : invName.replace(/ \[.*\]/, "");
                  
                  return (
                    <motion.div key={inv.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} layout
                      className="luxury-card group p-6 flex items-center justify-between gap-6 bg-slate-900/30 border border-white/5 shadow-lg">
                       <div className="flex items-center gap-6 flex-1">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black ${status === 'inside' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-600'}`}>
                             {inv.type === 'delivery' ? <Zap className="w-5 h-5" /> : cleanName[0].toUpperCase()}
                          </div>
                          <div className="space-y-1">
                             <h4 className="text-xs font-black uppercase text-white leading-none">{cleanName}</h4>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] font-black uppercase text-slate-500 px-2 py-0.5 bg-white/5 rounded tracking-widest">{inv.type === 'visit' ? 'Visita' : inv.type === 'worker' ? (inv.category || 'Obra') : inv.type === 'delivery' ? 'Delivery' : 'Residente'}</span>
                                {status === 'inside' && <span className="text-[8px] font-black uppercase text-emerald-400 flex items-center gap-1 tracking-widest"><div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> En barrio</span>}
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          {confirmDeleteId === inv.id ? (
                             <button onClick={() => handleDeleteInvitation(inv.id)} className="h-10 px-4 bg-red-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest active:scale-95 transition-all">Borrar</button>
                          ) : (
                             <>
                                <button onClick={() => (status === 'no_registered') ? handleExpressAuthorization(inv) : setInvitationLink(`${window.location.origin}/visitante/${inv.id}`)} className="w-10 h-10 flex items-center justify-center bg-white/5 text-slate-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all border border-white/5"><Share2 className="w-4 h-4" /></button>
                                <button onClick={() => setConfirmDeleteId(inv.id)} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"><Trash2 className="w-4 h-4" /></button>
                             </>
                          )}
                       </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <AnimatePresence>
            {showSettings && (
             <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
                  className="bg-slate-900/90 backdrop-blur-2xl w-full max-w-sm rounded-[3rem] shadow-2xl p-10 border border-white/10 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                   <div className="flex justify-between items-center mb-8">
                      <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Ajustes</h2>
                      <button onClick={() => setShowSettings(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                   </div>
                   <div className="space-y-6">
                      <div className="space-y-2">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 ml-2">Nombre de Usuario</p>
                        <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Usuario" className="w-full h-14 luxury-input px-6 rounded-xl text-xs font-black text-white" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 ml-2">Nueva Contraseña</p>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full h-14 luxury-input px-6 rounded-xl text-xs font-black text-white" />
                      </div>
                      <button onClick={handleUpdateSettings} disabled={isUpdating} className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-900/20 active:scale-95 transition-all">
                        {isUpdating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Guardar Cambios"}
                      </button>
                   </div>
                </motion.div>
             </div>
            )}
        </AnimatePresence>
      </div>
      <footer className="mt-20 text-center opacity-10 text-[8px] font-black uppercase tracking-[1em] text-white underline decoration-emerald-500 decoration-2 underline-offset-8">{CONFIG.brandName} • 2026</footer>
    </div>
  );
}
