"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Users, UserCheck, ShieldPlus, Camera, CheckCircle2, XCircle, 
  Search, Loader2, PlayCircle, LogOut, ChevronDown, UserX, Briefcase,
  Settings, Lock, Save, ShieldCheck, Maximize2, Minimize2, LogIn, LogOut as LogOutIcon, Trash2, History, X, Users2, Building2,
  CheckCircle, ShieldAlert, UserPlus, Hand, Home, Image as ImageIcon,
  Car, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CONFIG } from "@/lib/config";

interface Person {
  id: string;
  full_name: string;
  dni: string;
  lote?: string;
  category?: string;
  employer?: string;
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
  isMaster?: boolean;
  vehicle_patente?: string;
  vehicle_modelo?: string;
  vehicle_anio?: string;
  vehicle_insurance_url?: string;
  vehicle_insurance_back_url?: string;
  work_insurance_url?: string;
  dni_back_url?: string;
  insurance_status?: string;
}

export default function GuardiaPortal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"accesos" | "salidas" | "registros" | "propietarios" | "identidades" | "trabajadores" | "permanentes" | "historial" | "config" | "delivery">("accesos");
  
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
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [trabajadoresSearch, setTrabajadoresSearch] = useState("");
  const [permanentes, setPermanentes] = useState<any[]>([]);
  const [permanentesSearch, setPermanentesSearch] = useState("");
  const [deliveryInvitations, setDeliveryInvitations] = useState<any[]>([]);
  const [deliverySearch, setDeliverySearch] = useState("");
  
  // Owner Search State
  const [ownerSearch, setOwnerSearch] = useState("");
  
  // Search & Hardware
  const [historySearch, setHistorySearch] = useState("");
  const [pendingCameraConfig, setPendingCameraConfig] = useState<{visitor: Person | null, isSmart: boolean} | null>(null);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const isScanningContinuous = useRef(false);

  // Biometría States
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
  const [isAddingTrabajador, setIsAddingTrabajador] = useState(false);
  const [newTrabajador, setNewTrabajador] = useState({ dni: "", full_name: "", category: "", employer: "" });
  const [isAddingPermanente, setIsAddingPermanente] = useState(false);
  const [newPermanente, setNewPermanente] = useState({ dni: "", full_name: "", category: "", employer: "" });

  // Photo Capture States (Guard Manual Entry)
  const [isCapturingManual, setIsCapturingManual] = useState(false);
  const [manualCaptureType, setManualCaptureType] = useState<string | null>(null);
  const [manualCapturedPhotos, setManualCapturedPhotos] = useState<{
    selfie?: string;
    dni_front?: string;
    dni_back?: string;
    insurance_front?: string;
    insurance_back?: string;
    art?: string;
  }>({});
  const [manualStream, setManualStream] = useState<MediaStream | null>(null);


  // Helper para obtener fecha local YYYY-MM-DD en Argentina (UTC-3)
  const getLocalDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const refreshAllData = async () => {
    await Promise.all([refreshCriticalData(), refreshManagementData()]);
  };

  const refreshCriticalData = async () => {
    try {
      await Promise.all([
        fetchApprovedVisitors(),
        fetchExpectedToday(),
        fetchInsideNeighborhood(),
        fetchDeliveryInvitations()
      ]);
    } catch (e) { console.error("Error refreshing critical data:", e); }
  };

  const refreshManagementData = async () => {
    try {
      await Promise.all([
        fetchPendingOwners(),
        fetchPendingVisitors(),
        fetchHistory(),
        fetchAllOwners(),
        fetchTrabajadores(),
        fetchPermanentes(),
        fetchDeliveryInvitations()
      ]);
    } catch (e) { console.error("Error refreshing management data:", e); }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
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
      // Carga inicial completa
      await refreshAllData();
      setLoading(false);
    };
    
    checkUser();
    
    // CANAL CRÍTICO (10s): Accesos y monitoreo en tiempo real
    const criticalInterval = setInterval(refreshCriticalData, 10000);

    // CANAL DE GESTIÓN (5 min): Historial, dueños y configuraciones (Optimizado)
    const mgmtInterval = setInterval(refreshManagementData, 300000);

    return () => {
      clearInterval(criticalInterval);
      clearInterval(mgmtInterval);
    };
  }, []);

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
    } catch (e) { console.error("Error cargando modelos IA:", e); }
  };

  const startManualCamera = async (type: string) => {
    try {
      if (manualStream) {
        manualStream.getTracks().forEach(t => t.stop());
      }
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: type === 'selfie' ? 'user' : 'environment', width: 1280, height: 720 }, 
        audio: false 
      });
      setManualStream(s);
      setManualCaptureType(type);
      setIsCapturingManual(true);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      console.error("Error al iniciar cámara manual:", err);
      // Fallback
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setManualStream(s);
        setManualCaptureType(type);
        setIsCapturingManual(true);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (e) {
        alert("No se pudo acceder a la cámara.");
      }
    }
  };

  const stopManualCamera = () => {
    if (manualStream) {
      manualStream.getTracks().forEach(t => t.stop());
    }
    setManualStream(null);
    setIsCapturingManual(false);
    setManualCaptureType(null);
  };

  const handleManualCapture = () => {
    if (!videoRef.current || !canvasRef.current || !manualCaptureType) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      setManualCapturedPhotos(prev => ({ ...prev, [manualCaptureType]: base64 }));
      stopManualCamera();
    }
  };

  const uploadManualImage = async (base64: string, path: string) => {
    const res = await fetch(base64);
    const blob = await res.blob();
    const { data, error } = await supabase.storage.from('documentos').upload(path, blob, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(path);
    return publicUrl;
  };



  const fetchPendingOwners = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'owner').eq('status', 'pending').order('created_at', { ascending: false });
    if (data) setPendingOwners(data);
  };

  const fetchPendingVisitors = async () => {
    const { data } = await supabase
      .from('visitor_records')
      .select('id, full_name, dni, dni_front_url, dni_back_url, selfie_url, vehicle_patente, vehicle_modelo, vehicle_anio, vehicle_insurance_url, vehicle_insurance_back_url, work_insurance_url, insurance_status, status, invitation_id, invitations!inner(type, category, start_date, end_date, profiles!inner(lote))')
      .eq('status', 'pending');
    if (data) setPendingVisitors(data as any);
  };

  const fetchApprovedVisitors = async () => {
    const { data } = await supabase.from('visitors').select('*').eq('status', 'approved').order('full_name');
    if (data) setApprovedVisitors(data);
  };

  // Visitantes aprobados por la guardia que aún no ingresaron
  const fetchExpectedToday = async () => {
    const { data } = await supabase
      .from('visitor_records')
      .select('*, invitations(id, expected_date, profiles(lote))')
      .eq('status', 'approved')
      .order('updated_at', { ascending: false });
    if (data) setExpectedToday(data as any);
  };

  // Personas actualmente dentro del barrio
  const fetchInsideNeighborhood = async () => {
    const { data } = await supabase
      .from('visitor_records')
      .select('*, invitations(id, expected_date, profiles(lote))')
      .eq('status', 'inside')
      .order('entry_at', { ascending: false });
    if (data) setInsideNeighborhood(data as any);
  };

  const fetchDeliveryInvitations = async () => {
    const { data } = await supabase
      .from('invitations')
      .select('*, profiles(lote, full_name)')
      .eq('type', 'delivery')
      .eq('expected_date', getLocalDate())
      .order('created_at', { ascending: false });
    if (data) setDeliveryInvitations(data);
  };

  const handleDeliveryAction = async (inv: any, actionType: 'entry' | 'exit') => {
    const currentCount = inv.delivery_count || 0;
    const currentExitCount = inv.delivery_exit_count || 0;
    const maxQty = inv.delivery_quantity;

    if (actionType === 'entry') {
      if (currentCount >= maxQty) {
        alert("Este pase de delivery ya alcanzó el límite de ingresos autorizados.");
        return;
      }
      
      const { error } = await supabase
        .from('invitations')
        .update({ delivery_count: currentCount + 1 })
        .eq('id', inv.id);

      if (!error) {
        // Log en historial
        await supabase.from('visitor_records').insert([{
          full_name: `DELIVERY - INGRESO (${currentCount + 1}/${maxQty})`,
          dni: `LOTE ${inv.profiles?.lote}`,
          status: 'inside',
          entry_at: new Date().toISOString(),
          invitation_id: inv.id
        }]);
        await fetchDeliveryInvitations();
        await fetchHistory();
      } else {
        alert("Error al registrar ingreso: " + error.message);
      }
    } else {
      // EXIT
      if (currentExitCount >= currentCount) {
        alert("No hay repartidores dentro del barrio para registrar salida.");
        return;
      }

      const { error } = await supabase
        .from('invitations')
        .update({ delivery_exit_count: currentExitCount + 1 })
        .eq('id', inv.id);

      if (!error) {
        // Log en historial (Salida)
        await supabase.from('visitor_records').insert([{
          full_name: `DELIVERY - EGRESO (${currentExitCount + 1}/${maxQty})`,
          dni: `LOTE ${inv.profiles?.lote}`,
          status: 'completed',
          exit_at: new Date().toISOString(),
          invitation_id: inv.id
        }]);
        await fetchDeliveryInvitations();
        await fetchHistory();
      } else {
        alert("Error al registrar salida: " + error.message);
      }
    }
  };

  const fetchRecentAccesses = async () => {
    const aDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
        .from('visitor_records')
        .select(`
            id, full_name, dni, dni_front_url, dni_back_url, selfie_url, vehicle_patente, vehicle_modelo, vehicle_anio, vehicle_insurance_url, vehicle_insurance_back_url, work_insurance_url, insurance_status, status, updated_at, created_at, face_descriptor, role,
            invitations!inner(id, expected_date, profiles!inner(id, lote, status))
        `)
        .gte('created_at', aDayAgo)
        .eq('invitations.profiles.status', 'active');
    
    if (error) {
        console.error("Error fetching recent accesses:", error.message);
        return;
    }
    
    if (data) {
      // SOLO mostramos en 'Invitados en Camino' los que ya fueron auditados (approved)
      const processed = data.map((v: any) => ({ ...v, role: v.role || 'visitor' }));
      const currentInside = processed.filter((v: any) => v.status === 'inside');
      
      // Combinar con Trabajadores y Permanentes activos (Autorregistro para re-ingreso)
      const { data: activeWorkers } = await supabase.from('trabajadores').select('*').eq('status', 'active');
      const { data: activePerms } = await supabase.from('permanentes').select('*').eq('status', 'active');
      
      const identityPool = [
        ...processed.filter((v: any) => v.status === 'approved'),
        ...(activeWorkers || []).map(w => ({ ...w, role: 'worker', status: 'approved', isMaster: true, invitation_id: (w as any).invitation_id })),
        ...(activePerms || []).filter(p => !p.end_date || new Date(p.end_date) >= new Date()).map(p => ({ ...p, role: 'permanent', status: 'approved', isMaster: true, invitation_id: (p as any).invitation_id }))
      ];

      // Filtrar los que ya están adentro (por DNI) para evitar duplicados en la lista de espera
      const insideDnis = currentInside.map(v => v.dni);
      const filteredExpected = identityPool.filter(v => !insideDnis.includes(v.dni));

      setExpectedToday(filteredExpected as any);
      setInsideNeighborhood(currentInside as any);
    }
  };

  const fetchHistory = async () => {
    // Optimización: Solo traer los últimos 30 registros para agilidad extrema
    const { data } = await supabase
        .from('visitor_records')
        .select('*, vehicle_patente, vehicle_modelo, vehicle_anio, vehicle_insurance_url, vehicle_insurance_back_url, work_insurance_url, insurance_status, invitations (expected_date, profiles(lote))')
        .order('updated_at', { ascending: false })
        .limit(30);
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

  const fetchTrabajadores = async () => {
    const { data } = await supabase.from('trabajadores').select('*').order('full_name');
    if (data) setTrabajadores(data);
  };

  const fetchPermanentes = async () => {
    const { data } = await supabase.from('permanentes').select('*').order('full_name');
    if (data) setPermanentes(data);
  };

  // Disparar pre-carga cuando IA y Datos estén listos
  useEffect(() => {
      if (isFaceApiLoaded && (expectedToday.length > 0 || insideNeighborhood.length > 0 || allOwners.length > 0 || trabajadores.length > 0 || permanentes.length > 0)) {
          const pool = [...expectedToday, ...insideNeighborhood, ...allOwners, ...trabajadores, ...permanentes] as any[];
          preloadDescriptors(pool);
      }
  }, [isFaceApiLoaded, expectedToday, insideNeighborhood, allOwners, trabajadores, permanentes]);

  const preloadDescriptors = async (pool: any[]) => {
      console.log("IA: Iniciando pre-carga instantánea para", pool.length, "entidades...");
      const newDescriptors: any[] = [];
      
      for (const v of pool) {
          try {
              // PRIORIDAD 1: Usar el descriptor ya guardado en la DB (Instantáneo)
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
                  } else if (v.role === 'worker' || (v as any).category) { // FIX V6.2 DEPLOY
                      // Si es un trabajador (tienen categoría o el role explícito)
                      // Buscamos primero en trabajadores y luego en permanentes si no está (o viceversa)
                      // En el pool, si traemos el v.id, sabemos de qué tabla viene.
                      // Para simplificar, probamos en ambas o añadimos el role al pool.
                      
                      const isPermanente = permanentes.some(p => p.id === v.id);
                      if (isPermanente) {
                        await supabase.from('permanentes').update({ face_descriptor: Array.from(detection.descriptor) }).eq('id', v.id);
                      } else {
                        await supabase.from('trabajadores').update({ face_descriptor: Array.from(detection.descriptor) }).eq('id', v.id);
                      }
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
    setScanResult({match: null, distance: 0, error: "Conectando cámara..."});
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
            alert("No se pudo acceder a la cámara.");
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
      // Usar Tiny para verificación puntual si se busca velocidad, o SSD para precisión
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (!detection) {
          setScanResult({ match: null, distance: 0, error: "No se detecta rostro. Intenta acercarte más." });
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
        setScanResult({ match: null, distance: 0, error: "Error en sensor biométrico." });
    }
    finally { setScanThinking(false); }
  };

  const performSmartScan = async () => {
    if (!videoRef.current || !canvasRef.current || !isFaceApiLoaded || !isScanningContinuous.current) return false;
    
    try {
      // Volver a TinyFaceDetector para que el loop sea instantáneo en móviles
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

      // Dibujar feedback de detección
      if (ctx) {
          const { x, y, width, height } = liveDetection.detection.box;
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, width, height);
          
          // Esquinas estéticas
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
              
              // REGISTRAMOS LA ACCIÓN AUTOMÁTICAMENTE
              if (isResident) {
                  // Para residentes solo logueamos o actualizamos un flag si fuera necesario
                  console.log("IA: Residente detectado. Autorizando paso...");
                  // Podríamos llamar a handleStatusUpdate si adaptamos la DB para residentes
                  if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
              } else {
                  handleStatusUpdate(found.id, nextStatus, (found as any).invitations?.id);
                  if (window.navigator.vibrate) window.navigator.vibrate(100);
              }

              // AUTOCIERRE DE CÁMARA TRAS FEEDBACK
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
    // Eliminada confirmación nativa para evitar bloqueos del navegador
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

  const updateInsuranceStatus = async (id: string, newStatus: string, isMaster: boolean) => {
    try {
      const table = isMaster ? 'visitors' : 'visitor_records';
      const { error } = await supabase.from(table).update({ insurance_status: newStatus }).eq('id', id);
      if (error) throw error;
      
      // Update local state for immediate feedback
      if (viewingAuth) setViewingAuth({ ...viewingAuth, insurance_status: newStatus });
      await refreshAllData();
    } catch (err: any) {
      console.error("Error updating insurance status:", err.message);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string, explicitInvId?: string) => {
    try {
      let recordData: any = null;
      let error: any = null;

      // Determinamos si es un registro existente o un Personal Maestro ingresando
      const isMaster = expectedToday.find(v => v.id === id)?.isMaster || (newStatus === 'completed' && insideNeighborhood.find(v => v.id === id)?.role !== 'visitor');

      if (isMaster && newStatus === 'inside') {
        // FLUJO DE MASTER IDENTITY: NUEVO REGISTRO DE ENTRADA
        const person = expectedToday.find(v => v.id === id);
        if (!person) throw new Error("No se encontraron los datos de la persona para registrar el ingreso.");

        const { data: newRecord, error: insError } = await supabase
          .from('visitor_records')
          .insert([{
            full_name: person.full_name,
            dni: person.dni,
            selfie_url: person.selfie_url,
            dni_front_url: person.dni_front_url,
            face_descriptor: person.face_descriptor,
            status: 'inside',
            entry_at: new Date().toISOString(),
            invitation_id: explicitInvId,
            role: person.role
          }])
          .select('id, invitation_id')
          .single();
        
        recordData = newRecord;
        error = insError;
      } else {
        // FLUJO ESTÁNDAR O SALIDA: ACTUALIZACIÓN
        const { data: updRecord, error: updError } = await supabase
          .from('visitor_records')
          .update({ 
            status: newStatus,
            ...(newStatus === 'inside' ? { entry_at: new Date().toISOString() } : {}),
            ...(newStatus === 'completed' ? { exit_at: new Date().toISOString() } : {})
          })
          .eq('id', id)
          .select('invitation_id')
          .maybeSingle();
        
        recordData = updRecord;
        error = updError;
      }

      if (error) throw error;

      // Sincronización redundante para el dueño
      const targetInvId = explicitInvId || recordData?.invitation_id;
      if (targetInvId) {
        let statusMarker = "";
        if (newStatus === 'inside') statusMarker = " [INGRESÓ]";
        if (newStatus === 'completed') statusMarker = " [SALIÓ]";
        
        const { data: currentInv } = await supabase.from('invitations').select('visitor_name').eq('id', targetInvId).maybeSingle();
        if (currentInv) {
          const cleanName = currentInv.visitor_name.split(" [")[0];
          await supabase.from('invitations').update({ 
            visitor_name: cleanName + statusMarker 
          }).eq('id', targetInvId);
        }
      }
      await refreshAllData();

    } catch (err: any) {
      console.error("Error en handleStatusUpdate:", err.message);
      alert("Error al actualizar estado: " + err.message);
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
      .maybeSingle();
    
    if (error) {
      console.error("ERROR SUPABASE AL APROBAR:", error);
      alert(`ERROR DE BASE DE DATOS: ${error.message}`);
    } else if (data) {
      console.log("Registro de hoy aprobado:", data);
      
      // 2. GUARDADO/ACTUALIZACIÓN EN BANCO DE IDENTIDADES MAESTRO Y SECTORES
      const { 
        dni, full_name, dni_front_url, dni_back_url, selfie_url, face_descriptor, invitation_id,
        vehicle_patente, vehicle_modelo, vehicle_anio, vehicle_insurance_url, vehicle_insurance_back_url, 
        work_insurance_url, insurance_status 
      } = data;
      
      // Siempre al Banco de Identidades Maestro
      const { error: upsertError } = await supabase
        .from('visitors')
        .upsert({
          dni,
          full_name: full_name.toUpperCase(),
          dni_front_url,
          dni_back_url,
          selfie_url,
          vehicle_patente,
          vehicle_modelo,
          vehicle_anio,
          vehicle_insurance_url,
          vehicle_insurance_back_url,
          work_insurance_url,
          insurance_status,
          status: 'active',
          face_descriptor: Array.isArray(face_descriptor) ? face_descriptor : null
        }, { onConflict: 'dni' });

      if (upsertError) {
        console.error("DEBUG: Error al guardar en 'visitors':", upsertError);
      }

      // Routing basado en el tipo de invitación
      const { data: invData } = await supabase
        .from('invitations')
        .select('type, category, start_date, end_date, profiles(full_name)')
        .eq('id', invitation_id)
        .maybeSingle();

      if (invData) {
        const masterPayload = {
          dni,
          full_name: full_name.toUpperCase(),
          category: invData.type === 'worker' ? (invData.category || 'SIN CATEGORÍA') : 'Residente / Frecuente',
          employer: (Array.isArray(invData.profiles) ? (invData.profiles as any)[0]?.full_name : (invData.profiles as any)?.full_name) || 'Particular',
          status: 'active',
          face_descriptor: Array.isArray(face_descriptor) ? face_descriptor : null,
          start_date: invData.start_date,
          end_date: invData.end_date,
          invitation_id: invitation_id,
          dni_front_url,
          dni_back_url,
          selfie_url,
          vehicle_patente,
          vehicle_modelo,
          vehicle_anio,
          vehicle_insurance_url,
          vehicle_insurance_back_url,
          work_insurance_url,
          insurance_status
        };

        if (invData.type === 'worker') {
          const { error: wErr } = await supabase.from('trabajadores').upsert(masterPayload, { onConflict: 'dni' });
          if (wErr) console.error("DEBUG: Error al guardar en 'trabajadores':", wErr);
        } else if (invData.type === 'permanent') {
          const { error: pErr } = await supabase.from('permanentes').upsert(masterPayload, { onConflict: 'dni' });
          if (pErr) console.error("DEBUG: Error al guardar en 'permanentes':", pErr);
        }
      }

      // FIX SINCRONIZACIÓN ESTADO: Añadir [APROBADO] a la invitación para que el Propietario lo reciba.
      if (invitation_id && !andEnter) {
         const { data: currentInv } = await supabase.from('invitations').select('visitor_name').eq('id', invitation_id).maybeSingle();
         if (currentInv) {
           const cleanName = currentInv.visitor_name.split(" [")[0];
           await supabase.from('invitations').update({ visitor_name: cleanName + " [APROBADO]" }).eq('id', invitation_id);
         }
      }

      if (upsertError) {
        console.error("Error crítico al sincronizar con el Banco de Identidades:", upsertError);
        alert(`Atención: Identidad aprobada para ingreso, pero falló el guardado permanente.\n\nDetalle: ${upsertError.message || 'Error desconocido'}`);
      } else {
        console.log("Banco de Identidades y Sectores actualizados correctamente.");
      }

      setViewingAuth(null);
      await refreshAllData();
    }
    setLoading(false);
  };

  const handleDeleteVisitor = async (dni: string) => {
    if (!confirm("¿Eliminar este visitante y TODO su historial de forma permanente?")) return;
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
    if (!confirm("¿Estás seguro de que quieres borrar TODO el historial de registros finalizados?")) return;
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
    if (!confirm("¿Eliminar este registro específico del historial?")) return;
    setLoading(true);
    try {
      // Intentar borrar el registro por ID
      const { error: delError } = await supabase
        .from('visitor_records')
        .delete()
        .eq('id', recordId);
      
      if (delError) throw delError;

      // Parche v5.8 Purga Atómica para Palacios (DNI persistente)
      if (dni === '35264897' || dni.includes('35264897')) {
         console.log("IA: Iniciando Purga Atómica de Palacios...");
         await supabase.from('visitor_records').delete().eq('dni', '35264897');
         await supabase.from('invitations').delete().eq('visitor_dni', '35264897');
         await supabase.from('visitors').delete().eq('dni', '35264897');
         alert("IA: Purga Atómica completada. El registro debería desaparecer tras el refresco.");
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
    if (!targetOwner && manualEntryVisitor.role !== 'worker') {
      alert("⚠️ No se encontró un vecino activo para el lote indicado.");
      setLoading(false);
      return;
    }

    try {
      let invId = null;
      // Solo creamos invitación huérfana si NO es trabajador
      if (manualEntryVisitor.role !== 'worker') {
        const { data: inv, error: invErr } = await supabase
          .from('invitations')
          .insert([{ 
              visitor_name: manualEntryVisitor.full_name + " [INGRESÓ]", 
              visitor_dni: manualEntryVisitor.dni,
              expected_date: getLocalDate(),
              owner_id: targetOwner?.id 
          }])
          .select().single();
        
        if (invErr) throw invErr;
        invId = inv.id;
      }

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
            invitation_id: invId,
            role: manualEntryVisitor.role || 'visitor'
        }]);
      
      if (recErr) throw recErr;

      setManualEntryVisitor(null);
      setManualEntryLote("");
      await refreshAllData();
      alert("Ingreso confirmado correctamente.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectVisitor = async (recordId: string) => {
    if (!confirm("¿Rechazar este registro de identidad?")) return;
    setLoading(true);
    
    // 1. Marcar como rechazado en visitor_records (NO BORRAR)
    const { data: recordData, error } = await supabase
      .from('visitor_records')
      .update({ status: 'rejected' })
      .eq('id', recordId)
      .select('invitation_id')
      .maybeSingle();

    if (!error) {
      // 2. Sincronizar marcador en la invitación para el dueño
      const targetInvId = recordData?.invitation_id;
      if (targetInvId) {
        const { data: currentInv } = await supabase.from('invitations').select('visitor_name').eq('id', targetInvId).single();
        if (currentInv) {
          const cleanName = currentInv.visitor_name.split(" [")[0];
          await supabase.from('invitations').update({ 
            visitor_name: cleanName + " [RECHAZADO]" 
          }).eq('id', targetInvId);
        }
      }
      
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
      console.error("Error analizando biometría:", e);
    } finally {
      setIsDetecting(false);
    }
  };


  const handleUpdateGuardPassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      alert("Las contraseñas no coinciden o están vacías");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) throw authError;

      alert("Contraseña de guardia actualizada correctamente");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAddTrabajador = async () => {
    if (!newTrabajador.dni || !newTrabajador.full_name) {
      alert("DNI y Nombre son obligatorios");
      return;
    }
    
    setLoading(true);
    try {
      let urls: any = {};
      if (manualCapturedPhotos.selfie) urls.selfie_url = await uploadManualImage(manualCapturedPhotos.selfie, `manual_trabajador_${newTrabajador.dni}_selfie.jpg`);
      if (manualCapturedPhotos.dni_front) urls.dni_front_url = await uploadManualImage(manualCapturedPhotos.dni_front, `manual_trabajador_${newTrabajador.dni}_dnifront.jpg`);
      if (manualCapturedPhotos.dni_back) urls.dni_back_url = await uploadManualImage(manualCapturedPhotos.dni_back, `manual_trabajador_${newTrabajador.dni}_dniback.jpg`);
      if (manualCapturedPhotos.insurance_front) urls.vehicle_insurance_url = await uploadManualImage(manualCapturedPhotos.insurance_front, `manual_trabajador_${newTrabajador.dni}_insfront.jpg`);
      if (manualCapturedPhotos.insurance_back) urls.vehicle_insurance_back_url = await uploadManualImage(manualCapturedPhotos.insurance_back, `manual_trabajador_${newTrabajador.dni}_insback.jpg`);
      if (manualCapturedPhotos.art) urls.work_insurance_url = await uploadManualImage(manualCapturedPhotos.art, `manual_trabajador_${newTrabajador.dni}_art.jpg`);

      const { error } = await supabase.from('trabajadores').insert([{
        ...newTrabajador,
        ...urls,
        full_name: newTrabajador.full_name.toUpperCase(),
        status: 'active'
      }]);
      
      if (error) throw error;
      
      setIsAddingTrabajador(false);
      setNewTrabajador({ dni: "", full_name: "", category: "", employer: "" });
      setManualCapturedPhotos({});
      await fetchTrabajadores();
    } catch (err: any) {
      alert("Error al guardar trabajador: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockTrabajador = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    const { error } = await supabase.from('trabajadores').update({ status: newStatus }).eq('id', id);
    if (!error) await fetchTrabajadores();
    else alert("Error: " + error.message);
  };

  const handleDeleteTrabajador = async (id: string) => {
    if (!window.confirm("¿Está seguro de eliminar este trabajador permanente?")) return;
    const { error } = await supabase.from('trabajadores').delete().eq('id', id);
    if (!error) await fetchTrabajadores();
    else alert("Error: " + error.message);
  };

  const handleAddPermanente = async () => {
    if (!newPermanente.dni || !newPermanente.full_name) {
      alert("DNI y Nombre son obligatorios");
      return;
    }
    
    setLoading(true);
    try {
      let urls: any = {};
      if (manualCapturedPhotos.selfie) urls.selfie_url = await uploadManualImage(manualCapturedPhotos.selfie, `manual_permanente_${newPermanente.dni}_selfie.jpg`);
      if (manualCapturedPhotos.dni_front) urls.dni_front_url = await uploadManualImage(manualCapturedPhotos.dni_front, `manual_permanente_${newPermanente.dni}_dnifront.jpg`);
      if (manualCapturedPhotos.dni_back) urls.dni_back_url = await uploadManualImage(manualCapturedPhotos.dni_back, `manual_permanente_${newPermanente.dni}_dniback.jpg`);

      const { error } = await supabase.from('permanentes').insert([{
        ...newPermanente,
        ...urls,
        full_name: newPermanente.full_name.toUpperCase(),
        status: 'active'
      }]);
      
      if (error) throw error;
      
      setIsAddingPermanente(false);
      setNewPermanente({ dni: "", full_name: "", category: "", employer: "" });
      setManualCapturedPhotos({});
      await fetchPermanentes();
    } catch (err: any) {
      alert("Error al guardar permanente: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockPermanente = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    const { error } = await supabase.from('permanentes').update({ status: newStatus }).eq('id', id);
    if (!error) await fetchPermanentes();
    else alert("Error: " + error.message);
  };

  const handleDeletePermanente = async (id: string) => {
    if (!window.confirm("¿Está seguro de eliminar este registro permanente?")) return;
    const { error } = await supabase.from('permanentes').delete().eq('id', id);
    if (!error) await fetchPermanentes();
    else alert("Error: " + error.message);
  };

  const handleUpdateGuardName = async () => {
    if (!newGuardUsername || newGuardUsername !== confirmGuardUsername) {
      alert("Los nombres de usuario no coinciden o están vacíos");
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      
      {zoomedImg && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setZoomedImg(null)}>
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

            {/* Overlay Estético HUD (HUD es "Heads-Up Display") */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                <div className="absolute inset-0 border-[20px] border-black/10" />
                <div className="scanning-line" />
            </div>

            {/* HUD Centralizado de Información de Usuario */}
            {selectedVisitor && (
                <div className="absolute bottom-12 inset-x-6 z-50 animate-in slide-in-from-bottom-12 duration-500">
                    <div className="max-w-sm mx-auto p-4 bg-slate-900/40 backdrop-blur-[30px] rounded-[2.5rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex items-center gap-5 ring-1 ring-white/5">
                        <img src={selectedVisitor.selfie_url || selectedVisitor.dni_front_url} className="w-16 h-16 rounded-[1.5rem] object-cover shadow-2xl ring-2 ring-emerald-500/20" alt="HUD" />
                        <div className="flex-1">
                            <h4 className="font-black uppercase text-base text-white leading-tight mb-0.5 tracking-tighter">{selectedVisitor.full_name}</h4>
                            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em]">
                                {selectedVisitor.role === 'owner' ? 'Vecino' : (selectedVisitor.category || 'Visita')} • {selectedVisitor.lote || selectedVisitor.invitations?.profiles?.lote || selectedVisitor.employer || 'Acceso Fijo'}
                            </p>
                        </div>
                        <div className="mr-2 p-3 bg-emerald-500/10 rounded-full text-emerald-500 shadow-inner">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback Visual de Autorización */}
            {scanResult.match === true && !selectedVisitor && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-emerald-500/20 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="p-8 bg-emerald-500 rounded-[3rem] shadow-[0_0_100px_rgba(16,185,129,0.4)] flex flex-col items-center gap-4 animate-bounce">
                        <CheckCircle2 className="w-16 h-16 text-white" />
                        <p className="text-sm font-black uppercase tracking-[0.5em] text-white">Acceso Confirmado</p>
                    </div>
                </div>
            )}

            {/* Feedback de Análisis IA */}
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
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Terminal v6.5 • Biometría Activa</span>
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
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
              <Building2 className="w-10 h-10 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Barrio Seguro</h1>
              <p className="text-emerald-600 font-black uppercase tracking-[0.3em] text-[10px]">Santa Inés • Guardia</p>
            </div>
          </div>
          <button onClick={() => { supabase.auth.signOut(); router.push("/"); }} className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">Salir</button>
        </header>

        <div className="flex p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm mb-8 w-fit overflow-x-auto gap-1">
          {['accesos', 'salidas', 'delivery', 'registros', 'identidades', 'trabajadores', 'permanentes', 'historial', 'propietarios', 'config'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`relative px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
              {tab === 'registros' ? (
                <>
                    {`Registros (${pendingVisitors.length + pendingOwners.length})`}
                    {(pendingVisitors.length + pendingOwners.length) > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] animate-pulse border-2 border-white">!</span>
                    )}
                </>
              ) : tab === 'delivery' ? (
                <>
                  {`Delivery (${deliveryInvitations.filter(d => d.delivery_count < d.delivery_quantity).length})`}
                  {deliveryInvitations.some(d => d.delivery_count < d.delivery_quantity) && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[8px] animate-pulse border-2 border-white">!</span>
                  )}
                </>
              ) : tab === 'identidades' ? 'Identidades' : tab === 'trabajadores' ? 'Trabajadores' : tab === 'permanentes' ? 'Permanentes' : tab === 'config' ? 'Config' : tab}
            </button>
          ))}
        </div>

        {activeTab === 'accesos' && (
            <div className="space-y-12">
                <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-slate-900">Escáner IA Inteligente</h3>
                        <p className="text-emerald-700 text-[10px] font-bold uppercase tracking-wide">Acceso automático mediante reconocimiento facial biométrico.</p>
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
                        className="bg-emerald-600 hover:bg-emerald-700 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/10 flex items-center gap-3 transition-all active:scale-95 text-white"
                    >
                        {isFaceApiLoaded ? <><Camera className="w-5 h-5" /> Iniciar IA</> : <Loader2 className="w-5 h-5 animate-spin" />}
                    </button>
                </div>

                {expectedToday.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-4 mb-2">Invitados en camino ({expectedToday.length})</h4>
                    {expectedToday.map(v => {
                        const displayName = (v as any).visitor_name || v.full_name || '—';
                        const displayLote = (v as any).profiles?.lote || v.invitations?.profiles?.lote || '—';
                        return (
                        <div key={v.id} 
                            className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group cursor-pointer hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <div className="flex-1" onClick={async () => {
                              try {
                                if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
                                else if ((document.documentElement as any).webkitRequestFullscreen) await (document.documentElement as any).webkitRequestFullscreen();
                              } catch (e) {}
                              startCamera(true, v);
                            }}>
                                <p className="font-extrabold uppercase tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">{displayName}</p>
                                <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Lote {displayLote}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleStatusUpdate(v.id, 'inside', (v as any).invitations?.id || (v as any).id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/10 transition-all active:scale-95">Ingresar</button>
                                <button onClick={() => handleDeleteRecord(v.id)} className="p-3 text-slate-400 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        );
                    })}
                </div>
                )}
            </div>
        )}
        {activeTab === 'delivery' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
                  <div>
                    <h2 className="text-slate-900 font-extrabold uppercase tracking-widest text-xs">Control de Deliveries</h2>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Autorizados para el día de hoy</p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="BUSCAR POR LOTE O NOMBRE..."
                        value={deliverySearch}
                        onChange={(e) => setDeliverySearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:border-blue-500/50 transition-all shadow-inner"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {deliveryInvitations.filter(inv => {
                        const searchMatch = inv.profiles?.lote?.toString().includes(deliverySearch) || 
                                           inv.profiles?.full_name?.toLowerCase().includes(deliverySearch.toLowerCase());
                        const isFullyExited = (inv.delivery_exit_count || 0) >= inv.delivery_quantity;
                        return searchMatch && !isFullyExited;
                    }).length > 0 ? (
                        deliveryInvitations.filter(inv => {
                            const searchMatch = inv.profiles?.lote?.toString().includes(deliverySearch) || 
                                               inv.profiles?.full_name?.toLowerCase().includes(deliverySearch.toLowerCase());
                            const isFullyExited = (inv.delivery_exit_count || 0) >= inv.delivery_quantity;
                            return searchMatch && !isFullyExited;
                        }).map(inv => {
                            const entries = inv.delivery_count || 0;
                            const exits = inv.delivery_exit_count || 0;
                            const max = inv.delivery_quantity;
                            const isFullyEntered = entries >= max;
                            const insideNow = entries - exits;

                            return (
                                <div key={inv.id} className="bg-white border border-slate-200 shadow-sm p-3 rounded-2xl transition-all relative overflow-hidden group hover:shadow-lg hover:border-blue-200">
                                    <div className="flex items-center gap-3">
                                        {/* Izquierda: Lote */}
                                        <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 text-center min-w-[45px] shadow-inner">
                                            <span className="text-[6px] font-black text-slate-400 block uppercase leading-none mb-1">Lote</span>
                                            <span className="text-base font-black text-slate-900 leading-none">{inv.profiles?.lote}</span>
                                        </div>

                                        {/* Centro: Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] font-black text-slate-900 uppercase truncate mb-0.5">{inv.profiles?.full_name}</p>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1">
                                                    <LogIn className="w-2.5 h-2.5 text-blue-600" />
                                                    <span className="text-[9px] font-black text-blue-600">{entries}/{max}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <LogOutIcon className="w-2.5 h-2.5 text-red-600" />
                                                    <span className="text-[9px] font-black text-red-600">{exits}/{max}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Derecha: Botones */}
                                        <div className="flex flex-col gap-1">
                                            <button 
                                                disabled={isFullyEntered}
                                                onClick={() => handleDeliveryAction(inv, 'entry')}
                                                className={`px-3 py-1.5 rounded-lg font-black text-[7px] uppercase tracking-tighter transition-all active:scale-95 flex items-center justify-center gap-1 ${
                                                    isFullyEntered 
                                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/10'
                                                }`}
                                            >
                                                <LogIn className="w-2.5 h-2.5" /> Ingreso
                                            </button>
                                            <button 
                                                disabled={insideNow <= 0}
                                                onClick={() => handleDeliveryAction(inv, 'exit')}
                                                className={`px-3 py-1.5 rounded-lg font-black text-[7px] uppercase tracking-tighter transition-all active:scale-95 flex items-center justify-center gap-1 ${
                                                    insideNow <= 0 
                                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                                    : 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-500/10'
                                                }`}
                                            >
                                                <LogOutIcon className="w-2.5 h-2.5" /> Egreso
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center shadow-inner">
                            <Zap className="w-10 h-10 text-slate-200 mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">No hay pases de delivery que coincidan</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'salidas' && (
            <div className="space-y-12">
                <div className="bg-red-50 border border-red-100 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-slate-900">Escáner IA de Salida</h3>
                        <p className="text-red-700 text-[10px] font-extrabold uppercase tracking-wide">Reconocimiento facial para registrar egresos</p>
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
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-500/10 flex items-center gap-3 transition-all active:scale-95"
                    >
                        {isFaceApiLoaded ? <><Camera className="w-5 h-5" /> Iniciar IA de Salida</> : <Loader2 className="w-5 h-5 animate-spin" />}
                    </button>
                </div>

                <div className="flex items-center gap-3 mb-6 ml-4">
                    <LogOutIcon className="w-5 h-5 text-red-600" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Personas en el Barrio ({insideNeighborhood.length})</h3>
                </div>
                
                {insideNeighborhood.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insideNeighborhood.map(v => (
                      <div key={v.id} className="bg-white border border-slate-200 p-6 rounded-3xl flex items-center justify-between group shadow-sm hover:border-red-200 transition-all">
                          <div>
                              <h4 className="font-extrabold uppercase text-slate-900 mb-1 group-hover:text-red-600 transition-colors">{v.full_name}</h4>
                              <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">INGRESÓ A LAS {new Date(v.entry_at || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                          <div className="flex items-center gap-2">
                                     <button 
                                         onClick={() => handleStatusUpdate(v.id, 'completed', (v as any).invitations?.id)}
                                         className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-red-500/10 transition-all flex items-center gap-2 active:scale-95"
                                     >
                                         <LogOut className="w-4 h-4" />
                                         Confirmar Salida
                                     </button>
                                 </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center shadow-inner">
                      <LogOutIcon className="w-12 h-12 text-slate-300 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">No hay visitas activas dentro del barrio</p>
                  </div>
                )}
            </div>
        )}

        {activeTab === 'registros' && (
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6 ml-4">
                    <ShieldPlus className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Auditoría de Identidad ({pendingVisitors.length + pendingOwners.length})</h3>
                </div>
                
                {(pendingVisitors.length + pendingOwners.length) > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingOwners.map(v => (
                        <div key={v.id} className="bg-white border border-slate-200 p-6 rounded-[2.5rem] flex items-center justify-between group hover:border-emerald-500 shadow-sm transition-all hover:shadow-xl hover:shadow-emerald-500/10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                                    <Home className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-black uppercase text-slate-900 group-hover:text-emerald-600 transition-colors">{v.full_name}</h4>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">NUEVO VECINO • LOTE {v.lote}</p>
                                </div>
                            </div>
                            <button 
                              onClick={() => setViewingAuth({ 
                                ...v, 
                                isOwner: true,
                                id: v.id // ID Explícito
                              })}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
                            >
                                AUDITAR
                            </button>
                        </div>
                    ))}

                    {pendingVisitors.map(v => (
                        <div key={v.id} className="bg-white border border-slate-200 p-6 rounded-[2.5rem] flex items-center justify-between group hover:border-blue-500 shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                                    <ShieldAlert className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-black uppercase text-slate-900 group-hover:text-blue-600 transition-colors">{v.full_name}</h4>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">VISITA • LOTE {v.invitations?.profiles?.lote}</p>
                                </div>
                            </div>
                            <button 
                              onClick={() => setViewingAuth({ 
                                ...v, 
                                isOwner: false,
                                id: v.id // ID Explícito
                              })}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
                            >
                                AUDITAR
                            </button>
                        </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center shadow-inner">
                      <ShieldCheck className="w-12 h-12 text-slate-300 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">No hay registros pendientes de revisión</p>
                  </div>
                )}
            </div>
        )}





        {activeTab === 'config' && (
            <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-xl shadow-slate-200/50">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shadow-inner">
                            <Lock className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Seguridad</h3>
                            <p className="text-emerald-700 text-[10px] font-black uppercase tracking-widest">Actualiza la clave de acceso de la guardia</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Nueva Contraseña</label>
                            <input 
                                type="password" 
                                placeholder="••••••••" 
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black tracking-widest text-slate-900 focus:border-emerald-500/50 focus:outline-none transition-all shadow-inner"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Confirmar Nueva Contraseña</label>
                            <input 
                                type="password" 
                                placeholder="••••••••" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black tracking-widest text-slate-900 focus:border-emerald-500/50 focus:outline-none transition-all shadow-inner"
                            />
                        </div>

                        <button 
                            onClick={handleUpdateGuardPassword}
                            disabled={isUpdatingPassword}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-4"
                        >
                            {isUpdatingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 text-white" /> Guardar Clave</>}
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-xl shadow-slate-200/50">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shadow-inner">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Usuario</h3>
                            <p className="text-emerald-700 text-[10px] font-black uppercase tracking-widest">Actualiza el usuario de acceso de la guardia</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Nuevo Usuario</label>
                            <input 
                                type="text" 
                                placeholder="GUARDIA PRINCIPAL" 
                                value={newGuardUsername}
                                onChange={(e) => setNewGuardUsername(e.target.value.toUpperCase())}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black uppercase tracking-widest text-slate-900 focus:border-emerald-500/50 focus:outline-none transition-all shadow-inner"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Confirmar Nuevo Usuario</label>
                            <input 
                                type="text" 
                                placeholder="GUARDIA PRINCIPAL" 
                                value={confirmGuardUsername}
                                onChange={(e) => setConfirmGuardUsername(e.target.value.toUpperCase())}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black uppercase tracking-widest text-slate-900 focus:border-emerald-500/50 focus:outline-none transition-all shadow-inner"
                            />
                        </div>

                        <button 
                            onClick={handleUpdateGuardName}
                            disabled={isUpdatingName}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-4"
                        >
                            {isUpdatingName ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 text-white" /> Guardar Usuario</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'identidades' && (
            <div className="space-y-8">
                <div className="flex items-center justify-between mb-2 px-4">
                  <h2 className="text-slate-900 font-extrabold uppercase tracking-widest text-xs">Identidades</h2>
                  <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 shadow-sm">Build v6.5</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50">

                    <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <UserCheck className="w-6 h-6 text-emerald-600" />
                            <h3 className="font-black uppercase tracking-widest text-slate-900 text-sm">Banco de Identidades ({approvedVisitors.length})</h3>
                        </div>
                        
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="BUSCAR POR NOMBRE O DNI..."
                                value={identidadesSearch}
                                onChange={(e) => setIdentidadesSearch(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="p-6">
                        <button 
                            onClick={() => setIsAddingVisitor(true)}
                            className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/10 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 mb-6 active:scale-95"
                        >
                            <UserPlus className="w-5 h-5" />
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
                                    <div key={v.dni} className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 group hover:border-emerald-500/20 transition-all shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="min-w-0">
                                                <h4 className="font-black uppercase text-xs text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors truncate">{v.full_name}</h4>
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">DNI {v.dni}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setManualEntryVisitor(v)}
                                                className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                            >
                                                INGRESAR
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setViewingAuth(v);
                                                    fetchVisitorHistory(v.dni);
                                                }}
                                                className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm"
                                            >
                                                Audit
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteVisitor(v.dni)}
                                                className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white p-3 rounded-xl transition-all border border-red-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center shadow-inner">
                                    <Users className="w-12 h-12 text-slate-300 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">No hay identidades que coincidan</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'trabajadores' && (
            <div className="space-y-8">
                <div className="flex items-center justify-between mb-2 px-4">
                  <h2 className="text-slate-900 font-extrabold uppercase tracking-widest text-xs">Trabajadores</h2>
                  <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 shadow-sm">Build v6.5</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50">

                    <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Briefcase className="w-6 h-6 text-emerald-600" />
                            <h3 className="font-black uppercase tracking-widest text-slate-900 text-sm">Personal Permanente ({trabajadores.length})</h3>
                        </div>
                        
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="BUSCAR TRABAJADOR..."
                                value={trabajadoresSearch}
                                onChange={(e) => setTrabajadoresSearch(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="p-6">
                        <button 
                            onClick={() => setIsAddingTrabajador(true)}
                            className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/10 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 mb-6 active:scale-95"
                        >
                            <UserPlus className="w-5 h-5" />
                            Agregar Nuevo Trabajador
                        </button>

                        <div className="grid grid-cols-1 gap-2">
                            {trabajadores.filter(v => 
                                v.full_name?.toLowerCase().includes(trabajadoresSearch.toLowerCase()) || 
                                v.dni?.includes(trabajadoresSearch)
                            ).length > 0 ? (
                                trabajadores.filter(v => 
                                    v.full_name?.toLowerCase().includes(trabajadoresSearch.toLowerCase()) || 
                                    v.dni?.includes(trabajadoresSearch)
                                ).map(v => (
                                    <div key={v.dni} className={`p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 group transition-all border ${v.status === 'blocked' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100 shadow-sm hover:border-emerald-500/30 hover:shadow-lg'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="min-w-0">
                                                <h4 className={`font-black uppercase text-xs tracking-tight transition-colors truncate ${v.status === 'blocked' ? 'text-red-600 font-extrabold' : 'text-slate-900 group-hover:text-emerald-700'}`}>{v.full_name}</h4>
                                                <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest leading-none mt-1">
                                                    DNI {v.dni} • {v.category || 'SIN CATEGORÍA'} {v.employer ? `• AUTORIZADO POR: ${v.employer}` : ''}
                                                </p>
                                                {(v.start_date || v.end_date) && (
                                                  <p className="text-[8px] text-emerald-600 font-black uppercase tracking-widest mt-1">
                                                    VIGENCIA: {v.start_date ? new Date(v.start_date).toLocaleDateString() : '---'} AL {v.end_date ? new Date(v.end_date).toLocaleDateString() : '---'}
                                                  </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {v.status !== 'blocked' && (
                                                <button 
                                                    onClick={() => setManualEntryVisitor({ ...v, role: 'worker' })}
                                                    className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                                >
                                                    INGRESAR
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => toggleBlockTrabajador(v.id, v.status)}
                                                className={`px-4 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm ${v.status === 'blocked' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}
                                            >
                                                {v.status === 'blocked' ? 'Habilitar' : 'Bloquear'}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteTrabajador(v.id)}
                                                className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white p-3 rounded-xl transition-all border border-red-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center shadow-inner">
                                    <Briefcase className="w-12 h-12 text-slate-300 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">No hay trabajadores en esa búsqueda</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'permanentes' && (
            <div className="space-y-8">
                <div className="flex items-center justify-between mb-2 px-4">
                  <h2 className="text-slate-900 font-extrabold uppercase tracking-widest text-xs">Permanentes</h2>
                  <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 shadow-sm">Build v6.5</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50">

                    <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-6 h-6 text-emerald-600" />
                            <h3 className="font-black uppercase tracking-widest text-slate-900 text-sm">Accesos Fijos ({permanentes.length})</h3>
                        </div>
                        
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="BUSCAR PERMANENTE..."
                                value={permanentesSearch}
                                onChange={(e) => setPermanentesSearch(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="p-6">
                        <button 
                            onClick={() => setIsAddingPermanente(true)}
                            className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/10 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 mb-6 active:scale-95"
                        >
                            <UserPlus className="w-5 h-5" />
                            Agregar Nuevo Permanente
                        </button>

                        <div className="grid grid-cols-1 gap-2">
                            {permanentes.filter(v => 
                                v.full_name?.toLowerCase().includes(permanentesSearch.toLowerCase()) || 
                                v.dni?.includes(permanentesSearch)
                            ).length > 0 ? (
                                permanentes.filter(v => 
                                    v.full_name?.toLowerCase().includes(permanentesSearch.toLowerCase()) || 
                                    v.dni?.includes(permanentesSearch)
                                ).map(v => (
                                    <div key={v.dni} className={`p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 group transition-all border ${v.status === 'blocked' ? 'bg-red-50 border-red-200 shadow-inner' : 'bg-white border-slate-100 shadow-sm hover:border-emerald-500/30 hover:shadow-lg'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="min-w-0">
                                                <h4 className={`font-black uppercase text-xs tracking-tighter transition-colors truncate ${v.status === 'blocked' ? 'text-red-600 font-extrabold' : 'text-slate-900 group-hover:text-emerald-700'}`}>{v.full_name}</h4>
                                                <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mt-1">
                                                    DNI {v.dni} • {v.category || 'PERMANENTE'} {v.employer ? `• AUTORIZADO POR: ${v.employer}` : ''}
                                                </p>
                                                {(v.start_date || v.end_date) && (
                                                  <p className="text-[8px] text-emerald-600 font-black uppercase tracking-widest mt-1">
                                                    VIGENCIA: {v.start_date ? new Date(v.start_date).toLocaleDateString() : '---'} AL {v.end_date ? new Date(v.end_date).toLocaleDateString() : '---'}
                                                  </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {v.status !== 'blocked' && (
                                                <button 
                                                    onClick={() => setManualEntryVisitor({ ...v, role: 'worker' })}
                                                    className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                                >
                                                    INGRESAR
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => toggleBlockPermanente(v.id, v.status)}
                                                className={`px-4 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm ${v.status === 'blocked' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}
                                            >
                                                {v.status === 'blocked' ? 'Habilitar' : 'Bloquear'}
                                            </button>
                                            <button 
                                                onClick={() => handleDeletePermanente(v.id)}
                                                className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white p-3 rounded-xl transition-all border border-red-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center shadow-inner">
                                    <ShieldCheck className="w-12 h-12 text-slate-300 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">No hay permanentes en esa búsqueda</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'propietarios' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50">
                    <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Building2 className="w-6 h-6 text-emerald-600" />
                            <h3 className="font-black uppercase tracking-widest text-slate-900 text-sm">Vecinos Activos ({allOwners.length})</h3>
                        </div>
                        
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="BUSCAR POR NOMBRE O LOTE..."
                                value={ownerSearch}
                                onChange={(e) => setOwnerSearch(e.target.value.toUpperCase())}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 divide-y divide-slate-100">
                        {allOwners.filter(owner => 
                            owner.full_name?.toLowerCase().includes(ownerSearch.toLowerCase()) || 
                            owner.lote?.toString().includes(ownerSearch)
                        ).length > 0 ? (
                            allOwners.filter(owner => 
                                owner.full_name?.toLowerCase().includes(ownerSearch.toLowerCase()) || 
                                owner.lote?.toString().includes(ownerSearch)
                            ).map((owner) => (
                                <div key={owner.id} className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 group hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center font-black text-emerald-600 shadow-sm">{owner.lote}</div>
                                        <div>
                                            <h4 className="font-extrabold uppercase text-slate-900 group-hover:text-emerald-700 transition-colors">{owner.full_name}</h4>
                                            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">{owner.email || 'SIN EMAIL'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${owner.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>{owner.status === 'active' ? 'ACTIVO' : 'BLOQUEADO'}</span>
                                        <button onClick={() => handleBlockOwner(owner.id, owner.status)} className="p-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all text-slate-400 hover:text-slate-600"><Lock className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-20 text-center text-[10px] font-black uppercase text-slate-400 italic tracking-[0.3em]">
                                No se encontraron vecinos con esa búsqueda
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'historial' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 ml-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <History className="w-5 h-5 text-emerald-600" />
                            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400">Historial de Auditoría (90 días)</h3>
                        </div>
                        <button 
                            onClick={handleClearHistory}
                            className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 border border-red-100 shadow-sm"
                        >
                            <Trash2 className="w-3 h-3" />
                            Limpiar Historial Finalizado
                        </button>
                    </div>
                    
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="BUSCAR POR NOMBRE, DNI O LOTE..."
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value.toUpperCase())}
                            className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Visitante</th>
                                    <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Documento</th>
                                    <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Lote</th>
                                    <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Fecha</th>
                                    <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Entrada</th>
                                    <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Salida</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {historyRecords.filter(r => 
                                    r.full_name?.toLowerCase().includes(historySearch.toLowerCase()) || 
                                    r.dni?.includes(historySearch) ||
                                    r.invitations?.profiles?.lote?.toString().includes(historySearch)
                                ).length > 0 ? historyRecords.filter(r => 
                                    r.full_name?.toLowerCase().includes(historySearch.toLowerCase()) || 
                                    r.dni?.includes(historySearch) ||
                                    r.invitations?.profiles?.lote?.toString().includes(historySearch)
                                ).map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-5 font-extrabold uppercase text-xs text-slate-900">
                                            <div className="flex items-center gap-3">
                                                {r.full_name}
                                                <button 
                                                    onClick={() => handleDeleteHistoryRecord(r.id, r.dni)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all border border-red-100"
                                                    title="Eliminar Registro"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-5 font-extrabold text-[10px] text-slate-500">DNI {r.dni}</td>
                                        <td className="p-5 font-black text-[10px] text-emerald-600">LOTE {r.invitations?.profiles?.lote || '--'}</td>
                                        <td className="p-5 text-[10px] text-slate-500 font-extrabold">{r.updated_at ? new Date(r.updated_at).toLocaleDateString('es-AR') : '--'}</td>
                                        <td className="p-5 text-[10px] text-emerald-600 font-black">
                                            {r.entry_at ? new Date(r.entry_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                        </td>
                                        <td className="p-5 text-[10px] text-red-500 font-black">
                                            {r.exit_at ? new Date(r.exit_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center text-[10px] font-black uppercase text-slate-300 italic tracking-[0.3em]">
                                            No hay registros que coincidan con la búsqueda
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
            <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
                <div className="bg-white w-full max-w-4xl border border-slate-200 rounded-[3rem] shadow-2xl overflow-hidden my-8">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{viewingAuth.full_name}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Auditoría de Identidad • DNI {viewingAuth.dni}</p>
                        </div>
                        <button onClick={() => { setViewingAuth(null); setVisitorHistory([]); }} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X className="w-6 h-6" /></button>
                    </div>
                    
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-6">
                            {/* DNI FRENTE */}
                            {viewingAuth.dni_front_url && (
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 ml-2">DNI Frente</p>
                                <div className="relative aspect-square rounded-[2rem] overflow-hidden border border-slate-200 group bg-slate-50 flex items-center justify-center shadow-inner">
                                    <img src={viewingAuth.dni_front_url} className="w-full h-full object-cover" alt="DNI Frente" />
                                    <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setZoomedImg(viewingAuth.dni_front_url)} className="p-3 bg-emerald-600 rounded-full text-white shadow-lg shadow-emerald-500/20"><Maximize2 className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            </div>
                            )}

                            {/* DNI DORSO */}
                            {viewingAuth.dni_back_url && (
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 ml-2">DNI Dorso</p>
                                <div className="relative aspect-square rounded-[2rem] overflow-hidden border border-slate-200 group bg-slate-50 flex items-center justify-center shadow-inner">
                                    <img src={viewingAuth.dni_back_url} className="w-full h-full object-cover" alt="DNI Dorso" />
                                    <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setZoomedImg(viewingAuth.dni_back_url)} className="p-3 bg-emerald-600 rounded-full text-white shadow-lg shadow-emerald-500/20"><Maximize2 className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            </div>
                            )}

                            {/* SELFIE */}
                            {viewingAuth.selfie_url && (
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 ml-2">Selfie</p>
                                <div className="relative aspect-square rounded-[2rem] overflow-hidden border border-slate-200 group bg-slate-50 flex items-center justify-center shadow-inner">
                                    <img src={viewingAuth.selfie_url} className="w-full h-full object-cover" alt="Selfie" />
                                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setZoomedImg(viewingAuth.selfie_url)} className="p-3 bg-emerald-600 rounded-full text-white shadow-lg shadow-emerald-500/20"><Maximize2 className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            </div>
                            )}

                            {/* SEGURO FRENTE */}
                            {viewingAuth.vehicle_insurance_url && (
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 ml-2">Seguro Frente</p>
                                <div className="relative aspect-square rounded-[2rem] overflow-hidden border border-slate-200 group bg-slate-50 flex items-center justify-center shadow-inner">
                                    <img src={viewingAuth.vehicle_insurance_url} className="w-full h-full object-cover" alt="Seguro Frente" />
                                    <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setZoomedImg(viewingAuth.vehicle_insurance_url)} className="p-3 bg-emerald-600 rounded-full text-white shadow-lg shadow-emerald-500/20"><Maximize2 className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            </div>
                            )}

                            {/* SEGURO DORSO */}
                            {viewingAuth.vehicle_insurance_back_url && (
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 ml-2">Seguro Dorso</p>
                                <div className="relative aspect-square rounded-[2rem] overflow-hidden border border-slate-200 group bg-slate-50 flex items-center justify-center shadow-inner">
                                    <img src={viewingAuth.vehicle_insurance_back_url} className="w-full h-full object-cover" alt="Seguro Dorso" />
                                    <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setZoomedImg(viewingAuth.vehicle_insurance_back_url)} className="p-3 bg-emerald-600 rounded-full text-white shadow-lg shadow-emerald-500/20"><Maximize2 className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            </div>
                            )}

                            {/* ART */}
                            {viewingAuth.work_insurance_url && (
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 ml-2">Seguro ART</p>
                                <div className="relative aspect-square rounded-[2rem] overflow-hidden border border-slate-200 group bg-slate-50 flex items-center justify-center shadow-inner">
                                    <img src={viewingAuth.work_insurance_url} className="w-full h-full object-cover" alt="ART" />
                                    <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setZoomedImg(viewingAuth.work_insurance_url)} className="p-3 bg-emerald-600 rounded-full text-white shadow-lg shadow-emerald-500/20"><Maximize2 className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            </div>
                            )}
                        </div>

                        {viewingAuth.vehicle_patente && (
                            <div className="md:col-span-2 bg-slate-50 border border-slate-200 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 shadow-inner">
                                <div className="flex items-center gap-6">
                                    <div className="p-5 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                                        <Car className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Información del Vehículo</p>
                                        <h4 className="text-2xl font-black uppercase text-slate-900 tracking-tighter leading-none">{viewingAuth.vehicle_modelo || '---'}</h4>
                                        <p className="text-sm font-black text-emerald-600 tracking-[0.2em] mt-2">{viewingAuth.vehicle_patente} • Año {viewingAuth.vehicle_anio || '--'}</p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col items-center gap-3">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Validación de Seguro (Guardia)</p>
                                    <div className="flex p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm gap-2">
                                        {[
                                            {id: 'VIGENTE', color: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20', label: 'VIGENTE'},
                                            {id: 'IMPAGO', color: 'bg-amber-500 text-white shadow-lg shadow-amber-500/20', label: 'IMPAGO'},
                                            {id: 'VENCIDO', color: 'bg-red-600 text-white shadow-lg shadow-red-500/20', label: 'VENCIDO'}
                                        ].map(s => (
                                            <button 
                                                key={s.id}
                                                onClick={() => updateInsuranceStatus(viewingAuth.id, s.id, !!viewingAuth.isMaster)}
                                                className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${viewingAuth.insurance_status === s.id ? s.color : 'hover:bg-slate-50 text-slate-400'}`}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="md:col-span-2">
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 ml-2">Historial Reciente</p>
                             <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {visitorHistory.length > 0 ? visitorHistory.map(h => (
                                    <div key={h.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 shadow-inner">
                                                <Home className="w-3 h-3 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-slate-900">Lote {h.invitations?.profiles?.lote}</p>
                                                <p className="text-[8px] font-extrabold text-slate-400">{new Date(h.updated_at).toLocaleDateString('es-AR')}</p>
                                            </div>
                                        </div>
                                        <p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                            {h.status === 'completed' ? 'Salida' : 'Ingreso'} • {new Date(h.updated_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}hs
                                        </p>
                                    </div>
                                )) : (
                                    <div className="py-10 bg-slate-50 rounded-2xl text-center border-2 border-dashed border-slate-200 shadow-inner">
                                        <p className="text-[9px] font-black uppercase text-slate-400 italic">No hay ingresos previos registrados</p>
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>

                    <div className="p-8 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            {!viewingAuth.face_descriptor && (
                                <button 
                                    disabled={isDetecting}
                                    onClick={handleAnalizarBiometria}
                                    className="px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl border border-blue-200 font-extrabold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
                                >
                                    {isDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                    Analizar Biometría
                                </button>
                            )}
                            {viewingAuth.face_descriptor && (
                                <div className="px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-sm">
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
                                className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/10 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                <CheckCircle className="w-5 h-5" />
                                {viewingAuth.isOwner ? 'Activar Propietario' : 'Aprobar Identidad'}
                            </button>
                            <button 
                                onClick={() => viewingAuth.isOwner ? handleBlockOwner(viewingAuth.id, 'pending') : handleRejectVisitor(viewingAuth.id)}
                                className="flex-1 sm:flex-initial bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-8 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-sm"
                            >
                                <UserX className="w-5 h-5" />
                                {viewingAuth.isOwner ? 'Rechazar' : 'Rechazar'}
                            </button>
                          </>
                        ) : (
                          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-6">
                             <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 font-black text-xs uppercase tracking-widest shadow-sm">
                                <ShieldCheck className="w-5 h-5" />
                                Identidad Verificada
                             </div>
                             <button 
                                onClick={() => setViewingAuth(null)}
                                className="w-full sm:w-auto px-12 bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
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
            <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-md border border-slate-200 rounded-[3rem] shadow-2xl overflow-hidden p-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Ingreso Manual</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Asignar destino para {manualEntryVisitor.full_name}</p>
                        </div>
                        <button onClick={() => setManualEntryVisitor(null)} className="p-3 bg-slate-50 border border-slate-100 rounded-full hover:bg-slate-100 transition-all text-slate-400"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Lote Destino</label>
                            <input 
                                type="text"
                                value={manualEntryLote}
                                onChange={(e) => setManualEntryLote(e.target.value)}
                                placeholder="EJ: 114"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black uppercase tracking-widest focus:border-emerald-500/50 transition-all text-slate-900 shadow-inner"
                            />
                        </div>
                        <button 
                            onClick={handleConfirmManualEntry}
                            disabled={!manualEntryLote || loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/10 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5 text-white" />}
                            Confirmar Ingreso
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isAddingVisitor && (
            <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-md border border-slate-200 rounded-[3rem] shadow-2xl overflow-hidden p-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Nueva Identidad</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Registro Manual de Invitado</p>
                        </div>
                        <button onClick={() => setIsAddingVisitor(false)} className="p-3 bg-slate-50 border border-slate-100 rounded-full hover:bg-slate-100 transition-all text-slate-400"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Nombre Completo</label>
                            <input 
                                type="text"
                                value={newVisitor.full_name}
                                onChange={(e) => setNewVisitor({...newVisitor, full_name: e.target.value.toUpperCase()})}
                                placeholder="JUAN PEREZ"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black uppercase tracking-widest focus:border-emerald-500/50 transition-all text-slate-900 shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">DNI / Documento</label>
                            <input 
                                type="text"
                                value={newVisitor.dni}
                                onChange={(e) => setNewVisitor({...newVisitor, dni: e.target.value})}
                                placeholder="12345678"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black uppercase tracking-widest focus:border-emerald-500/50 transition-all text-slate-900 shadow-inner"
                            />
                        </div>
                        <button 
                            onClick={handleSaveManualVisitor}
                            disabled={!newVisitor.dni || !newVisitor.full_name || loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/10 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5" />}
                            Guardar Identidad
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
        {isAddingTrabajador && (
            <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-white border border-slate-200 w-full max-w-lg rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.1)] overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                    <div className="p-10 border-b border-slate-100 bg-emerald-50/50">
                        <div className="flex items-center justify-between mb-2">
                             <div className="p-3 bg-white rounded-2xl text-emerald-600 border border-emerald-100 shadow-sm">
                                <UserPlus className="w-6 h-6" />
                             </div>
                             <button onClick={() => setIsAddingTrabajador(false)} className="p-3 bg-white border border-slate-100 rounded-full text-slate-400 hover:bg-slate-50 transition-all"><X className="w-6 h-6" /></button>
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Nuevo Trabajador</h3>
                        <p className="text-emerald-700 text-[10px] font-black uppercase tracking-widest">Registra personal permanente para el barrio</p>
                    </div>
                    
                    <div className="p-10 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    placeholder="EJ: JUAN PEREZ"
                                    value={newTrabajador.full_name}
                                    onChange={(e) => setNewTrabajador({...newTrabajador, full_name: e.target.value.toUpperCase()})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black uppercase tracking-widest text-slate-900 focus:border-emerald-500/50 transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">DNI</label>
                                <input 
                                    type="text" 
                                    placeholder="SÓLO NÚMEROS"
                                    value={newTrabajador.dni}
                                    onChange={(e) => setNewTrabajador({...newTrabajador, dni: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black uppercase tracking-widest text-slate-900 focus:border-emerald-500/50 transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Categoría</label>
                                <input 
                                    type="text" 
                                    placeholder="EJ: JARDINERO"
                                    value={newTrabajador.category}
                                    onChange={(e) => setNewTrabajador({...newTrabajador, category: e.target.value.toUpperCase()})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black uppercase tracking-widest text-slate-900 focus:border-emerald-500/50 transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Empleador / Lote</label>
                                <input 
                                    type="text" 
                                    placeholder="EJ: LOTE 120"
                                    value={newTrabajador.employer}
                                    onChange={(e) => setNewTrabajador({...newTrabajador, employer: e.target.value.toUpperCase()})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black uppercase tracking-widest text-slate-900 focus:border-emerald-500/50 transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        {/* DOCUMENTACIÓN TRABAJADOR */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Documentación Obligatoria</p>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    {id: 'selfie', label: 'Selfie', icon: Users},
                                    {id: 'dni_front', label: 'DNI Front', icon: ImageIcon},
                                    {id: 'dni_back', label: 'DNI Back', icon: ImageIcon},
                                    {id: 'insurance_front', label: 'Seguro F', icon: ShieldCheck},
                                    {id: 'insurance_back', label: 'Seguro D', icon: ShieldCheck},
                                    {id: 'art', label: 'ART', icon: Briefcase}
                                ].map(p => (
                                    <div key={p.id} className="space-y-2">
                                        <div className="relative aspect-square bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden group shadow-inner">
                                            {manualCapturedPhotos[p.id as keyof typeof manualCapturedPhotos] ? (
                                                <>
                                                    <img src={manualCapturedPhotos[p.id as keyof typeof manualCapturedPhotos]} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => startManualCamera(p.id)} className="p-2 bg-emerald-500 rounded-full text-white"><Camera className="w-4 h-4" /></button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <p className="text-[7px] font-black text-slate-400 uppercase">{p.label}</p>
                                                    <button 
                                                        onClick={() => startManualCamera(p.id)}
                                                        className="mt-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-black text-[7px] uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1 shadow-lg shadow-emerald-500/10"
                                                    >
                                                       <Camera className="w-3 h-3 text-white" /> Tomar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={handleAddTrabajador}
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Guardar Trabajador</>}
                        </button>
                    </div>

                </div>
            </div>
        )}
        {isAddingPermanente && (
            <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-white border border-slate-200 w-full max-w-lg rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.1)] overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                    <div className="p-10 border-b border-slate-100 bg-emerald-50/50">
                        <div className="flex items-center justify-between mb-2">
                             <div className="p-3 bg-white rounded-2xl text-emerald-600 border border-emerald-100 shadow-sm">
                                <UserPlus className="w-6 h-6" />
                             </div>
                             <button onClick={() => setIsAddingPermanente(false)} className="p-3 bg-white border border-slate-100 rounded-full text-slate-400 hover:bg-slate-50 transition-all"><X className="w-6 h-6" /></button>
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Nuevo Permanente</h3>
                        <p className="text-emerald-700 text-[10px] font-black uppercase tracking-widest">Familiares o servicios con acceso fijo</p>
                    </div>
                    
                    <div className="p-10 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    placeholder="EJ: ANA MARÍA"
                                    value={newPermanente.full_name}
                                    onChange={(e) => setNewPermanente({...newPermanente, full_name: e.target.value.toUpperCase()})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black uppercase tracking-widest text-slate-900 focus:border-emerald-500/50 transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">DNI</label>
                                <input 
                                    type="text" 
                                    placeholder="SÓLO NÚMEROS"
                                    value={newPermanente.dni}
                                    onChange={(e) => setNewPermanente({...newPermanente, dni: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black uppercase tracking-widest text-slate-900 focus:border-emerald-500/50 transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Categoría</label>
                                <input 
                                    type="text" 
                                    placeholder="EJ: FAMILIAR"
                                    value={newPermanente.category}
                                    onChange={(e) => setNewPermanente({...newPermanente, category: e.target.value.toUpperCase()})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black uppercase tracking-widest text-slate-900 focus:border-emerald-500/50 transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Vinculación / Lote</label>
                                <input 
                                    type="text" 
                                    placeholder="EJ: LOTE 210"
                                    value={newPermanente.employer}
                                    onChange={(e) => setNewPermanente({...newPermanente, employer: e.target.value.toUpperCase()})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black uppercase tracking-widest text-slate-900 focus:border-emerald-500/50 transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        {/* DOCUMENTACIÓN PERMANENTE */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Fotos de Identidad</p>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    {id: 'selfie', label: 'Selfie', icon: Users},
                                    {id: 'dni_front', label: 'DNI Front', icon: ImageIcon},
                                    {id: 'dni_back', label: 'DNI Back', icon: ImageIcon}
                                ].map(p => (
                                    <div key={p.id} className="space-y-2">
                                        <div className="relative aspect-square bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden group shadow-inner">
                                            {manualCapturedPhotos[p.id as keyof typeof manualCapturedPhotos] ? (
                                                <>
                                                    <img src={manualCapturedPhotos[p.id as keyof typeof manualCapturedPhotos]} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => startManualCamera(p.id)} className="p-2 bg-emerald-500 rounded-full text-white"><Camera className="w-4 h-4" /></button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <p className="text-[7px] font-black text-slate-400 uppercase">{p.label}</p>
                                                    <button 
                                                        onClick={() => startManualCamera(p.id)}
                                                        className="mt-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-black text-[7px] uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1 shadow-lg shadow-emerald-500/10"
                                                    >
                                                       <Camera className="w-3 h-3 text-white" /> Tomar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={handleAddPermanente}
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Guardar Permanente</>}
                        </button>
                    </div>

                </div>
            </div>
        )}
        
        {/* MODAL DE ZOOM PARA DOCUMENTACIÓN */}
        <AnimatePresence>
            {zoomedImg && (
                <div 
                    className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
                    onClick={() => setZoomedImg(null)}
                >
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center"
                    >
                        <img 
                            src={zoomedImg} 
                            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" 
                            alt="Zoom Document" 
                        />
                        <button 
                            className="fixed top-8 right-8 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
                            onClick={() => setZoomedImg(null)}
                        >
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* CAMERA OVERLAY (GUARD MANUAL ENTRY) */}
        <AnimatePresence>
            {isCapturingManual && (
                <div className="fixed inset-0 z-[400] bg-black flex flex-col items-center justify-center p-4">
                    <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-emerald-500/30">
                        <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${manualCaptureType === 'selfie' ? 'scale-x-[-1]' : ''}`} />
                        <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-4">
                            <button 
                                onClick={handleManualCapture}
                                className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl shadow-white/20 active:scale-90 transition-all group"
                            >
                                <div className="w-16 h-16 border-4 border-black/10 rounded-full group-hover:scale-110 transition-transform" />
                            </button>
                            <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] drop-shadow-lg">Capturar {manualCaptureType === 'selfie' ? 'Rostro' : 'Documento'}</p>
                        </div>
                        <button onClick={stopManualCamera} className="absolute top-8 right-8 p-4 bg-black/50 backdrop-blur-md rounded-full text-white"><X className="w-6 h-6" /></button>
                    </div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
}

