"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
    QrCode, Share2, ArrowLeft, Loader2, CheckCircle2, Plus, ShieldAlert, MessageCircle, Building2, LogOut, Trash2, ShieldCheck, Settings, Users, Lock, Save, CheckCircle, X, Zap
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

                // CANAL  UNICO (10s): Solo invitaciones del dia (Alta velocidad)
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
        const today = getLocalDate();
        const { data } = await supabase
          .from('invitations')
          .select(`
                  *,
                          visitor_records (status, entry_at, full_name, dni, created_at)
                                `)
          .eq('owner_id', ownerId)
          .eq('expected_date', today);

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
                  setErrorDetails("No se pudo crear la invitacion automatica.");
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

        await fetchActiveInvitations(userProfile.id);
        setSubmitting(false);
        alert(`Invitacion automatica generada para ${visitor.full_name}. El guardia ya puede verlo en el sistema.`);
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
                        alert("No se encontraron registros biometricos previos para este invitado.");
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
                 setErrorDetails("No se pudo repetir la invitacion.");
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
          } else if (newUsername) {
                    throw new Error("El usuario debe tener al menos 6 caracteres.");
          }

          if (newPassword) {
                    if (newPassword.length < 6) throw new Error("La contrase na debe tener al menos 6 caracteres.");
                    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
                    if (authError) throw authError;
          }

          setSettingsSuccess("Configuracion actualizada correctamente.");
                setTimeout(() => setShowSettings(false), 2000);
        } catch (err: any) {
                setSettingsError(err.message || "Error al actualizar la configuracion.");
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
        }
  };

  const handleExpressAuthorization = async (inv: any) => {
        setSubmitting(true);
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
                              alert(`OK ${visitorData.full_name} fue autorizado automaticamente.`);
                              await fetchActiveInvitations(userProfile.id);
                              setSubmitting(false);
                              return;
                  }
                }
        }
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
          .insert([{ visitor_name: "Invitado a Identificar", expected_date: expectedDate, owner_id: userProfile.id }])
          .select().single();

        if (data) setInvitationLink(`${window.location.origin}/visitante/${data.id}`);
        setSubmitting(false);
  };

  const shareByWhatsApp = () => {
        if (!invitationLink) return;
        const message = `Hola! Aqui tienes tu pase para ingresar al Barrio Seguro: ${invitationLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const copyToClipboard = async () => {
        if (!invitationLink) return;
        await navigator.clipboard.writeText(invitationLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
  };

  const [copied, setCopied] = useState(false);

  const visibleInvitations = activeInvitations.filter(inv => {
        const rec = inv.visitor_records?.[0];
        const invName = rec?.full_name || inv.visitor_name || "Invitado a Identificar";
        const cleanName = invName.replace(/ \[.*\]/, "");
        const matchesSearch = cleanName.toLowerCase().includes(activeSearchTerm.toLowerCase()) || (rec?.dni || inv.visitor_dni || "").includes(activeSearchTerm);
        return matchesSearch && !(cleanName === "Invitado a Identificar" && !inv.visitor_dni && (rec?.status || 'no_registered') === 'no_registered');
  });

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center font-black"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin" /></div>div>;
  
    return (
          <div className="min-h-screen bg-slate-950 text-white font-sans p-6 md:p-12 relative overflow-hidden">
                  <h1 className="text-3xl font-black mb-4">Panel de Propietario</h1>h1>
                  <p className="text-slate-400 mb-8">Genera y administra pases de acceso.</p>p>
          </div>div>
        );
}
</div>
