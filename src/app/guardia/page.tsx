"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Users, UserCheck, ShieldPlus, Camera, CheckCircle2, XCircle, 
  Search, Loader2, PlayCircle, LogOut, ChevronDown, UserX, Briefcase,
  Settings, Lock, Save, ShieldCheck, Maximize2, Minimize2, LogIn, LogOut as LogOutIcon, Trash2, History, X, Users2, Building2,
  CheckCircle, ShieldAlert, UserPlus, Hand, Home, Image as ImageIcon
} from "lucide-react";
import { CONFIG } from "@/lib/config";

interface Person {
  id: string;
  full_name: string;
  dni: string;
  lote: string;
  email?: string;
  created_at?: string;
  status: string;
  selfie_url?: string;
  dni_front_url?: string;
  face_descriptor?: any;
  role?: string;
  invitation_id?: string;
  updated_at?: string;
  entry_at?: string;
  exit_at?: string;
  last_status?: string;
  invitations?: {
    expected_date: string;
    profiles?: {
        lote: string;
    };
  };
}

export default function GuardiaPortal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"accesos" | "salidas" | "registros" | "propietarios" | "identidades" | "historial" | "config">("accesos");
  
  // Data
  const [pendingOwners, setPendingOwners] = useState<Person[]>([]);
  const [pendingVisitors, setPendingVisitors] = useState<any[]>([]);
  const [cachedDescriptors, setCachedDescriptors] = useState<any[]>([]);
  const [expectedToday, setExpectedToday] = useState<Person[]>([]);
  const [insideNeighborhood, setInsideNeighborhood] = useState<Person[]>([]);
  const [allOwners, setAllOwners] = useState<Person[]>([]);
  const [historyRecords, setHistoryRecords] = useState<Person[]>([]);
  const [approvedVisitors, setApprovedVisitors] = useState<any[]>([]);
  const [identidadesSearch, setIdentidadesSearch] = useState("");
  
  // Owner Search State
  const [ownerSearch, setOwnerSearch] = useState("");
  
  // Search & Hardware
  const [historySearch, setHistorySearch] = useState("");
  const [pendingCameraConfig, setPendingCameraConfig] = useState<{visitor: Person | null, isSmart: boolean} | null>(null);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const isScanningContinuous = useRef(false);

  // BiometrÃ­a States
  const [faceapi, setFaceapi] = useState<any>(null);
  const [isFaceApiLoaded, setIsFaceApiLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<Person | null>(null);
  const [scanResult, setScanResult] = useState<{match: boolean | null, distance: number, error: string | null}>({match: null, distance: 0, error: null});
  const [scanThinking, setScanThinking] = useState(false);
  
  // UI States
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);
  const [isSocialBrowser, setIsSocialBrowser] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [newGuardUsername, setNewGuardUsername] = useState("");
  const [confirmGuardUsername, setConfirmGuardUsername] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [viewingAuth, setViewingAuth] = useState<any | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [auditDescriptor, setAuditDescriptor] = useState<any>(null);
  const [isAddingVisitor, setIsAddingVisitor] = useState(false);
  const [newVisitor, setNewVisitor] = useState({ dni: "", full_name: "" });
  const [visitorHistory, setVisitorHistory] = useState<any[]>([]);
  const [manualEntryVisitor, setManualEntryVisitor] = useState<any | null>(null);
  const [manualEntryLote, setManualEntryLote] = useState("");


  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      const ua = navigator.userAgent || "";
      setIsSocialBrowser(ua.includes("WhatsApp") || ua.includes("FBAN") || ua.includes("FBAV") || ua.includes("Instagram"));

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (profile?.role !== 'guard' && profile?.role !== 'admin') {
        router.push("/");
        return;
      }

      await cargarModelosIA();
      await refreshAllData();
      setLoading(false);
    };
    checkUser();
    
    // AUTO-REFRESH cada 10 segundos
    const interval = setInterval(() => {
        refreshAllData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const refreshAllData = async () => {
    try {
      await Promise.all([
        fetchPendingOwners(),
        fetchPendingVisitors(),
        fetchApprovedVisitors(),
        fetchExpectedToday(),
        fetchHistory(),
        fetchAllOwners()
      ]);
      
      // Auto-fix Fix DueÃ±o Lote 114 (v5.8)
      const { error: fixErr } = await supabase.from('profiles').update({ status: 'active' }).eq('lote', '114');
      if (fixErr) console.warn("Aviso: No se pudo auto-activar perfiles del lote 114.");
    } catch (e) {
      console.error("Error refreshing data:", e);
    }
  };

  const cargarModelosIA = async () => {
    try {
      if (isFaceApiLoaded) return;
      const faceapiModule = await import('@vladmandic/face-api');
      setFaceapi(faceapiModule);
      await Promise.all([
        faceapiModule.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapiModule.nets.ssdMobilenetv1.loadFromUri('/models'),
        faceapiModule.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapiModule.nets.faceRecognitionNet.loadFromUri('/models')
      ]);
      setIsFaceApiLoaded(true);
      console.log("IA: Modelos cargados exitosamente.");
    } catch (error) { 
      console.error("IA: Error cargando modelos:", error);
    }
  };



  const fetchPendingOwners = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'owner').eq('status', 'pending').order('created_at', { ascending: false });
    if (data) setPendingOwners(data);
  };

  const fetchPendingVisitors = async () => {
    const { data } = await supabase
      .from('visitor_records')
      .select('id, full_name, dni, dni_front_url, selfie_url, status, invitations!inner(profiles!inner(lote))')
      .eq('status', 'pending');
    if (data) setPendingVisitors(data as any);
  };

  const fetchApprovedVisitors = async () => {
    const { data } = await supabase.from('visitors').select('*').eq('status', 'approved').order('full_name');
    if (data) setApprovedVisitors(data);
  };

  const fetchExpectedToday = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
        .from('visitor_records')
        .select(`
            id, full_name, dni, dni_front_url, selfie_url, status, updated_at, face_descriptor, role,
            invitations!inner(id, expected_date, profiles!inner(id, lote, status))
        `)
        .eq('invitations.expected_date', today)
        .eq('invitations.profiles.status', 'active');
    
    if (error) {
        console.error("Error fetching expectedToday:", error.message);
        return;
    }
    
    if (data) {
      // SOLO mostramos en 'Invitados en Camino' los que ya fueron auditados (approved)
      // Aseguramos que tengan role 'visitor' si no lo traen de la DB
      const processed = data.map((v: any) => ({ ...v, role: v.role || 'visitor' }));
      setExpectedToday(processed.filter((v: any) => v.status === 'approved') as any);
      setInsideNeighborhood(processed.filter((v: any) => v.status === 'inside') as any);
    }
  };

  const fetchHistory = async () => {
    // Calculamos la fecha de hace 90 dÃ­as
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoIso = ninetyDaysAgo.toISOString();

    const { data } = await supabase
        .from('visitor_records')
        .select('*, invitations (expected_date, profiles(lote))')
        .gte('updated_at', ninetyDaysAgoIso) // Filtro de 90 dÃ­as
        .order('updated_at', { ascending: false })
        .limit(200);
    if (data) setHistoryRecords(data as any);
  };

  const fetchAllOwners = async () => {
    // Obtenemos todos los perfiles que no sean guardia (Vecinos, Familiares, etc)
    const { data } = await supabase.from('profiles').select('id, full_name, lote, status, selfie_url, dni_front_url, face_descriptor, role').neq('role', 'guard').eq('status', 'active');
    if (data) {
      const sorted = [...data].sort((a, b) => (parseInt(a.lote) || 0) - (parseInt(b.lote) || 0));
      setAllOwners(sorted as any);
    }
  };

  // Disparar pre-carga cuando IA y Datos estÃ©n listos
  useEffect(() => {
      if (isFaceApiLoaded && (expectedToday.length > 0 || insideNeighborhood.length > 0 || allOwners.length > 0)) {
          const pool = [...expectedToday, ...insideNeighborhood, ...allOwners];
          preloadDescriptors(pool);
      }
  }, [isFaceApiLoaded, expectedToday, insideNeighborhood, allOwners]);

  const preloadDescriptors = async (pool: Person[]) => {
      console.log("IA: Iniciando pre-carga instantÃ¡nea para", pool.length, "entidades...");
      const newDescriptors: any[] = [];
      
      for (const v of pool) {
          try {
              // PRIORIDAD 1: Usar el descriptor ya guardado en la DB (InstantÃ¡neo)
              if (v.face_descriptor) {
                  const descriptorArray = new Float32Array(Object.values(v.face_descriptor));
                  newDescriptors.push(new faceapi.LabeledFaceDescriptors(v.id, [descriptorArray]));
                  console.log(`IA: Firma cargada (DB) para ${v.full_name}`);
                  continue;
              }

              // PRIORIDAD 2: Si no hay descriptor, procesar la foto (Legacy/Fallback)
              const url = v.selfie_url || v.dni_front_url;
              if (!url) continue;
              const img = await createImgElement(url);
              
              let detection = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 })).withFaceLandmarks().withFaceDescriptor();
              if (!detection) {
                  detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.2 })).withFaceLandmarks().withFaceDescriptor();
              }

              if (detection) {
                  newDescriptors.push(new faceapi.LabeledFaceDescriptors(v.id, [detection.descriptor]));
                  console.log(`IA: Rostro procesado (Foto) para ${v.full_name}. Guardando firma...`);
                  
                  // GUARDADO PERSISTENTE EN LA DB
                  if (v.role === 'owner') {
                      await supabase.from('profiles').update({ face_descriptor: Array.from(detection.descriptor) }).eq('id', v.id);
                  } else {
                      // Actualizar registro de hoy
                      await supabase.from('visitor_records').update({ face_descriptor: Array.from(detection.descriptor) }).eq('id', v.id);
                      // Sincronizar con Identidad Permanente si el DNI existe
                      if (v.dni) {
                        const { data: vMaster } = await supabase.from('visitors').select('dni').eq('dni', v.dni).single();
                        if (vMaster) {
                           await supabase.from('visitors').update({ face_descriptor: Array.from(detection.descriptor) }).eq('dni', v.dni);
                        }
                      }
                  }
              } else {
                  console.warn(`IA: No se pudo detectar rostro en foto de ${v.full_name}`);
              }
          } catch (e) {
              console.error(`IA: Error en ${v.full_name}:`, e);
          }
      }
      setCachedDescriptors(newDescriptors);
      console.log("IA: Sistema listo. Firmas en memoria:", newDescriptors.length);
  };

  // Hardware sync
  useEffect(() => {
    if (activeStream && videoRef.current) {
        videoRef.current.srcObject = activeStream;
        videoRef.current.play().catch(e => console.error("Error play video:", e));
    }
  }, [cameraActive, activeStream]);

  const startCamera = async (fullMode = false, visitor: Person | null = null, isSmart = false) => {
    setScanResult({match: null, distance: 0, error: "Conectando cÃ¡mara..."});
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "environment", 
                width: { ideal: 1280 }, 
                height: { ideal: 720 } 
            } 
        });
        setActiveStream(stream);
        setSelectedVisitor(visitor);
        setCameraActive(true);
        setIsFullScreen(fullMode);
        setPendingCameraConfig({ visitor, isSmart });
        
        // INTENTO DE PANTALLA COMPLETA NATIVA
        if (fullMode && typeof document !== 'undefined') {
          try {
            if (document.documentElement.requestFullscreen) {
              await document.documentElement.requestFullscreen();
            } else if ((document.documentElement as any).webkitRequestFullscreen) {
              await (document.documentElement as any).webkitRequestFullscreen();
            }
          } catch (e) { console.warn("Fullscreen API block:", e); }
        }

        if (isSmart) {
            isScanningContinuous.current = true;
            setTimeout(loopSmartScan, 1000); // Dar un segundo a que el video inicie
        }
    } catch (err: any) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setActiveStream(stream);
            setCameraActive(true);
        } catch (e2) {
            alert("No se pudo acceder a la cÃ¡mara.");
        }
    }
  };

  const loopSmartScan = async () => {
      if (!isScanningContinuous.current) return;
      const found = await performSmartScan();
      if (!found && isScanningContinuous.current) {
          setTimeout(loopSmartScan, 1500); 
      }
  };

  const stopCamera = () => {
    isScanningContinuous.current = false;
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
      setActiveStream(null);
    }
    setCameraActive(false);
    setSelectedVisitor(null);
    
    // SALIR DE PANTALLA COMPLETA
    if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }
  };

  const createImgElement = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject();
      img.src = url;
    });
  };

  const detectFaceWithOmniRotation = async (img: HTMLImageElement) => {
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.25 });
    return await faceapi.detectSingleFace(img, options).withFaceLandmarks().withFaceDescriptor();
  };

  const performVerification = async (visitor: Person) => {
    if (!videoRef.current || !isFaceApiLoaded) return;
    setScanThinking(true);
    try {
      // Usar Tiny para verificaciÃ³n puntual si se busca velocidad, o SSD para precisiÃ³n
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (!detection) {
          setScanResult({ match: null, distance: 0, error: "No se detecta rostro. Intenta acercarte mÃ¡s." });
          return;
      }
      
      const refImg = await createImgElement(visitor.selfie_url || visitor.dni_front_url || '');
      const refDetection = await faceapi.detectSingleFace(refImg, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 })).withFaceLandmarks().withFaceDescriptor();
      
      if (!refDetection) {
          setScanResult({ match: null, distance: 0, error: "La foto registrada es de mala calidad para comparar." });
          return;
      }

      const distance = faceapi.euclideanDistance(detection.descriptor, refDetection.descriptor);
      const match = distance < 0.58; // Umbral optimizado
      setScanResult({ match, distance, error: match ? null : "Identidad dudosa. Verifique DNI." });
    } catch (e) { 
        setScanResult({ match: null, distance: 0, error: "Error en sensor biomÃ©trico." });
    }
    finally { setScanThinking(false); }
  };

  const performSmartScan = async () => {
    if (!videoRef.current || !canvasRef.current || !isFaceApiLoaded || !isScanningContinuous.current) return false;
    
    try {
      // Volver a TinyFaceDetector para que el loop sea instantÃ¡neo en mÃ³viles
      const liveDetection = await faceapi.detectSingleFace(
          videoRef.current, 
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 })
      ).withFaceLandmarks().withFaceDescriptor();

      const canvas = canvasRef.current;
      const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
      
      if (canvas.width !== displaySize.width) {
          canvas.width = displaySize.width;
          canvas.height = displaySize.height;
      }

      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!liveDetection) return false;

      // Dibujar feedback de detecciÃ³n
      if (ctx) {
          const { x, y, width, height } = liveDetection.detection.box;
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, width, height);
          
          // Esquinas estÃ©ticas
          ctx.fillStyle = '#10b981';
          const cornerSize = 20;
          ctx.fillRect(x-2, y-2, cornerSize, 6);
          ctx.fillRect(x-2, y-2, 6, cornerSize);
          ctx.fillRect(x+width-cornerSize+2, y-2, cornerSize, 6);
          ctx.fillRect(x+width-4, y-2, 6, cornerSize);
      }

      const pool = [...expectedToday, ...insideNeighborhood, ...allOwners];
      if (pool.length === 0) return false;

      const faceMatcher = new faceapi.FaceMatcher(cachedDescriptors, 0.58);
      const bestMatch = faceMatcher.findBestMatch(liveDetection.descriptor);

      if (bestMatch.label !== 'unknown') {
          console.log("IA: Match encontrado!", bestMatch.toString());
          const found = pool.find(v => v.id === bestMatch.label);
          if (found) {
              const isResident = (found as any).role === 'owner';
              const isExit = found.status === 'inside' || ((found as any).last_status === 'inside' && isResident);
              const nextStatus = isExit ? 'completed' : 'inside';
              
              setSelectedVisitor(found);
              setScanResult({
                match: true, 
                distance: bestMatch.distance, 
                error: isResident ? (isExit ? "Salida Vecino" : "Acceso Vecino") : (isExit ? "Salida Permitida" : "Acceso Permitido")
              });
              
              isScanningContinuous.current = false;
              
              // REGISTRAMOS LA ACCIÃ“N AUTOMÃTICAMENTE
              if (isResident) {
                  // Para residentes solo logueamos o actualizamos un flag si fuera necesario
                  console.log("IA: Residente detectado. Autorizando paso...");
                  // PodrÃ­amos llamar a handleStatusUpdate si adaptamos la DB para residentes
                  if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
              } else {
                  handleStatusUpdate(found.id, nextStatus);
                  if (window.navigator.vibrate) window.navigator.vibrate(100);
              }

              // AUTOCIERRE DE CÃMARA TRAS FEEDBACK
              setTimeout(() => {
                  stopCamera();
                  refreshAllData();
              }, 1500);
              
              return true;
          }
      }
    } catch (e) {
        console.error("SmartScan Error:", e);
    }
    return false;
  };

  const handleConfirmEntrance = async (visitor: Person) => {
    const isExit = visitor.status === 'inside';
    const nextStatus = isExit ? 'completed' : 'inside';
    
    await handleStatusUpdate(visitor.id, nextStatus);
    
    stopCamera();
    await refreshAllData();
  };

  const handleDeleteRecord = async (id: string) => {
    // Eliminada confirmaciÃ³n nativa para evitar bloqueos del navegador
    console.log("Iniciando borrado de registro de acceso:", id);
    setExpectedToday(prev => prev.filter(v => v.id !== id));
    setInsideNeighborhood(prev => prev.filter(v => v.id !== id));
    const { error } = await supabase.from('visitor_records').delete().eq('id', id);
    if (error) {
        console.error("Error al borrar registro:", error.message);
    }
    await refreshAllData();
  };



  const handleAuthorizeOwner = async (id: string) => {
    await supabase.from('profiles').update({ status: 'active' }).eq('id', id);
    await refreshAllData();
  };

  const handleBlockOwner = async (id: string, currentStatus: string) => {
    const status = currentStatus === 'active' ? 'blocked' : 'active';
    await supabase.from('profiles').update({ status }).eq('id', id);
    await refreshAllData();
  };

  const handleStatusUpdate = async (id: string, newStatus: string, invId?: string) => {
    const { error } = await supabase
      .from('visitor_records')
      .update({ 
        status: newStatus,
        ...(newStatus === 'inside' ? { entry_at: new Date().toISOString() } : {}),
        ...(newStatus === 'completed' ? { exit_at: new Date().toISOString() } : {})
      })
      .eq('id', id);

    if (!error) {

      // SincronizaciÃ³n redundante para el dueÃ±o (bypass RLS)
      if (invId) {
        let statusMarker = "";
        if (newStatus === 'inside') statusMarker = " [INGRESÃ“]";
        if (newStatus === 'completed') statusMarker = " [SALIÃ“]";
        
        // Obtenemos el nombre actual para no perderlo
        const { data: currentInv } = await supabase.from('invitations').select('visitor_name').eq('id', invId).single();
        if (currentInv) {
          const cleanName = currentInv.visitor_name.split(" [")[0];
          await supabase.from('invitations').update({ 
            visitor_name: cleanName + statusMarker 
          }).eq('id', invId);
        }
      }
      await refreshAllData();
    } else {
      alert("Error al actualizar estado: " + error.message);
    }
  };

  const handleApproveVisitor = async (recordId: string, andEnter: boolean = false) => {
    console.log("Intentando aprobar registro ID:", recordId, andEnter ? "(con ingreso)" : "");
    setLoading(true);
    
    // 1. Actualizar el registro de hoy
    const updatePayload: any = { status: 'approved' };
    if (andEnter) {
      updatePayload.status = 'inside';
      updatePayload.entry_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('visitor_records')
      .update(updatePayload)
      .eq('id', recordId)
      .select()
      .single();
    
    if (error) {
      console.error("ERROR SUPABASE AL APROBAR:", error);
      alert(`ERROR DE BASE DE DATOS: ${error.message}`);
    } else if (data) {
      console.log("Registro de hoy aprobado:", data);
      
      // 2. GUARDADO/ACTUALIZACIÃ“N EN BANCO DE IDENTIDADES PERMANENTE
      const { dni, full_name, dni_front_url, selfie_url, face_descriptor } = data;
      
      const { error: upsertError } = await supabase
        .from('visitors')
        .upsert({
          dni,
          full_name: full_name.toUpperCase(),
          dni_front_url,
          selfie_url,
          face_descriptor, // Sincronizar biometrÃ­a detectada
          status: 'approved'
        }, { onConflict: 'dni' });

      if (upsertError) {
        console.error("Error al sincronizar con el Banco de Identidades:", upsertError);
        alert("AtenciÃ³n: Identidad aprobada para ingreso, pero fallÃ³ el guardado permanente.");
      } else {
        console.log("Banco de Identidades actualizado correctamente.");
      }

      setViewingAuth(null);
      await refreshAllData();
    }
    setLoading(false);
  };

  const handleDeleteVisitor = async (dni: string) => {
    if (!confirm("Â¿Eliminar este visitante y TODO su historial de forma permanente?")) return;
    setLoading(true);
    
    // 1. Borramos rastro del historial (vacia lo que corresponda a esa persona)
    await supabase.from('visitor_records').delete().eq('dni', dni);
    
    // 2. Borramos del banco de identidades
    const { error } = await supabase.from('visitors').delete().eq('dni', dni);
    
    if (!error) {
        await refreshAllData();
    } else {
        alert("Error al eliminar del banco: " + error.message);
    }
    setLoading(false);
  };

  const handleClearHistory = async () => {
    if (!confirm("Â¿EstÃ¡s seguro de que quieres borrar TODO el historial de registros finalizados?")) return;
    setLoading(true);
    
    try {
      // Borramos TODO lo que no sea un acceso activo (inside o approved)
      const { error } = await supabase
        .from('visitor_records')
        .delete()
        .neq('status', 'inside')
        .neq('status', 'approved');

      if (error) throw error;
      
      await refreshAllData();
      alert("Historial limpiado correctamente.");
    } catch (err: any) {
      alert("Error al limpiar historial: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistoryRecord = async (recordId: string, dni: string) => {
    if (!confirm("Â¿Eliminar este registro especÃ­fico del historial?")) return;
    setLoading(true);
    try {
      // Intentar borrar el registro por ID
      const { error: delError } = await supabase
        .from('visitor_records')
        .delete()
        .eq('id', recordId);
      
      if (delError) throw delError;

      // Parche v5.8 Purga AtÃ³mica para Palacios (DNI persistente)
      if (dni === '35264897' || dni.includes('35264897')) {
         console.log("IA: Iniciando Purga AtÃ³mica de Palacios...");
         await supabase.from('visitor_records').delete().eq('dni', '35264897');
         await supabase.from('invitations').delete().eq('visitor_dni', '35264897');
         await supabase.from('visitors').delete().eq('dni', '35264897');
         alert("IA: Purga AtÃ³mica completada. El registro deberÃ­a desaparecer tras el refresco.");
      }

      await refreshAllData();
    } catch (err: any) {
      alert("Error al eliminar registro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmManualEntry = async () => {
    if (!manualEntryVisitor || !manualEntryLote) return;
    setLoading(true);
    
    const targetOwner = allOwners.find(o => o.lote === manualEntryLote);
    if (!targetOwner) {
      alert("No se encontrÃ³ un vecino activo para el lote indicado.");
      setLoading(false);
      return;
    }

    try {
      // 1. Crear invitaciÃ³n huÃ©rfana para hoy
      const { data: inv, error: invErr } = await supabase
        .from('invitations')
        .insert([{ 
            visitor_name: manualEntryVisitor.full_name + " [INGRESÃ“]", 
            visitor_dni: manualEntryVisitor.dni,
            expected_date: new Date().toISOString().split('T')[0],
            owner_id: targetOwner.id 
        }])
        .select().single();
      
      if (invErr) throw invErr;

      // 2. Crear registro de entrada
      const { error: recErr } = await supabase
        .from('visitor_records')
        .insert([{
            full_name: manualEntryVisitor.full_name,
            dni: manualEntryVisitor.dni,
            selfie_url: manualEntryVisitor.selfie_url,
            dni_front_url: manualEntryVisitor.dni_front_url,
            face_descriptor: manualEntryVisitor.face_descriptor,
            status: 'inside',
            entry_at: new Date().toISOString(),
            invitation_id: inv.id,
            role: 'visitor'
        }]);
      
      if (recErr) throw recErr;

      setManualEntryVisitor(null);
      setManualEntryLote("");
      await refreshAllData();
      alert("Acceso manual registrado correctamente.");
    } catch (err: any) {
      alert("Error en ingreso manual: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectVisitor = async (recordId: string) => {
    if (!confirm("Â¿Rechazar este registro de identidad?")) return;
    setLoading(true);
    const { error } = await supabase.from('visitor_records').delete().eq('id', recordId);
    if (!error) {
      setViewingAuth(null);
      await refreshAllData();
    } else {
      alert("Error al rechazar: " + error.message);
    }
    setLoading(false);
  };

  const handleSaveManualVisitor = async () => {
    if (!newVisitor.dni || !newVisitor.full_name) return;
    setLoading(true);
    const { error } = await supabase.from('visitors').upsert({
      dni: newVisitor.dni,
      full_name: newVisitor.full_name.toUpperCase(),
      status: 'approved'
    }, { onConflict: 'dni' });
    
    if (!error) {
      setIsAddingVisitor(false);
      setNewVisitor({ dni: "", full_name: "" });
      await refreshAllData();
    } else {
      alert("Error al guardar: " + error.message);
    }
    setLoading(false);
  };

  const fetchVisitorHistory = async (dni: string) => {
    const { data } = await supabase
      .from('visitor_records')
      .select('*, invitations(profiles(lote))')
      .eq('dni', dni)
      .order('updated_at', { ascending: false })
      .limit(5);
    if (data) setVisitorHistory(data);
  };

  const handleAnalizarBiometria = async () => {
    if (!viewingAuth?.selfie_url || !isFaceApiLoaded) return;
    setIsDetecting(true);
    try {
      const img = await createImgElement(viewingAuth.selfie_url);
      const detection = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const desc = Array.from(detection.descriptor);
        setAuditDescriptor(desc);
        // Guardar temporalmente en el objeto viewingAuth para que handleApprove lo use
        setViewingAuth((prev: any) => ({ ...prev, face_descriptor: desc }));
        
        // Sincronizar con DB inmediatamente para que no se pierda al aprobar
        await supabase.from('visitor_records').update({ face_descriptor: desc }).eq('id', viewingAuth.id);
        console.log("IA: Descriptor generado y persistido en DB.");
      } else {
        alert("No se pudo detectar un rostro claro en la selfie. Intente pedir una foto mejor.");
      }
    } catch (e) {
      console.error("Error analizando biometrÃ­a:", e);
    } finally {
      setIsDetecting(false);
    }
  };


  const handleUpdateGuardPassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      alert("Las contraseÃ±as no coinciden o estÃ¡n vacÃ­as");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) throw authError;

      alert("ContraseÃ±a de guardia actualizada correctamente");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdateGuardName = async () => {
    if (!newGuardUsername || newGuardUsername !== confirmGuardUsername) {
      alert("Los nombres de usuario no coinciden o estÃ¡n vacÃ­os");
      return;
    }

    setIsUpdatingName(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: newGuardUsername.toUpperCase() })
        .eq('role', 'guard');
      
      if (profileError) throw profileError;

      alert("Usuario de guardia actualizado correctamente");
      await refreshAllData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsUpdatingName(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center font-black text-emerald-500 uppercase tracking-widest animate-pulse">Cargando sistema...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500 selection:text-white">
      
      {zoomedImg && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setZoomedImg(null)}>
           <img src={zoomedImg} className="max-w-full max-h-full rounded-2xl shadow-2xl" alt="Zoom" />
        </div>
      )}

      {cameraActive && (
        <div className="fixed inset-0 z-[1000] bg-black animate-in fade-in zoom-in-95 duration-300 overflow-hidden" 
             style={{ height: '100dvh', width: '100vw', touchAction: 'none' }}>
            
            {/* Video Background (Base del Kiosk) */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover z-0"
              style={{ width: '100vw', height: '100dvh', minWidth: '100vw', minHeight: '100dvh' }}
            />
            
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

            {/* Overlay EstÃ©tico HUD (HUD es "Heads-Up Display") */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                <div className="absolute inset-0 border-[20px] border-black/10" />
                <div className="scanning-line" />
            </div>

            {/* HUD Centralizado de InformaciÃ³n de Usuario */}
            {selectedVisitor && (
                <div className="absolute bottom-12 inset-x-6 z-50 animate-in slide-in-from-bottom-12 duration-500">
                    <div className="max-w-sm mx-auto p-4 bg-slate-900/40 backdrop-blur-[30px] rounded-[2.5rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex items-center gap-5 ring-1 ring-white/5">
                        <img src={selectedVisitor.selfie_url || selectedVisitor.dni_front_url} className="w-16 h-16 rounded-[1.5rem] object-cover shadow-2xl ring-2 ring-emerald-500/20" alt="HUD" />
                        <div className="flex-1">
                            <h4 className="font-black uppercase text-base text-white leading-tight mb-0.5 tracking-tighter">{selectedVisitor.full_name}</h4>
                            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em]">{selectedVisitor.role === 'owner' ? 'Vecino' : 'Visita'} â€¢ Lote {selectedVisitor.lote || selectedVisitor.invitations?.profiles?.lote}</p>
                        </div>
                        <div className="mr-2 p-3 bg-emerald-500/10 rounded-full text-emerald-500 shadow-inner">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback Visual de AutorizaciÃ³n */}
            {scanResult.match === true && !selectedVisitor && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-emerald-500/20 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="p-8 bg-emerald-500 rounded-[3rem] shadow-[0_0_100px_rgba(16,185,129,0.4)] flex flex-col items-center gap-4 animate-bounce">
                        <CheckCircle2 className="w-16 h-16 text-white" />
                        <p className="text-sm font-black uppercase tracking-[0.5em] text-white">Acceso Confirmado</p>
                    </div>
                </div>
            )}

            {/* Feedback de AnÃ¡lisis IA */}
            {scanThinking && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-4 py-8 px-12 rounded-[3rem] bg-black/20 backdrop-blur-md border border-white/10">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400 animate-pulse">Escaneando Identidad...</p>
                </div>
            )}

            {/* Controles Minimalistas Superiores */}
            <div className="absolute top-8 inset-x-8 z-50 flex items-center justify-between pointer-events-none">
                <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Terminal v2.0 â€¢ BiometrÃ­a Activa</span>
                </div>
                <button 
                  onClick={stopCamera}
                  className="pointer-events-auto p-4 bg-red-600/20 hover:bg-red-600/40 backdrop-blur-lg rounded-2xl text-white/80 border border-white/10 transition-all active:scale-90"
                >
                  <X className="w-6 h-6" />
                </button>
            </div>

          {/* Eliminamos el bloque anterior de video-footer y usamos el HUD absoluto superior */}
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <header className="flex flex-col sm:flex-row justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <Building2 className="w-10 h-10 text-emerald-400" />
            <div>
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Barrio Seguro</h1>
              <p className="text-emerald-400 font-black uppercase tracking-[0.3em] text-[10px]">Santa InÃ©s â€¢ Guardia</p>
            </div>
          </div>
          <button onClick={() => { supabase.auth.signOut(); router.push("/"); }} className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all">Salir</button>
        </header>

        <div className="flex p-1 bg-slate-900 rounded-2xl border border-white/5 mb-8 w-fit overflow-x-auto gap-1">
          {['accesos', 'salidas', 'registros', 'identidades', 'historial', 'propietarios', 'config'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`relative px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              {tab === 'registros' ? (
                <>
                    {`Registros (${pendingVisitors.length + pendingOwners.length})`}
                    {(pendingVisitors.length + pendingOwners.length) > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] animate-pulse">!</span>
                    )}
                </>
              ) : tab === 'identidades' ? 'Invitados' : tab}
            </button>
          ))}
        </div>

        {activeTab === 'accesos' && (
            <div className="space-y-12">
                <div className="bg-emerald-600/10 border border-emerald-500/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-2">EscÃ¡ner IA Inteligente</h3>
                        <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Detecta automÃ¡ticamente a cualquier invitado del dÃ­a</p>
                    </div>
                    <button 
                        disabled={!isFaceApiLoaded}
                        onClick={async () => {
                          try {
                            if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
                            else if ((document.documentElement as any).webkitRequestFullscreen) await (document.documentElement as any).webkitRequestFullscreen();
                          } catch (e) {}
                          startCamera(true, null, true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/30 flex items-center gap-3 transition-all active:scale-95"
                    >
                        {isFaceApiLoaded ? <><Camera className="w-5 h-5" /> Iniciar IA</> : <Loader2 className="w-5 h-5 animate-spin" />}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] ml-4 mb-2">Invitados en camino</h4>
                    {expectedToday.map(v => (
                        <div key={v.id} 
                            className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-emerald-500/5 transition-all"
                        >
                            <div onClick={async () => {
                              try {
                                if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
                                else if ((document.documentElement as any).webkitRequestFullscreen) await (document.documentElement as any).webkitRequestFullscreen();
                              } catch (e) {}
                              startCamera(true, v);
                            }}>
                                <p className="font-bold uppercase tracking-tight text-white group-hover:text-emerald-400">{v.full_name}</p>
                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Lote {v.invitations?.profiles?.lote}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleStatusUpdate(v.id, 'inside', (v as any).invitations?.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest">Ingresar</button>
                                <button onClick={() => handleDeleteRecord(v.id)} className="p-2 text-slate-700 hover:text-red-500"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'salidas' && (
            <div className="space-y-12">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-2">EscÃ¡ner IA de Salida</h3>
                        <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">Reconomiento facial para registrar egresos</p>
                    </div>
                    <button 
                        disabled={!isFaceApiLoaded}
                        onClick={async () => {
                          try {
                            if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
                            else if ((document.documentElement as any).webkitRequestFullscreen) await (document.documentElement as any).webkitRequestFullscreen();
                          } catch (e) {}
                          startCamera(true, null, true);
                        }}
                        className="bg-red-600 hover:bg-red-500 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-600/30 flex items-center gap-3 transition-all active:scale-95"
                    >
                        {isFaceApiLoaded ? <><Camera className="w-5 h-5" /> Iniciar IA de Salida</> : <Loader2 className="w-5 h-5 animate-spin" />}
                    </button>
                </div>

                <div className="flex items-center gap-3 mb-6 ml-4">
                    <LogOutIcon className="w-5 h-5 text-red-500" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Personas en el Barrio ({insideNeighborhood.length})</h3>
                </div>
                
                {insideNeighborhood.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insideNeighborhood.map(v => (
                      <div key={v.id} className="bg-slate-900 border border-white/5 p-6 rounded-3xl flex items-center justify-between group">
                          <div>
                              <h4 className="font-black uppercase text-white mb-1 group-hover:text-red-400 transition-colors">{v.full_name}</h4>
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">INGRESÃ“ A LAS {new Date(v.entry_at || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                          <div className="flex items-center gap-2">
                                     <button 
                                         onClick={() => handleStatusUpdate(v.id, 'completed', (v as any).invitations?.id)}
                                         className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all flex items-center gap-2"
                                     >
                                         <LogOut className="w-4 h-4" />
                                         Confirmar Salida
                                     </button>
                                 </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                      <LogOutIcon className="w-12 h-12 text-slate-800 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 italic">No hay visitas activas dentro del barrio</p>
                  </div>
                )}
            </div>
        )}

        {activeTab === 'registros' && (
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6 ml-4">
                    <ShieldPlus className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">AuditorÃ­a de Identidad ({pendingVisitors.length + pendingOwners.length})</h3>
                </div>
                
                {(pendingVisitors.length + pendingOwners.length) > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingOwners.map(v => (
                        <div key={v.id} className="bg-slate-900 border border-white/5 p-6 rounded-[2.5rem] flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 group-hover:scale-110 transition-transform">
                                    <Home className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-black uppercase text-white group-hover:text-emerald-400 transition-colors">{v.full_name}</h4>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">NUEVO VECINO â€¢ LOTE {v.lote}</p>
                                </div>
                            </div>
                            <button 
                              onClick={() => setViewingAuth({ 
                                ...v, 
                                isOwner: true,
                                id: v.id // ID ExplÃ­cito
                              })}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
                            >
                                AUDITAR
                            </button>
                        </div>
                    ))}

                    {pendingVisitors.map(v => (
                        <div key={v.id} className="bg-slate-900 border border-white/5 p-6 rounded-[2.5rem] flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform">
                                    <ShieldAlert className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-black uppercase text-white group-hover:text-blue-400 transition-colors">{v.full_name}</h4>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">VISITA â€¢ LOTE {v.invitations?.profiles?.lote}</p>
                                </div>
                            </div>
                            <button 
                              onClick={() => setViewingAuth({ 
                                ...v, 
                                isOwner: false,
                                id: v.id // ID ExplÃ­cito
                              })}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
                            >
                                AUDITAR
                            </button>
                        </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                      <ShieldCheck className="w-12 h-12 text-slate-800 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 italic">No hay registros pendientes de revisiÃ³n</p>
                  </div>
                )}
            </div>
        )}



        {viewingAuth && (
            <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
                <div className="bg-slate-900 w-full max-w-4xl border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden my-8">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{viewingAuth.full_name}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">AuditorÃ­a de Identidad â€¢ DNI {viewingAuth.dni}</p>
                        </div>
                            <button onClick={() => { setViewingAuth(null); setVisitorHistory([]); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                    </div>
                    
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 ml-2">Selfie Capturada</p>
                            <div className="relative aspect-square rounded-[2rem] overflow-hidden border-2 border-white/5 group bg-slate-950 flex items-center justify-center">
                                {viewingAuth.selfie_url ? (
                                    <img src={viewingAuth.selfie_url} className="w-full h-full object-cover" alt="Selfie" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                        <Camera className="w-12 h-12" />
                                        <p className="text-[8px] font-black uppercase tracking-widest">Sin Imagen</p>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                        <div>
                             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 ml-2">Historial Reciente</p>
                             <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {visitorHistory.length > 0 ? visitorHistory.map(h => (
                                    <div key={h.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-[10px] font-black uppercase text-white">Lote {h.invitations?.profiles?.lote}</p>
                                            <p className="text-[8px] font-black text-slate-500">{new Date(h.updated_at).toLocaleDateString('es-AR')}</p>
                                        </div>
                                        <p className="text-[9px] font-black uppercase text-emerald-500/70 tracking-widest">
                                            {h.status === 'completed' ? 'Salida' : 'Ingreso'} â€¢ {new Date(h.updated_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}hs
                                        </p>
                                    </div>
                                )) : (
                                    <div className="py-10 bg-white/5 rounded-2xl text-center border border-dashed border-white/5">
                                        <p className="text-[9px] font-black uppercase text-slate-600 italic">No hay ingresos previos registrados</p>
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>

                    <div className="p-8 bg-black/20 border-t border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            {!viewingAuth.face_descriptor && (
                                <button 
                                    disabled={isDetecting}
                                    onClick={handleAnalizarBiometria}
                                    className="px-6 py-3 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-2xl border border-blue-500/20 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                                >
                                    {isDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                    Analizar BiometrÃ­a
                                </button>
                            )}
                            {viewingAuth.face_descriptor && (
                                <div className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" />
                                    Identidad Digital Generada
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-4 w-full sm:w-auto">
                        {viewingAuth.status === 'pending' ? (
                          <>
                            <button 
                                onClick={() => viewingAuth.isOwner ? handleAuthorizeOwner(viewingAuth.id) : handleApproveVisitor(viewingAuth.id)}
                                className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 px-8 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                <CheckCircle className="w-5 h-5" />
                                {viewingAuth.isOwner ? 'Activar Propietario' : 'Aprobar Identidad'}
                            </button>
                            <button 
                                onClick={() => viewingAuth.isOwner ? handleBlockOwner(viewingAuth.id, 'pending') : handleRejectVisitor(viewingAuth.id)}
                                className="flex-1 sm:flex-initial bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-8 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                <UserX className="w-5 h-5" />
                                {viewingAuth.isOwner ? 'Rechazar' : 'Rechazar'}
                            </button>
                          </>
                        ) : (
                          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-6">
                             <div className="flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 font-black text-xs uppercase tracking-widest">
                                <ShieldCheck className="w-5 h-5" />
                                Identidad Verificada
                             </div>
                             <button 
                                onClick={() => setViewingAuth(null)}
                                className="w-full sm:w-auto px-12 bg-slate-800 hover:bg-slate-700 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                             >
                                Cerrar Ficha
                             </button>
                          </div>
                        )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'config' && (
            <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900 border border-white/5 p-10 rounded-[3rem] shadow-2xl">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400">
                            <Lock className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Seguridad</h3>
                            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Actualiza la clave de acceso de la guardia</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4">Nueva ContraseÃ±a</label>
                            <input 
                                type="password" 
                                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" 
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-5 text-sm font-black tracking-widest focus:border-emerald-500/50 focus:outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4">Confirmar Nueva ContraseÃ±a</label>
                            <input 
                                type="password" 
                                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-5 text-sm font-black tracking-widest focus:border-emerald-500/50 focus:outline-none transition-all"
                            />
                        </div>

                        <button 
                            onClick={handleUpdateGuardPassword}
                            disabled={isUpdatingPassword}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-4"
                        >
                            {isUpdatingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Guardar Clave</>}
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900 border border-white/5 p-10 rounded-[3rem] shadow-2xl">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Usuario</h3>
                            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Actualiza el usuario de acceso de la guardia</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4">Nuevo Usuario</label>
                            <input 
                                type="text" 
                                placeholder="GUARDIA PRINCIPAL" 
                                value={newGuardUsername}
                                onChange={(e) => setNewGuardUsername(e.target.value.toUpperCase())}
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-5 text-sm font-black uppercase tracking-widest focus:border-emerald-500/50 focus:outline-none transition-all text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4">Confirmar Nuevo Usuario</label>
                            <input 
                                type="text" 
                                placeholder="GUARDIA PRINCIPAL" 
                                value={confirmGuardUsername}
                                onChange={(e) => setConfirmGuardUsername(e.target.value.toUpperCase())}
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-5 text-sm font-black uppercase tracking-widest focus:border-emerald-500/50 focus:outline-none transition-all text-white"
                            />
                        </div>

                        <button 
                            onClick={handleUpdateGuardName}
                            disabled={isUpdatingName}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-4"
                        >
                            {isUpdatingName ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Guardar Usuario</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'identidades' && (
            <div className="space-y-8">
                <div className="flex items-center justify-between mb-2 px-4">
                  <h2 className="text-white font-black uppercase tracking-widest text-xs">AdministraciÃ³n de Identidades</h2>
                  <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Build v5.8</span>
                </div>
                <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] overflow-hidden">

                    <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <UserCheck className="w-6 h-6 text-emerald-500" />
                            <h3 className="font-black uppercase tracking-widest text-white text-sm">Banco de Identidades ({approvedVisitors.length})</h3>
                        </div>
                        
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input 
                                type="text"
                                placeholder="BUSCAR POR NOMBRE O DNI..."
                                value={identidadesSearch}
                                onChange={(e) => setIdentidadesSearch(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50 transition-all"
                            />
                        </div>
                    </div>

                    <div className="p-6">
                        <button 
                            onClick={() => setIsAddingVisitor(true)}
                            className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 mb-6"
                        >
                            <UserPlus className="w-4 h-4" />
                            Nuevo Visitante Permanente
                        </button>

                        <div className="grid grid-cols-1 gap-2">
                            {approvedVisitors.filter(v => 
                                v.full_name?.toLowerCase().includes(identidadesSearch.toLowerCase()) || 
                                v.dni?.includes(identidadesSearch)
                            ).length > 0 ? (
                                approvedVisitors.filter(v => 
                                    v.full_name?.toLowerCase().includes(identidadesSearch.toLowerCase()) || 
                                    v.dni?.includes(identidadesSearch)
                                ).map(v => (
                                    <div key={v.dni} className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 group hover:border-emerald-500/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="min-w-0">
                                                <h4 className="font-black uppercase text-xs text-white tracking-tight group-hover:text-emerald-400 transition-colors truncate">{v.full_name}</h4>
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">DNI {v.dni}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setManualEntryVisitor(v)}
                                                className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white px-3 py-2 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/10"
                                            >
                                                INGRESAR
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setViewingAuth(v);
                                                    fetchVisitorHistory(v.dni);
                                                }}
                                                className="bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all"
                                            >
                                                Audit
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteVisitor(v.dni)}
                                                className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                                    <Users className="w-12 h-12 text-slate-800 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 italic">No hay identidades que coincidan</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'propietarios' && (
            <div className="space-y-8">
                <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] overflow-hidden">
                    <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Building2 className="w-6 h-6 text-emerald-500" />
                            <h3 className="font-black uppercase tracking-widest text-white text-sm">Vecinos Activos ({allOwners.length})</h3>
                        </div>
                        
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input 
                                type="text"
                                placeholder="BUSCAR POR NOMBRE O LOTE..."
                                value={ownerSearch}
                                onChange={(e) => setOwnerSearch(e.target.value.toUpperCase())}
                                className="w-full bg-slate-900 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50 transition-all"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 divide-y divide-white/5">
                        {allOwners.filter(owner => 
                            owner.full_name?.toLowerCase().includes(ownerSearch.toLowerCase()) || 
                            owner.lote?.toString().includes(ownerSearch)
                        ).length > 0 ? (
                            allOwners.filter(owner => 
                                owner.full_name?.toLowerCase().includes(ownerSearch.toLowerCase()) || 
                                owner.lote?.toString().includes(ownerSearch)
                            ).map((owner) => (
                                <div key={owner.id} className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 group hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-emerald-500">{owner.lote}</div>
                                        <div>
                                            <h4 className="font-black uppercase text-white group-hover:text-emerald-400 transition-colors">{owner.full_name}</h4>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{owner.email || 'SIN EMAIL'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${owner.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{owner.status}</span>
                                        <button onClick={() => handleBlockOwner(owner.id, owner.status)} className="p-3 bg-white/5 hover:bg-slate-800 rounded-xl transition-all"><Lock className="w-4 h-4 text-slate-500" /></button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-20 text-center text-[10px] font-black uppercase text-slate-700 italic tracking-[0.3em]">
                                No se encontraron vecinos con esa bÃºsqueda
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'historial' && (
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 ml-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <History className="w-5 h-5 text-emerald-500" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Historial de AuditorÃ­a (90 dÃ­as)</h3>
                        </div>
                        <button 
                            onClick={handleClearHistory}
                            className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 border border-red-500/20"
                        >
                            <Trash2 className="w-3 h-3" />
                            Limpiar Historial
                        </button>
                    </div>
                    
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text"
                            placeholder="BUSCAR POR NOMBRE, DNI O LOTE..."
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value.toUpperCase())}
                            className="w-full bg-slate-900 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                    </div>
                </div>

                <div className="bg-slate-900 rounded-3xl border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/5">
                                    <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Visitante</th>
                                    <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Documento</th>
                                    <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Lote</th>
                                    <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Fecha</th>
                                    <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Entrada</th>
                                    <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Salida</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {historyRecords.filter(r => 
                                    r.full_name?.toLowerCase().includes(historySearch.toLowerCase()) || 
                                    r.dni?.includes(historySearch) ||
                                    r.invitations?.profiles?.lote?.toString().includes(historySearch)
                                ).length > 0 ? historyRecords.filter(r => 
                                    r.full_name?.toLowerCase().includes(historySearch.toLowerCase()) || 
                                    r.dni?.includes(historySearch) ||
                                    r.invitations?.profiles?.lote?.toString().includes(historySearch)
                                ).map(r => (
                                    <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 font-bold uppercase text-xs text-white">
                                            <div className="flex items-center gap-3">
                                                {r.full_name}
                                                <button 
                                                    onClick={() => handleDeleteHistoryRecord(r.id, r.dni)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all"
                                                    title="Eliminar Registro"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4 font-black text-[10px] text-slate-400">DNI {r.dni}</td>
                                        <td className="p-4 font-black text-[10px] text-emerald-400">LOTE {r.invitations?.profiles?.lote || '--'}</td>
                                        <td className="p-4 text-[10px] text-slate-300 font-black">{r.updated_at ? new Date(r.updated_at).toLocaleDateString('es-AR') : '--'}</td>
                                        <td className="p-4 text-[10px] text-emerald-400/80 font-black">
                                            {r.entry_at ? new Date(r.entry_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                        </td>
                                        <td className="p-4 text-[10px] text-red-400/80 font-black">
                                            {r.exit_at ? new Date(r.exit_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center text-[10px] font-black uppercase text-slate-700 italic tracking-[0.3em]">
                                            No hay registros que coincidan con la bÃºsqueda
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {viewingAuth && (
            <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
                <div className="bg-slate-900 w-full max-w-4xl border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden my-8">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{viewingAuth.full_name}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">AuditorÃ­a de Identidad â€¢ DNI {viewingAuth.dni}</p>
                        </div>
                        <button onClick={() => { setViewingAuth(null); setVisitorHistory([]); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                    </div>
                    
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 ml-2">Selfie Capturada</p>
                                <div className="relative aspect-square rounded-[2rem] overflow-hidden border-2 border-white/5 group bg-slate-950 flex items-center justify-center">
                                    {viewingAuth.selfie_url ? (
                                        <img src={viewingAuth.selfie_url} className="w-full h-full object-cover" alt="Selfie" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 opacity-20">
                                            <Camera className="w-12 h-12" />
                                            <p className="text-[8px] font-black uppercase tracking-widest">Sin Imagen</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setZoomedImg(viewingAuth.selfie_url)} className="p-2 bg-emerald-500 rounded-full text-white shadow-lg shadow-emerald-500/20"><Maximize2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 ml-2">Captura de DNI</p>
                                <div className="relative aspect-square rounded-[2rem] overflow-hidden border-2 border-white/5 group bg-slate-950 flex items-center justify-center">
                                    {viewingAuth.dni_front_url ? (
                                        <img src={viewingAuth.dni_front_url} className="w-full h-full object-cover" alt="DNI" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 opacity-20">
                                            <ImageIcon className="w-12 h-12 text-slate-500" />
                                            <p className="text-[8px] font-black uppercase tracking-widest">Sin Imagen</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setZoomedImg(viewingAuth.dni_front_url)} className="p-2 bg-emerald-500 rounded-full text-white shadow-lg shadow-emerald-500/20"><Maximize2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 ml-2">Historial Reciente</p>
                             <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {visitorHistory.length > 0 ? visitorHistory.map(h => (
                                    <div key={h.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-emerald-500/10 rounded-xl">
                                                <Home className="w-3 h-3 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-white">Lote {h.invitations?.profiles?.lote}</p>
                                                <p className="text-[8px] font-black text-slate-500">{new Date(h.updated_at).toLocaleDateString('es-AR')}</p>
                                            </div>
                                        </div>
                                        <p className="text-[9px] font-black uppercase text-emerald-500/70 tracking-widest bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/10">
                                            {h.status === 'completed' ? 'Salida' : 'Ingreso'} â€¢ {new Date(h.updated_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}hs
                                        </p>
                                    </div>
                                )) : (
                                    <div className="py-10 bg-white/5 rounded-2xl text-center border border-dashed border-white/5">
                                        <p className="text-[9px] font-black uppercase text-slate-600 italic">No hay ingresos previos registrados</p>
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>

                    <div className="p-8 bg-black/20 border-t border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            {!viewingAuth.face_descriptor && (
                                <button 
                                    disabled={isDetecting}
                                    onClick={handleAnalizarBiometria}
                                    className="px-6 py-3 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-2xl border border-blue-500/20 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                                >
                                    {isDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                    Analizar BiometrÃ­a
                                </button>
                            )}
                            {viewingAuth.face_descriptor && (
                                <div className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" />
                                    Identidad Digital Generada
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-4 w-full sm:w-auto">
                        {viewingAuth.status === 'pending' ? (
                          <>
                            <button 
                                onClick={() => viewingAuth.isOwner ? handleAuthorizeOwner(viewingAuth.id) : handleApproveVisitor(viewingAuth.id)}
                                className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 px-8 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                <CheckCircle className="w-5 h-5" />
                                {viewingAuth.isOwner ? 'Activar Propietario' : 'Aprobar Identidad'}
                            </button>
                            <button 
                                onClick={() => viewingAuth.isOwner ? handleBlockOwner(viewingAuth.id, 'pending') : handleRejectVisitor(viewingAuth.id)}
                                className="flex-1 sm:flex-initial bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-8 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                <UserX className="w-5 h-5" />
                                {viewingAuth.isOwner ? 'Rechazar' : 'Rechazar'}
                            </button>
                          </>
                        ) : (
                          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-6">
                             <div className="flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 font-black text-xs uppercase tracking-widest">
                                <ShieldCheck className="w-5 h-5" />
                                Identidad Verificada
                             </div>
                             <button 
                                onClick={() => setViewingAuth(null)}
                                className="w-full sm:w-auto px-12 bg-slate-800 hover:bg-slate-700 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                             >
                                Cerrar Ficha
                             </button>
                          </div>
                        )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {manualEntryVisitor && (
            <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-slate-900 w-full max-w-md border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden p-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Ingreso Manual</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Asignar destino para {manualEntryVisitor.full_name}</p>
                        </div>
                        <button onClick={() => setManualEntryVisitor(null)} className="p-2 bg-white/5 rounded-full"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-4">Lote Destino</label>
                            <input 
                                type="text"
                                value={manualEntryLote}
                                onChange={(e) => setManualEntryLote(e.target.value)}
                                placeholder="EJ: 114"
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-5 text-sm font-black uppercase tracking-widest focus:border-emerald-500/50 transition-all text-white"
                            />
                        </div>
                        <button 
                            onClick={handleConfirmManualEntry}
                            disabled={!manualEntryLote || loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Confirmar Ingreso
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isAddingVisitor && (
            <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-slate-900 w-full max-w-md border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden p-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Nueva Identidad</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Registro Manual de Invitado</p>
                        </div>
                        <button onClick={() => setIsAddingVisitor(false)} className="p-2 bg-white/5 rounded-full"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-4">Nombre Completo</label>
                            <input 
                                type="text"
                                value={newVisitor.full_name}
                                onChange={(e) => setNewVisitor({...newVisitor, full_name: e.target.value.toUpperCase()})}
                                placeholder="JUAN PEREZ"
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-5 text-sm font-black uppercase tracking-widest focus:border-emerald-500/50 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-4">DNI / Documento</label>
                            <input 
                                type="text"
                                value={newVisitor.dni}
                                onChange={(e) => setNewVisitor({...newVisitor, dni: e.target.value})}
                                placeholder="12345678"
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-5 text-sm font-black uppercase tracking-widest focus:border-emerald-500/50 transition-all"
                            />
                        </div>
                        <button 
                            onClick={handleSaveManualVisitor}
                            disabled={!newVisitor.dni || !newVisitor.full_name || loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar Identidad
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
