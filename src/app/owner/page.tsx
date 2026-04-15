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
  Zap,
  Calendar,
  Briefcase,
  Clock,
  User,
  ChevronDown
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
  const [workerCategory, setWorkerCategory] = useState('Jardinero');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState("");
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
    
    // CANAL ÚNICO (10s): Solo invitaciones del día (Alta velocidad)
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
      // Ordenamiento de registros internos: Cada invitación tiene un array de registros,
      // nos interesa el más reciente para determinar el estado actual.
      const sortedData = data.map(inv => ({
        ...inv,
        visitor_records: inv.visitor_records?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      }));

      // FILTRO ROBUSTO: Solo mostrar si tiene registros biométricos O si el nombre NO es el placeholder
      const filteredData = sortedData.filter(inv => {
        const hasRecords = inv.visitor_records && inv.visitor_records.length > 0;
        const currentName = (inv.visitor_name || "").trim().toLowerCase();
        const pkgName = "invitado a identificar";
        
        // Es placeholder si está vacío o si coincide con el texto genérico
        const isPlaceholder = currentName === "" || currentName === pkgName;
        
        return hasRecords || !isPlaceholder;
      });

      setActiveInvitations(filteredData);
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
        
        // 1. Buscamos el registro anterior para clonarlo
        const { data: records, error: fetchErr } = await supabase
          .from('visitor_records')
          .select('*')
          .eq('invitation_id', inv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchErr || !records || records.length === 0) {
          alert("No se encontraron registros biométricos previos para este invitado.");
          return;
        }

        const pastRecord = records[0];

        // 2. Crear registro APROBADO instantáneamente en ACCESOS
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
        alert(`⚠ Acceso Express RE-ACTIVADO para ${pastRecord.full_name}.`);
    } catch (err: any) {
        console.error("Error en re-autorización:", err);
        alert("Hubo un problema al re-autorizar el acceso: " + err.message);
    } finally {
        setSubmitting(false);
    }
  };

  const handleQuickInvite = async (visitor: any) => {
    setSubmitting(true);
    
    const { data, error } = await supabase
      .from("invitations")
      .insert([{ 
          visitor_name: visitor.full_name, 
          expected_date: expectedDate, 
          owner_id: userProfile.id,
          visitor_dni: visitor.dni
      }])
      .select().single();

    if (error) {
       setErrorDetails("No se pudo repetir la invitación.");
    } else {
       setInvitationLink(`${window.location.origin}/visitante/${data.id}`);
    }
    setSubmitting(false);
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
      } else if (newUsername) {
        throw new Error("El usuario debe tener al menos 6 caracteres.");
      }

      if (newPassword) {
        if (newPassword.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
        const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
        if (authError) throw authError;
      }

      setSettingsSuccess("Configuración actualizada correctamente.");
      setTimeout(() => setShowSettings(false), 2000);
    } catch (err: any) {
      setSettingsError(err.message || "Error al actualizar la configuración.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    const previousInvitations = [...activeInvitations];
    setActiveInvitations(prev => prev.filter(inv => inv.id !== id));
    setConfirmDeleteId(null);
    
    try {
      const { data, error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error("Error completo Supabase:", error);
        alert(`ERROR TÉCNICO:\nMensaje: ${error.message}\nDetalle: ${error.details}\nSugerencia: ${error.hint}\nCódigo: ${error.code}`);
        throw error;
      }

      if (userProfile) fetchFrequentVisitors(userProfile.id);
      
    } catch (error: any) {
      setActiveInvitations(previousInvitations);
    }
  };

  const handleExpressAuthorization = async (inv: any) => {
    setSubmitting(true);
    
    // 1. Buscar en registros anteriores del MISMO PROPIETARIO (permite búsqueda parcial)
    let matchedDni = null;
    const { data: pastInvites } = await supabase
      .from('invitations')
      .select('visitor_dni')
      .eq('owner_id', userProfile.id)
      .ilike('visitor_name', `%${inv.visitor_name}%`)
      .not('visitor_dni', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (pastInvites && pastInvites.length > 0) {
      matchedDni = pastInvites[0].visitor_dni;
    } else {
      // 2. Búsqueda exacta global
      const { data: exactMatch } = await supabase
        .from('visitors')
        .select('dni')
        .ilike('full_name', inv.visitor_name)
        .order('created_at', { ascending: false })
        .limit(1);
      if (exactMatch && exactMatch.length > 0) matchedDni = exactMatch[0].dni;
    }

    if (matchedDni) {
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
          alert(`✅ ${visitorData.full_name} fue autorizado automáticamente usando sus datos biométricos previos.`);
          await fetchActiveInvitations(userProfile.id);
          setSubmitting(false);
          return;
        }
      }
    }

    // SI FALLA o NO EXISTE, abrimos la pantalla para compartir
    alert(`⚠️ No se encontraron registros de ${inv.visitor_name}. Compartile el enlace para su registro biométrico inicial.`);
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
    setErrorDetails(null);

    const { data, error } = await supabase
      .from("invitations")
      .insert([
          { 
            visitor_name: invitationType === 'delivery' ? "DELIVERY" : "Invitado a Identificar", 
            expected_date: (invitationType === 'permanent' || invitationType === 'worker' || invitationType === 'delivery') ? startDate : expectedDate, 
            owner_id: userProfile.id,
            type: invitationType,
            category: invitationType === 'worker' ? workerCategory : null,
            start_date: (invitationType === 'permanent' || invitationType === 'worker' || invitationType === 'delivery') ? startDate : null,
            end_date: (invitationType === 'permanent' || invitationType === 'worker' || invitationType === 'delivery') ? endDate : null,
            delivery_quantity: invitationType === 'delivery' ? deliveryQuantity : 1,
            delivery_count: 0
          }
      ])
      .select()
      .single();

    if (error) {
      console.error("Error al crear invitación:", error.message);
      setErrorDetails(`No se pudo crear la invitación: ${error.message}`);
    } else if (data) {
      const link = `${window.location.origin}/visitante/${data.id}`;
      setInvitationLink(link);
    }
    
    setSubmitting(false);
  };

  const [copied, setCopied] = useState(false);
  const shareByWhatsApp = () => {
    if (!invitationLink) return;
    const message = `¡Hola! Aquí tienes tu pase para ingresar al Barrio Seguro. Por favor, completá el registro antes de llegar a la guardia: ${invitationLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const copyToClipboard = async () => {
    if (!invitationLink) return;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(invitationLink);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = invitationLink;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar:", err);
    }
  };

  const visibleInvitations = activeInvitations.filter(inv => {
    const rec = inv.visitor_records?.[0];
    const invName = rec?.full_name || inv.visitor_name || "Invitado a Identificar";
    const cleanName = invName.replace(/ \[.*\]/, "");

    const matchesSearch = cleanName.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
                         (rec?.dni || inv.visitor_dni || "").includes(activeSearchTerm);

    return matchesSearch;
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
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors mb-8 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Volver al Inicio
        </Link>
        
        <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-lg">
              <Building2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                {CONFIG.brandName}
              </h1>
              <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.3em]">{CONFIG.neighborhoodName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSettings(true)}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group"
            >
              <Settings className="w-5 h-5 text-slate-500 group-hover:text-emerald-500 transition-colors" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all border border-red-500/20"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

         <div className="mb-8 flex items-center justify-between">
           <div>
             <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
               Panel de Propietario
             </h2>
             <p className="text-slate-500 text-sm mt-1">Genera una nueva invitación para acceder al barrio.</p>
           </div>
           <span className="text-[9px] font-black uppercase text-slate-800 bg-emerald-500/5 px-3 py-1 rounded-full border border-white/5">Build v6.5</span>
         </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl overflow-hidden">
          {!invitationLink ? (
            <div className="flex flex-col w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black uppercase text-white tracking-widest">Crear Nuevo Pase</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  Seleccioná el tipo de acceso para continuar
                </p>
              </div>

              {/* Selector de Tipo */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
                {[
                  { id: 'visit', label: 'Visita', icon: User },
                  { id: 'worker', label: 'Trabajador', icon: Briefcase },
                  { id: 'permanent', label: 'Permanente', icon: Clock },
                  { id: 'delivery', label: 'Delivery', icon: Zap }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setInvitationType(type.id as any)}
                    className={`flex flex-col items-center justify-center py-4 rounded-xl transition-all gap-2 ${
                      invitationType === type.id 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <type.icon className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{type.label}</span>
                  </button>
                ))}
              </div>

              {/* Campos Condicionales */}
              <div className="space-y-6">
                {invitationType === 'visit' && (
                  <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Fecha de Visita</label>
                    <div className="relative">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                      <input 
                        type="date" 
                        value={expectedDate}
                        onChange={(e) => setExpectedDate(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-2xl p-5 pl-14 text-sm font-black text-white focus:border-emerald-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                {invitationType === 'worker' && (
                  <>
                    <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Rubro del Trabajador</label>
                      <div className="relative">
                        <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 pointer-events-none" />
                        <select 
                          value={workerCategory}
                          onChange={(e) => setWorkerCategory(e.target.value)}
                          className="w-full bg-black/20 border border-white/5 rounded-2xl p-5 pl-14 text-sm font-black text-white appearance-none focus:border-emerald-500/50 outline-none transition-all"
                        >
                          {['Jardinero', 'Plomero', 'Electricista', 'Gasista', 'Piletero', 'Personal Doméstico', 'Otros'].map(cat => (
                            <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4">Desde</label>
                        <input 
                          type="date" 
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-xs font-black text-white focus:border-emerald-500/50 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4">Hasta</label>
                        <input 
                          type="date" 
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-xs font-black text-white focus:border-emerald-500/50 outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                {invitationType === 'permanent' && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4">Desde</label>
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-xs font-black text-white focus:border-emerald-500/50 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4">Hasta</label>
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-xs font-black text-white focus:border-emerald-500/50 outline-none"
                      />
                    </div>
                  </div>
                )}

                {invitationType === 'delivery' && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Cantidad de Entregas Autorizadas (Hoy)</label>
                    <div className="grid grid-cols-5 gap-2">
                       {[1, 2, 3, 4, 5].map(q => (
                         <button 
                           key={q}
                           type="button"
                           onClick={() => setDeliveryQuantity(q)}
                           className={`py-4 rounded-2xl font-black text-xs transition-all border ${deliveryQuantity === q ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-black/20 border-white/5 text-slate-500 hover:text-white hover:border-white/20'}`}
                         >
                           {q}
                         </button>
                       ))}
                    </div>
                    <p className="text-[9px] font-black uppercase text-emerald-500/70 text-center tracking-widest mt-2 animate-pulse">
                      VÁLIDO ÚNICAMENTE PARA EL DÍA DE HOY
                    </p>
                  </div>
                )}
              </div>

              <button 
                onClick={handleCreateInvitation}
                disabled={submitting || (invitationType === 'permanent' && !endDate)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white py-6 rounded-3xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs"
              >
                {submitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-6 h-6" /> 
                    {invitationType === 'visit' ? 'Crear Visita' : invitationType === 'worker' ? 'Crear Acceso Laboral' : 'Crear Acceso Permanente'}
                  </>
                )}
              </button>
            </div>
          ) : (
             <div className="text-center py-8 space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-emerald-500/20 rounded-full text-emerald-400">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white">¡Pase Generado Exitosamente!</h2>
                
                <div className="flex justify-center mt-6 mb-4">
                  <div className="p-4 bg-white rounded-3xl shadow-xl shadow-emerald-500/10 border-4 border-emerald-500/20">
                     <QRCodeSVG value={invitationLink} size={220} level={"H"} className="text-slate-900" includeMargin={true} />
                  </div>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl break-all">
                  <p className="text-emerald-400 text-sm font-mono">{invitationLink}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={shareByWhatsApp}
                    className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-xl transition-all font-black shadow-lg shadow-green-900/20 active:scale-95"
                  >
                    <MessageCircle className="w-6 h-6 fill-current" />
                    Enviar por WhatsApp
                  </button>

                  <div className="flex gap-4">
                    <button 
                      onClick={copyToClipboard}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-medium ${copied ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 hover:bg-slate-700'}`}
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                      {copied ? "¡Copiado!" : "Copiar Enlace"}
                    </button>
                    <button 
                      onClick={() => { setInvitationLink(null); }}
                      className="flex-1 flex items-center justify-center gap-2 border border-slate-700 hover:bg-slate-800 py-3 rounded-xl transition-colors font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Crear Otra
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
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{visibleInvitations.length} TOTAL</p>
            </div>

            <div className="relative">
                <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 rotate-45" />
                <input 
                    type="text" 
                    value={activeSearchTerm}
                    onChange={(e) => setActiveSearchTerm(e.target.value)}
                    placeholder="BUSCAR EN LOS ACCESOS..." 
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/30 outline-none transition-all shadow-lg"
                />
            </div>

            <div className="grid grid-cols-1 gap-3">
                {visibleInvitations.length > 0 ? (
                    visibleInvitations.map((inv) => {
                        const rec = inv.visitor_records?.[0];
                            
                            // Detección de estado por marcador redundante (Fix Sincronización)
                            let status = rec?.status || 'no_registered';
                            const invName = rec?.full_name || inv.visitor_name || "Invitado a Identificar";
                            
                            // Lógica de Re-ingreso para Personas con Permanencia (Worker/Permanent)
                            // Si alguien salió pero su pase sigue vigente, lo mostramos como "Por ingresar"
                            const isTenure = inv.type === 'worker' || inv.type === 'permanent';
                            const hasValidDates = !inv.end_date || new Date(inv.end_date) >= new Date(new Date().setHours(0,0,0,0));
                            
                            if (status === 'no_registered') {
                                if (invName.includes("[INGRESÓ]")) status = 'inside';
                                else if (invName.includes("[SALIÓ]")) {
                                    status = (isTenure && hasValidDates) ? 'approved' : 'completed';
                                }
                                else if (invName.includes("[APROBADO]")) status = 'approved';
                                else if (invName.includes("[RECHAZADO]")) status = 'rejected';
                                else if (invName !== "Invitado a Identificar" && inv.visitor_dni) status = 'pending';
                            } else if (status === 'completed' && isTenure && hasValidDates) {
                                status = 'approved';
                            }
                            
                            const cleanName = invName.replace(/ \[.*\]/, "");
                            const initChar = cleanName !== "Invitado a Identificar" ? cleanName[0].toUpperCase() : "I";
                            const dniToShow = rec?.dni || inv.visitor_dni || "";
                            
                                
                        return (
                            <div key={inv.id} className="bg-slate-900 border border-white/5 p-5 rounded-[2rem] flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${
                                        status === 'inside' ? 'bg-emerald-500/20 text-emerald-400' : 
                                        status === 'completed' ? 'bg-red-500/20 text-red-500' :
                                        'bg-slate-800 text-slate-500'
                                    }`}>
                                        {initChar}
                                    </div>
                                    <div>
                                        <h4 className="font-black uppercase text-xs text-white group-hover:text-emerald-400 transition-colors">
                                            {cleanName} <span className="text-slate-500 ml-1">DNI {dniToShow || "---"}</span>
                                        </h4>
                                        <p className="text-[10px] font-black uppercase text-slate-500 mt-0.5 tracking-tight">
                                            {inv.type === 'visit' ? 'VISITA' : inv.type === 'worker' ? 'TRABAJADOR' : 'PERMANENTE'}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                            {status === 'no_registered' && <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded border border-white/5">Esperando Registro</span>}
                                            {status === 'pending' && <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded animate-pulse">Registro Pendiente</span>}
                                            {status === 'approved' && <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Por ingresar al barrio</span>}
                                            {status === 'inside' && <span className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Ingresó al barrio</span>}
                                            {status === 'completed' && <span className="text-[8px] font-black uppercase text-red-500 bg-red-500/10 px-2 py-0.5 rounded">Salió del barrio</span>}
                                            {status === 'rejected' && <span className="text-[8px] font-black uppercase text-red-600 bg-red-600/10 px-2 py-0.5 rounded border border-red-600/20">Registro Rechazado</span>}

                                            {isTenure && hasValidDates && (
                                              <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Autorización Activa</span>
                                            )}
                                            {inv.end_date && new Date(inv.end_date) < new Date(new Date().setHours(0,0,0,0)) && (
                                                <span className="text-[8px] font-black uppercase text-red-600 bg-red-600/10 px-2 py-0.5 rounded border border-red-600/20">Autorización Vencida</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {status === 'no_registered' && (
                                        <button 
                                          onClick={() => handleExpressAuthorization(inv)}
                                          disabled={submitting}
                                          className="p-3 bg-white/5 hover:bg-emerald-500 hover:text-white rounded-xl transition-all disabled:opacity-50"
                                          title="AutorizaciÃ³n ExprÃ©s / Compartir"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    {status === 'approved' && (
                                        <button 
                                          onClick={() => {
                                            const link = `${window.location.origin}/visitante/${inv.id}`;
                                            setInvitationLink(link);
                                          }}
                                          className="p-3 bg-white/5 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"
                                          title="Ver Pase / QR"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    {status === 'completed' && (
                                        <button 
                                          onClick={() => handleReAuthorize(inv)}
                                          disabled={submitting}
                                          className="p-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl transition-all border border-emerald-500/20"
                                          title="Acceso Express / Re-ingreso"
                                        >
                                            <Zap className="w-4 h-4 fill-current" />
                                        </button>
                                    )}
                                    {confirmDeleteId === inv.id ? (
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => handleDeleteInvitation(inv.id)}
                                                className="px-3 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all text-[9px] font-black uppercase tracking-widest"
                                            >
                                                Confirmar
                                            </button>
                                            <button 
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="px-3 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all text-[9px] font-black uppercase tracking-widest"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setConfirmDeleteId(inv.id)}
                                            className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                                            title="Eliminar Invitación"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-12 bg-slate-900/20 rounded-3xl border border-dashed border-white/5 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 italic">No tienes invitaciones registradas</p>
                    </div>
                )}
            </div>
        </div>
        {/* Configuración Modal */}
        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-slate-900 w-full max-w-md border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Hola, {userProfile?.full_name?.split(' ')[0]}</h2>
                        <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.3em] flex items-center gap-2">
                          Portal de Propietario <span className="opacity-30 text-[8px]">v5.2</span>
                        </p>
                    </div>
                  </div>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4">Nombre de Usuario</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input 
                        type="text" 
                        value={newUsername} 
                        onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                        placeholder="nuevo_usuario"
                        className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:border-emerald-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4">Cambiar ContraseÃ±a</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input 
                        type="password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nueva contraseña"
                        className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:border-emerald-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {settingsError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] font-black text-red-500 uppercase tracking-widest text-center">
                      {settingsError}
                    </div>
                  )}

                  {settingsSuccess && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> {settingsSuccess}
                    </div>
                  )}

                  <button 
                    onClick={handleUpdateSettings}
                    disabled={isUpdating}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 mt-4"
                  >
                    {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Guardar Cambios</>}
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

