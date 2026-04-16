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
  Car, Zap, Clock
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

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500/10 overflow-x-hidden relative">
      {/* Mesh Background */}
      <div className="fixed inset-0 pointer-events-none opacity-40 z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-emerald-900/5 rounded-full blur-[100px]" />
      </div>
      
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

      <div className="max-w-7xl mx-auto p-6 md:p-12 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/5 luxury-card rounded-[2rem] flex items-center justify-center border border-white/5">
              <Building2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-500 tracking-tighter uppercase leading-none">
                {CONFIG.brandName}
              </h1>
              <p className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.5em] mt-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> {CONFIG.neighborhoodName} • GUARDIA
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden lg:block text-right mr-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/40">Guardia Activo</p>
                <p className="text-sm font-black text-white uppercase italic">Misión Control</p>
             </div>
             <button 
               onClick={() => { supabase.auth.signOut(); router.push("/"); }} 
               className="w-14 h-14 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 luxury-card rounded-2xl flex items-center justify-center group transition-all"
             >
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </header>

        <div className="horizontal-scroll pb-4 mb-12">
          <div className="flex p-2 bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/5 luxury-card w-fit gap-1 shadow-2xl">
            {[
              { id: 'accesos', label: 'Ingresos', icon: LogIn },
              { id: 'salidas', label: 'Egresos', icon: LogOutIcon },
              { id: 'delivery', label: 'Delivery', icon: Zap },
              { id: 'registros', label: 'Auditoría', icon: ShieldPlus },
              { id: 'identidades', label: 'Personas', icon: Users2 },
              { id: 'trabajadores', label: 'Trabajo', icon: Briefcase },
              { id: 'permanentes', label: 'Perma', icon: Clock },
              { id: 'historial', label: 'Historial', icon: History },
              { id: 'propietarios', label: 'Vecinos', icon: Home },
              { id: 'config', label: 'Ajustes', icon: Settings }
            ].map(tab => {
              const count = tab.id === 'registros' ? (pendingVisitors.length + pendingOwners.length) : 
                            tab.id === 'delivery' ? deliveryInvitations.filter(d => d.delivery_count < d.delivery_quantity).length : 0;
              
              return (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id as any)} 
                  className={`relative px-6 py-3.5 rounded-[1.2rem] font-black text-[9px] uppercase tracking-[0.15em] transition-all flex items-center gap-3 whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                      : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-[8px] font-black text-white border-2 border-slate-900 animate-pulse">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'accesos' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="luxury-card p-10 bg-gradient-to-br from-emerald-600 to-emerald-900 text-white relative overflow-hidden group border border-white/5 shadow-2xl">
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-[80px] group-hover:bg-white/20 transition-all duration-1000" />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-3">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">Escáner IA Inteligente</h3>
                  <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.3em]">Detecta automáticamente a cualquier invitado del día</p>
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
                  className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-10 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-white hover:text-emerald-900 active:scale-95 transition-all flex items-center gap-4"
                >
                  {isFaceApiLoaded ? <><Camera className="w-5 h-5" /> Iniciar IA</> : <Loader2 className="w-5 h-5 animate-spin" />}
                </button>
              </div>
            </div>

            {expectedToday.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 ml-2">
                  <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Invitados en camino ({expectedToday.length})</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {expectedToday.map((v, idx) => {
                      const displayName = (v as any).visitor_name || v.full_name || '—';
                      const displayLote = (v as any).profiles?.lote || v.invitations?.profiles?.lote || '—';
                      return (
                        <motion.div key={v.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} layout
                          className="luxury-card p-6 flex items-center justify-between gap-6 group hover:border-emerald-500/30 transition-colors bg-slate-900/40 border border-white/5"
                        >
                          <div className="flex items-center gap-5 flex-1 cursor-pointer" onClick={() => startCamera(true, v)}>
                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center font-black text-emerald-500 text-lg border border-white/5">
                              {displayName[0].toUpperCase()}
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-black uppercase text-white tracking-tight">{displayName}</h4>
                              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Lote {displayLote}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleStatusUpdate(v.id, 'inside', (v as any).invitations?.id || (v as any).id)} 
                              className="h-10 px-6 bg-emerald-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/10 hover:bg-emerald-500 transition-all active:scale-95">
                              Ingresar
                            </button>
                            <button onClick={() => handleDeleteRecord(v.id)} className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-red-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'delivery' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-4">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-[#064e3b] uppercase tracking-tighter">Control de Delivery</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Pases activos para el {getLocalDate()}</p>
              </div>
              <div className="w-full md:w-80 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="text" value={deliverySearch} onChange={e => setDeliverySearch(e.target.value)} placeholder="Filtrar lote o residente..."
                  className="w-full h-14 luxury-input pl-12 pr-4 rounded-2xl text-[10px] font-black uppercase" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {deliveryInvitations.filter(inv => {
                  const searchMatch = inv.profiles?.lote?.toString().includes(deliverySearch) || inv.profiles?.full_name?.toLowerCase().includes(deliverySearch.toLowerCase());
                  const isFullyExited = (inv.delivery_exit_count || 0) >= inv.delivery_quantity;
                  return searchMatch && !isFullyExited;
                }).map((inv, idx) => {
                  const entries = inv.delivery_count || 0;
                  const exits = inv.delivery_exit_count || 0;
                  const max = inv.delivery_quantity;
                  const insideNow = entries - exits;
                  const isFullyEntered = entries >= max;

                  return (
                    <motion.div key={inv.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} layout
                      className="luxury-card p-6 space-y-6 relative overflow-hidden group bg-slate-900/40 border border-white/5 shadow-2xl">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Residente</p>
                          <h4 className="text-xs font-black uppercase text-white">{inv.profiles?.full_name}</h4>
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Lote {inv.profiles?.lote}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                          <Zap className={`w-5 h-5 ${insideNow > 0 ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-slate-700'}`} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-[8px] font-black text-slate-500 uppercase">Ingresos</span>
                             <LogIn className="w-3 h-3 text-slate-600" />
                          </div>
                          <p className="text-sm font-black text-white">{entries}<span className="text-slate-600 mx-1">/</span>{max}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-[8px] font-black text-slate-500 uppercase">Egresos</span>
                             <LogOutIcon className="w-3 h-3 text-slate-600" />
                          </div>
                          <p className="text-sm font-black text-white">{exits}<span className="text-slate-600 mx-1">/</span>{max}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button disabled={isFullyEntered} onClick={() => handleDeliveryAction(inv, 'entry')}
                          className={`flex-1 h-12 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${isFullyEntered ? 'opacity-20' : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-900/20'}`}>
                          Ingreso
                        </button>
                        <button disabled={insideNow <= 0} onClick={() => handleDeliveryAction(inv, 'exit')}
                          className={`flex-1 h-12 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${insideNow <= 0 ? 'opacity-20' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-95'}`}>
                          Egreso
                        </button>
                      </div>
                      
                      {insideNow > 0 && <div className="absolute top-0 right-0 p-1 bg-amber-500/20 text-amber-500 text-[6px] font-black uppercase px-2 rounded-bl-lg border-l border-b border-amber-500/20">En Barrio</div>}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {activeTab === 'salidas' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="luxury-card p-10 bg-gradient-to-br from-red-900 to-red-950 text-white relative overflow-hidden group">
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-red-500/10 rounded-full blur-[80px] group-hover:bg-red-400/20 transition-all duration-1000" />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-3">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">Control de Egreso IA</h3>
                  <p className="text-red-300/80 text-[10px] font-black uppercase tracking-[0.3em]">Salida automática por reconocimiento facial</p>
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
                  className="bg-red-600 text-white px-10 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-900/40 hover:bg-red-500 hover:scale-105 active:scale-95 transition-all flex items-center gap-4 border border-red-500/50"
                >
                  {isFaceApiLoaded ? <><Camera className="w-5 h-5" /> Iniciar Salida IA</> : <Loader2 className="w-5 h-5 animate-spin" />}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4 ml-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Personas en el Barrio ({insideNeighborhood.length})</h4>
              </div>
              
              {insideNeighborhood.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {insideNeighborhood.map((v, idx) => (
                        <motion.div key={v.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} layout
                          className="luxury-card p-6 flex items-center justify-between gap-6 group hover:border-red-500/30 transition-colors bg-slate-900/40 border border-white/5 shadow-xl">
                          <div className="flex items-center gap-5 flex-1">
                            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center font-black text-red-500 text-lg border border-red-500/20">
                              {v.full_name[0].toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase text-white tracking-tight">{v.full_name}</h4>
                              <p className="text-[9px] font-black text-red-400 uppercase tracking-widest italic">Ingresó {new Date(v.entry_at || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                          </div>
                          <button onClick={() => handleStatusUpdate(v.id, 'completed', (v as any).invitations?.id)}
                            className="h-10 px-6 bg-white/5 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border border-red-500/20 active:scale-95 shadow-lg shadow-red-900/10">
                            Confirmar Salida
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="py-20 luxury-card bg-slate-900/20 border-dashed border border-white/10 flex flex-col items-center justify-center text-center">
                    <LogOutIcon className="w-12 h-12 mb-4 text-slate-700" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 italic">No hay visitas activas en el barrio</p>
                  </div>
                )}
            </div>
          </div>
        )}

        {activeTab === 'registros' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center gap-4 ml-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Auditoría de Identidad ({pendingVisitors.length + pendingOwners.length})</h3>
            </div>
            
            {(pendingVisitors.length + pendingOwners.length) > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {pendingOwners.map((v, idx) => (
                    <motion.div key={v.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} layout
                      className="luxury-card p-6 flex items-center justify-between gap-6 group hover:border-[#10b981]/50 shadow-xl shadow-black/[0.02] transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#064e3b]">
                          <Home className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800 tracking-tight">{v.full_name}</h4>
                          <p className="text-[9px] font-black text-[#10b981] uppercase tracking-widest">NUEVO VECINO • LOTE {v.lote}</p>
                        </div>
                      </div>
                      <button onClick={() => setViewingAuth({ ...v, isOwner: true, id: v.id })}
                        className="h-12 px-8 bg-[#064e3b] text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-[#064e3b]/10 hover:bg-black transition-all">
                        AUDITAR
                      </button>
                    </motion.div>
                  ))}

                  {pendingVisitors.map((v, idx) => (
                    <motion.div key={v.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (idx + pendingOwners.length) * 0.05 }} layout
                      className="luxury-card p-6 flex items-center justify-between gap-6 group hover:border-blue-200 shadow-xl shadow-black/[0.02] transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                          <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800 tracking-tight">{v.full_name}</h4>
                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">VISITA • LOTE {v.invitations?.profiles?.lote}</p>
                        </div>
                      </div>
                      <button onClick={() => setViewingAuth({ ...v, isOwner: false, id: v.id })}
                        className="h-12 px-8 bg-[#064e3b] text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-[#064e3b]/10 hover:bg-black transition-all">
                        AUDITAR
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="py-20 luxury-card bg-white border-dashed border-2 flex flex-col items-center justify-center text-center opacity-40">
                <ShieldCheck className="w-12 h-12 mb-4 text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-widest italic">No hay registros pendientes de revisión</p>
              </div>
            )}
          </div>
        )}





        {activeTab === 'config' && (
          <div className="max-w-xl mx-auto space-y-12 animate-in fade-in duration-700 mt-8">
            <div className="luxury-card p-10 bg-white relative overflow-hidden">
              <div className="flex items-center gap-5 mb-10">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#064e3b]">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#064e3b] uppercase tracking-tighter">Seguridad</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Credenciales de acceso</p>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Nueva Contraseña</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••"
                      className="w-full h-14 luxury-input px-6 rounded-2xl text-xs font-black" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Confirmar Contraseña</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••"
                      className="w-full h-14 luxury-input px-6 rounded-2xl text-xs font-black" />
                 </div>
                 <button onClick={handleUpdateGuardPassword} disabled={isUpdatingPassword}
                   className="w-full h-16 bg-[#064e3b] text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-black transition-all">
                   {isUpdatingPassword ? "..." : "Guardar Clave"}
                 </button>
              </div>
            </div>

            <div className="luxury-card p-10 bg-white relative overflow-hidden">
              <div className="flex items-center gap-5 mb-10">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#064e3b]">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#064e3b] uppercase tracking-tighter">Perfil</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Identificación de Terminal</p>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Nuevo Identificador</label>
                    <input type="text" value={newGuardUsername} onChange={e => setNewGuardUsername(e.target.value.toUpperCase())} placeholder="GUARDIA PRINCIPAL"
                      className="w-full h-14 luxury-input px-6 rounded-2xl text-xs font-black" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Confirmar Identificador</label>
                    <input type="text" value={confirmGuardUsername} onChange={e => setConfirmGuardUsername(e.target.value.toUpperCase())} placeholder="GUARDIA PRINCIPAL"
                      className="w-full h-14 luxury-input px-6 rounded-2xl text-xs font-black" />
                 </div>
                 <button onClick={handleUpdateGuardName} disabled={isUpdatingName}
                   className="w-full h-16 bg-[#064e3b] text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-black transition-all">
                   {isUpdatingName ? "..." : "Guardar Perfil"}
                 </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'identidades' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-[#064e3b] uppercase tracking-tighter">Identidades</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                   <UserCheck className="w-3 h-3" /> Banco Maestro ({approvedVisitors.length})
                </p>
              </div>
              <div className="w-full md:w-80 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="text" value={identidadesSearch} onChange={e => setIdentidadesSearch(e.target.value)} placeholder="Filtrar DNI o Nombre..."
                  className="w-full h-14 luxury-input pl-12 pr-4 rounded-2xl text-[10px] font-black uppercase" />
              </div>
            </div>

            <button onClick={() => setIsAddingVisitor(true)}
              className="w-full h-20 bg-white luxury-card rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-4 hover:border-emerald-500 transition-all group">
              <UserPlus className="w-5 h-5 text-[#064e3b] group-hover:scale-110 transition-transform" /> 
              Registrar Identidad Maestra
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {approvedVisitors.filter(v => 
                    v.full_name?.toLowerCase().includes(identidadesSearch.toLowerCase()) || 
                    v.dni?.includes(identidadesSearch)
                ).map((v, idx) => (
                  <motion.div key={v.dni} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} layout
                    className="luxury-card p-6 flex flex-col gap-6 group hover:border-emerald-200 transition-colors">
                     <div className="flex items-center gap-5">
                       <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-[#064e3b] text-lg">
                         {v.full_name[0].toUpperCase()}
                       </div>
                       <div className="min-w-0">
                         <h4 className="text-xs font-black uppercase text-slate-800 tracking-tight truncate">{v.full_name}</h4>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DNI {v.dni}</p>
                       </div>
                     </div>
                     <div className="flex gap-2">
                       <button onClick={() => setManualEntryVisitor(v)}
                         className="flex-1 h-12 bg-[#064e3b] text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg shadow-[#064e3b]/10 hover:bg-black transition-all">
                         INGRESAR
                       </button>
                       <button onClick={() => { setViewingAuth(v); fetchVisitorHistory(v.dni); }}
                         className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-[#064e3b] hover:text-white rounded-xl transition-all">
                         <Search className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDeleteVisitor(v.dni)}
                         className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-300 hover:bg-red-600 hover:text-white rounded-xl transition-all">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {activeTab === 'trabajadores' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-[#064e3b] uppercase tracking-tighter">Trabajadores</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                   <Briefcase className="w-3 h-3" /> Personal Permanente ({trabajadores.length})
                </p>
              </div>
              <div className="w-full md:w-80 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="text" value={trabajadoresSearch} onChange={e => setTrabajadoresSearch(e.target.value)} placeholder="Buscar trabajador..."
                  className="w-full h-14 luxury-input pl-12 pr-4 rounded-2xl text-[10px] font-black uppercase" />
              </div>
            </div>

            <button onClick={() => setIsAddingTrabajador(true)}
              className="w-full h-20 bg-white luxury-card rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-4 hover:border-emerald-500 transition-all group">
              <UserPlus className="w-5 h-5 text-[#064e3b] group-hover:scale-110 transition-transform" /> 
              Registrar Nuevo Trabajador
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {trabajadores.filter(v => 
                    v.full_name?.toLowerCase().includes(trabajadoresSearch.toLowerCase()) || 
                    v.dni?.includes(trabajadoresSearch)
                ).map((v, idx) => (
                  <motion.div key={v.dni} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} layout
                    className={`luxury-card p-6 flex flex-col gap-6 group transition-all ${v.status === 'blocked' ? 'opacity-60 bg-red-50/30' : 'hover:border-emerald-200'}`}>
                     <div className="flex items-center gap-5">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${v.status === 'blocked' ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-[#064e3b]'}`}>
                         {v.full_name[0].toUpperCase()}
                       </div>
                       <div className="min-w-0">
                         <h4 className={`text-xs font-black uppercase tracking-tight truncate ${v.status === 'blocked' ? 'text-red-600' : 'text-slate-800'}`}>{v.full_name}</h4>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">DNI {v.dni} • {v.category || 'EXTERNO'}</p>
                       </div>
                     </div>

                     {v.status === 'blocked' && (
                       <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-100 flex items-center gap-2">
                         <ShieldAlert className="w-3 h-3 text-red-600" />
                         <span className="text-[7px] font-black text-red-600 uppercase tracking-widest">Acceso Bloqueado</span>
                       </div>
                     )}

                     <div className="flex gap-2">
                       {v.status !== 'blocked' && (
                         <button onClick={() => setManualEntryVisitor({ ...v, role: 'worker' })}
                           className="flex-1 h-12 bg-[#064e3b] text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">
                           INGRESAR
                         </button>
                       )}
                       <button onClick={() => toggleBlockTrabajador(v.id, v.status)}
                         className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all border ${v.status === 'blocked' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white' : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-600 hover:text-white'}`}>
                         <Lock className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDeleteTrabajador(v.id)}
                         className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-300 hover:bg-red-600 hover:text-white rounded-xl transition-all">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {activeTab === 'permanentes' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-[#064e3b] uppercase tracking-tighter">Permanentes</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                   <ShieldCheck className="w-3 h-3" /> Accesos Fijos ({permanentes.length})
                </p>
              </div>
              <div className="w-full md:w-80 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="text" value={permanentesSearch} onChange={e => setPermanentesSearch(e.target.value)} placeholder="Buscar permanente..."
                  className="w-full h-14 luxury-input pl-12 pr-4 rounded-2xl text-[10px] font-black uppercase" />
              </div>
            </div>

            <button onClick={() => setIsAddingPermanente(true)}
              className="w-full h-20 bg-white luxury-card rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-4 hover:border-emerald-500 transition-all group">
              <UserPlus className="w-5 h-5 text-[#064e3b] group-hover:scale-110 transition-transform" /> 
              Registrar Nuevo Permanente
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {permanentes.filter(v => 
                    v.full_name?.toLowerCase().includes(permanentesSearch.toLowerCase()) || 
                    v.dni?.includes(permanentesSearch)
                ).map((v, idx) => (
                  <motion.div key={v.dni} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} layout
                    className={`luxury-card p-6 flex flex-col gap-6 group transition-all ${v.status === 'blocked' ? 'opacity-60 bg-red-50/30' : 'hover:border-emerald-200'}`}>
                     <div className="flex items-center gap-5">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${v.status === 'blocked' ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-[#064e3b]'}`}>
                         {v.full_name[0].toUpperCase()}
                       </div>
                       <div className="min-w-0">
                         <h4 className={`text-xs font-black uppercase tracking-tight truncate ${v.status === 'blocked' ? 'text-red-600' : 'text-slate-800'}`}>{v.full_name}</h4>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">DNI {v.dni} • {v.category || 'PERMANENTE'}</p>
                       </div>
                     </div>

                     {v.status === 'blocked' && (
                       <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-100 flex items-center gap-2">
                         <ShieldAlert className="w-3 h-3 text-red-600" />
                         <span className="text-[7px] font-black text-red-600 uppercase tracking-widest">Acceso Bloqueado</span>
                       </div>
                     )}

                     <div className="flex gap-2">
                       {v.status !== 'blocked' && (
                         <button onClick={() => setManualEntryVisitor({ ...v, role: 'worker' })}
                           className="flex-1 h-12 bg-[#064e3b] text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">
                           INGRESAR
                         </button>
                       )}
                       <button onClick={() => toggleBlockPermanente(v.id, v.status)}
                         className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all border ${v.status === 'blocked' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white' : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-600 hover:text-white'}`}>
                         <Lock className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDeletePermanente(v.id)}
                         className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-300 hover:bg-red-600 hover:text-white rounded-xl transition-all">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {activeTab === 'propietarios' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-[#064e3b] uppercase tracking-tighter">Vecinos</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                   <Building2 className="w-3 h-3" /> Residentes Activos ({allOwners.length})
                </p>
              </div>
              <div className="w-full md:w-80 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="text" value={ownerSearch} onChange={e => setOwnerSearch(e.target.value.toUpperCase())} placeholder="Buscar por Lote o Nombre..."
                  className="w-full h-14 luxury-input pl-12 pr-4 rounded-2xl text-[10px] font-black uppercase" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {allOwners.filter(owner => 
                    owner.full_name?.toLowerCase().includes(ownerSearch.toLowerCase()) || 
                    owner.lote?.toString().includes(ownerSearch)
                ).map((owner, idx) => (
                  <motion.div key={owner.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} layout
                    className="luxury-card p-6 flex items-center justify-between gap-6 group hover:border-[#10b981]/50 transition-all">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center font-black text-[#064e3b] text-lg shadow-sm">
                        {owner.lote}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black uppercase text-slate-800 tracking-tight truncate">{owner.full_name}</h4>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{owner.email || 'SIN EMAIL'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest ${owner.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {owner.status === 'active' ? 'ACTIVO' : 'BLOCK'}
                      </div>
                      <button onClick={() => handleBlockOwner(owner.id, owner.status)} 
                        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#064e3b] hover:border-[#064e3b] transition-all">
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 px-2">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-[#064e3b] uppercase tracking-tighter">Historial</h3>
                <div className="flex items-center gap-4">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Últimos 90 días</p>
                  <button onClick={handleClearHistory}
                    className="flex items-center gap-2 text-red-400 hover:text-red-600 text-[8px] font-black uppercase tracking-widest transition-colors">
                    <Trash2 className="w-3 h-3" /> Limpiar registros
                  </button>
                </div>
              </div>
              <div className="w-full md:w-80 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="text" value={historySearch} onChange={e => setHistorySearch(e.target.value.toUpperCase())} placeholder="Buscar registro..."
                  className="w-full h-14 luxury-input pl-12 pr-4 rounded-2xl text-[10px] font-black uppercase" />
              </div>
            </div>

            <div className="luxury-card overflow-hidden bg-slate-900/40 border border-white/5 backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                      {['Visitante', 'Documento', 'Lote', 'Fecha', 'Entrada', 'Salida'].map(h => (
                        <th key={h} className="p-6 text-[8px] font-black uppercase text-slate-500 tracking-[0.2em]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {historyRecords.filter(r => 
                      r.full_name?.toLowerCase().includes(historySearch.toLowerCase()) || r.dni?.includes(historySearch) || r.invitations?.profiles?.lote?.toString().includes(historySearch)
                    ).map((r, idx) => (
                      <tr key={r.id} className="group hover:bg-white/5 transition-colors">
                        <td className="p-6">
                           <div className="flex items-center gap-3">
                             <span className="text-xs font-black uppercase text-white">{r.full_name}</span>
                             <button onClick={() => handleDeleteHistoryRecord(r.id, r.dni)} className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-500 transition-all">
                               <Trash2 className="w-3 h-3" />
                             </button>
                           </div>
                        </td>
                        <td className="p-6"><span className="text-[10px] font-black text-slate-500 uppercase">DNI {r.dni}</span></td>
                        <td className="p-6"><span className="text-[10px] font-black text-emerald-500 uppercase">Lote {r.invitations?.profiles?.lote || '--'}</span></td>
                        <td className="p-6"><span className="text-[10px] font-black text-slate-600 uppercase">{r.updated_at ? new Date(r.updated_at).toLocaleDateString() : '--'}</span></td>
                        <td className="p-6"><span className="text-[10px] font-black text-emerald-400 uppercase">{r.entry_at ? new Date(r.entry_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--'}</span></td>
                        <td className="p-6"><span className="text-[10px] font-black text-red-400 uppercase">{r.exit_at ? new Date(r.exit_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {viewingAuth && (
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-slate-950 w-full max-w-5xl luxury-card overflow-hidden my-8 max-h-[90vh] flex flex-col shadow-2xl relative border border-white/10">
                    
                    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-900">
                        <div className="space-y-1">
                            <h3 className="text-3xl font-black uppercase tracking-tighter text-white italic">{viewingAuth.full_name}</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Terminal de Auditoría • ID {viewingAuth.dni}</p>
                        </div>
                        <button onClick={() => { setViewingAuth(null); setVisitorHistory([]); }} 
                          className="w-12 h-12 flex items-center justify-center bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-all border border-white/5">
                          <X className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* DNI FRENTE */}
                            {viewingAuth.dni_front_url && (
                             <div className="space-y-4">
                                 <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2 italic">DNI Anverso</p>
                                 <div className="luxury-card aspect-[4/3] relative group overflow-hidden bg-white/5 border border-white/10">
                                     <img src={viewingAuth.dni_front_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <button onClick={() => setZoomedImg(viewingAuth.dni_front_url)} className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl border border-white/20"><Maximize2 className="w-5 h-5 text-white" /></button>
                                     </div>
                                 </div>
                             </div>
                             )}
 
                             {/* DNI DORSO */}
                             {viewingAuth.dni_back_url && (
                             <div className="space-y-4">
                                 <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2 italic">DNI Reverso</p>
                                 <div className="luxury-card aspect-[4/3] relative group overflow-hidden bg-white/5 border border-white/10">
                                     <img src={viewingAuth.dni_back_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <button onClick={() => setZoomedImg(viewingAuth.dni_back_url)} className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl border border-white/20"><Maximize2 className="w-5 h-5 text-white" /></button>
                                     </div>
                                 </div>
                             </div>
                             )}
 
                             {/* SELFIE */}
                             {viewingAuth.selfie_url && (
                             <div className="space-y-4">
                                 <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2 italic">Retrato Biométrico</p>
                                 <div className="relative aspect-square rounded-[2rem] overflow-hidden border border-white/10 group bg-slate-900 flex items-center justify-center shadow-2xl">
                                     <img src={viewingAuth.selfie_url} className="w-full h-full object-cover" alt="Selfie" />
                                     <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                         <button onClick={() => setZoomedImg(viewingAuth.selfie_url)} className="p-4 bg-emerald-600 rounded-full text-white shadow-lg shadow-emerald-500/20 active:scale-90 transition-all"><Maximize2 className="w-6 h-6" /></button>
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
                            <div className="md:col-span-2 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 shadow-inner">
                                <div className="flex items-center gap-6">
                                    <div className="p-5 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                                        <Car className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Información del Vehículo</p>
                                        <h4 className="text-2xl font-black uppercase text-white tracking-tighter leading-none">{viewingAuth.vehicle_modelo || '---'}</h4>
                                        <p className="text-sm font-black text-emerald-500 tracking-[0.2em] mt-2">{viewingAuth.vehicle_patente} • Año {viewingAuth.vehicle_anio || '--'}</p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col items-center gap-3">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Validación de Seguro (Guardia)</p>
                                    <div className="flex p-1.5 bg-black/20 rounded-2xl border border-white/5 shadow-sm gap-2">
                                        {[
                                            {id: 'VIGENTE', color: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20', label: 'VIGENTE'},
                                            {id: 'IMPAGO', color: 'bg-amber-500 text-white shadow-lg shadow-amber-500/20', label: 'IMPAGO'},
                                            {id: 'VENCIDO', color: 'bg-red-600 text-white shadow-lg shadow-red-500/20', label: 'VENCIDO'}
                                        ].map(s => (
                                            <button 
                                                key={s.id}
                                                onClick={() => updateInsuranceStatus(viewingAuth.id, s.id, !!viewingAuth.isMaster)}
                                                className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${viewingAuth.insurance_status === s.id ? s.color : 'hover:bg-white/5 text-slate-500'}`}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="md:col-span-2">
                              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 ml-2 italic">Historial Reciente</p>
                              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                 {visitorHistory.length > 0 ? visitorHistory.map(h => (
                                     <div key={h.id} className="bg-white/5 border border-white/5 p-5 rounded-2xl flex items-center justify-between shadow-xl">
                                         <div className="flex items-center gap-4">
                                             <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                                 <Home className="w-4 h-4 text-emerald-500" />
                                             </div>
                                             <div>
                                                 <p className="text-[10px] font-black uppercase text-white">Lote {h.invitations?.profiles?.lote}</p>
                                                 <p className="text-[8px] font-extrabold text-slate-500">{new Date(h.updated_at).toLocaleDateString('es-AR')}</p>
                                             </div>
                                         </div>
                                         <p className="text-[9px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                                             {h.status === 'completed' ? 'Salida' : 'Ingreso'} • {new Date(h.updated_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}hs
                                         </p>
                                     </div>
                                 )) : (
                                     <div className="py-12 bg-black/20 rounded-[2.5rem] text-center border-2 border-dashed border-white/5">
                                         <p className="text-[9px] font-black uppercase text-slate-600 italic tracking-widest">No hay ingresos previos registrados</p>
                                     </div>
                                 )}
                              </div>
                         </div>
                     </div>
 
                     <div className="p-10 bg-slate-900 border-t border-white/5 flex flex-col md:flex-row gap-6 items-center justify-between">
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            {!viewingAuth.face_descriptor && (
                                <button disabled={isDetecting} onClick={handleAnalizarBiometria}
                                    className="h-14 px-8 bg-blue-50 text-blue-600 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-blue-600 hover:text-white group">
                                    {isDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                                    Generar Perfil Digital
                                </button>
                            )}
                             {viewingAuth.face_descriptor && (
                                 <div className="h-14 px-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 font-black text-[9px] uppercase tracking-[0.2em] flex items-center gap-3">
                                     <ShieldCheck className="w-4 h-4" />
                                     Bio-ID Activa
                                 </div>
                             )}
                         </div>
                         
                         <div className="flex gap-4 w-full md:w-auto">
                         {viewingAuth.status === 'pending' ? (
                           <>
                             <button onClick={() => viewingAuth.isOwner ? handleAuthorizeOwner(viewingAuth.id) : handleApproveVisitor(viewingAuth.id)}
                                 className="flex-1 md:flex-initial h-16 bg-emerald-600 text-white px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-900/40 hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-3">
                                 <CheckCircle className="w-5 h-5" />
                                 {viewingAuth.isOwner ? 'Activar Vecino' : 'Aprobar Ingreso'}
                             </button>
                             <button onClick={() => viewingAuth.isOwner ? handleBlockOwner(viewingAuth.id, 'pending') : handleRejectVisitor(viewingAuth.id)}
                                 className="flex-1 md:flex-initial h-16 bg-white/5 text-red-500 hover:bg-red-600 hover:text-white border border-white/5 px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3">
                                 <UserX className="w-5 h-5" />
                                 Rechazar
                             </button>
                           </>
                         ) : (
                           <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
                              <div className="h-14 px-8 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 font-black text-[9px] uppercase tracking-widest">
                                 <ShieldCheck className="w-4 h-4" /> Verificación Completada
                              </div>
                              <button onClick={() => setViewingAuth(null)}
                                 className="w-full md:w-auto h-16 px-12 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">
                                 Finalizar Auditoría
                              </button>
                           </div>
                         )}
                         </div>
                     </div>
                </motion.div>
            </div>
        )}

        {manualEntryVisitor && (
            <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-slate-950 w-full max-w-md luxury-card overflow-hidden p-10 relative border border-white/10">
                    <div className="flex items-center justify-between mb-10">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Ingreso Manual</h3>
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Asignar destino • {manualEntryVisitor.full_name}</p>
                        </div>
                        <button onClick={() => setManualEntryVisitor(null)} 
                          className="w-10 h-10 flex items-center justify-center bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-all border border-white/5">
                          <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-3">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4 italic">Lote Destino</span>
                            <input type="text" value={manualEntryLote} onChange={e => setManualEntryLote(e.target.value)} placeholder="EJ: 114"
                                className="w-full h-16 luxury-input px-8 rounded-2xl text-sm font-black uppercase tracking-widest bg-white/5 text-white" />
                        </div>
                        <button onClick={handleConfirmManualEntry} disabled={!manualEntryLote || loading}
                            className="w-full h-16 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-3">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Confirmar Ingreso
                        </button>
                    </div>
                </motion.div>
            </div>
        )}

        {isAddingVisitor && (
            <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-slate-950 w-full max-w-md luxury-card overflow-hidden p-10 relative border border-white/10">
                    <div className="flex items-center justify-between mb-10">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Nueva Identidad</h3>
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Banco Maestro de Invitados</p>
                        </div>
                        <button onClick={() => setIsAddingVisitor(false)} 
                          className="w-10 h-10 flex items-center justify-center bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-all border border-white/5">
                          <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4 italic">Nombre Completo</span>
                            <input type="text" value={newVisitor.full_name} onChange={e => setNewVisitor({...newVisitor, full_name: e.target.value.toUpperCase()})} placeholder="EJ: JUAN PEREZ"
                                className="w-full h-16 luxury-input px-8 rounded-2xl text-sm font-black uppercase bg-white/5 text-white" />
                        </div>
                        <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4 italic">Nro Documento</span>
                            <input type="text" value={newVisitor.dni} onChange={e => setNewVisitor({...newVisitor, dni: e.target.value})} placeholder="EJ: 35123456"
                                className="w-full h-16 luxury-input px-8 rounded-2xl text-sm font-black uppercase bg-white/5 text-white" />
                        </div>
                        <button onClick={handleSaveManualVisitor} disabled={!newVisitor.dni || !newVisitor.full_name || loading}
                            className="w-full h-16 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-3">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Crear Identidad
                        </button>
                    </div>
                </motion.div>
            </div>
        )}

        {isAddingTrabajador && (
            <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="bg-slate-950 w-full max-w-xl luxury-card overflow-hidden shadow-2xl relative border border-white/10">
                    <div className="p-10 border-b border-white/5 flex items-center justify-between bg-slate-900">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Nuevo Trabajador</h3>
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Personal de Mantenimiento / Servicios</p>
                        </div>
                        <button onClick={() => setIsAddingTrabajador(false)} 
                          className="w-10 h-10 flex items-center justify-center bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-all border border-white/5">
                          <X className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="p-10 space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4 italic">Nombre Completo</span>
                                <input type="text" placeholder="EJ: JUAN PEREZ" value={newTrabajador.full_name} onChange={e => setNewTrabajador({...newTrabajador, full_name: e.target.value.toUpperCase()})}
                                    className="w-full h-14 luxury-input px-6 rounded-2xl text-[10px] font-black uppercase bg-white/5 text-white" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4 italic">DNI</span>
                                <input type="text" placeholder="SIN PUNTOS" value={newTrabajador.dni} onChange={e => setNewTrabajador({...newTrabajador, dni: e.target.value})}
                                    className="w-full h-14 luxury-input px-6 rounded-2xl text-[10px] font-black uppercase bg-white/5 text-white" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4 italic">Categoría</span>
                                <input type="text" placeholder="EJ: JARDINERO" value={newTrabajador.category} onChange={e => setNewTrabajador({...newTrabajador, category: e.target.value.toUpperCase()})}
                                    className="w-full h-14 luxury-input px-6 rounded-2xl text-[10px] font-black uppercase bg-white/5 text-white" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4 italic">Destino Autorizado</span>
                                <input type="text" placeholder="LOTE O EMPLEADOR" value={newTrabajador.employer} onChange={e => setNewTrabajador({...newTrabajador, employer: e.target.value.toUpperCase()})}
                                    className="w-full h-14 luxury-input px-6 rounded-2xl text-[10px] font-black uppercase bg-white/5 text-white" />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.4em] ml-2 italic">Credencial de Identidad</p>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    {id: 'selfie', label: 'Rostro'}, {id: 'dni_front', label: 'DNI Front'}, {id: 'dni_back', label: 'DNI Back'}
                                ].map(p => (
                                    <div key={p.id} className="relative aspect-square bg-white/5 rounded-2xl border border-dashed border-white/10 flex items-center justify-center overflow-hidden group shadow-inner hover:border-emerald-500 transition-all">
                                        {manualCapturedPhotos[p.id as keyof typeof manualCapturedPhotos] ? (
                                            <>
                                                <img src={manualCapturedPhotos[p.id as keyof typeof manualCapturedPhotos]} className="w-full h-full object-cover" />
                                                <button onClick={() => startManualCamera(p.id)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Camera className="w-6 h-6 text-white" />
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={() => startManualCamera(p.id)} className="flex flex-col items-center gap-2">
                                                <Camera className="w-5 h-5 text-slate-700" />
                                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{p.label}</span>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={handleAddTrabajador} disabled={loading}
                            className="w-full h-16 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-3">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar Trabajador
                        </button>
                    </div>
                </motion.div>
            </div>
        )}

        {isAddingPermanente && (
            <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="bg-slate-950 w-full max-w-xl luxury-card overflow-hidden shadow-2xl relative border border-white/10">
                    <div className="p-10 border-b border-white/5 flex items-center justify-between bg-slate-900">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Nuevo Permanente</h3>
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Familiares o contactos con acceso fijo</p>
                        </div>
                        <button onClick={() => setIsAddingPermanente(false)} 
                          className="w-10 h-10 flex items-center justify-center bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-all border border-white/5">
                          <X className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="p-10 space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4 italic">Nombre Completo</span>
                                <input type="text" placeholder="EJ: ANA MARÍA" value={newPermanente.full_name} onChange={e => setNewPermanente({...newPermanente, full_name: e.target.value.toUpperCase()})}
                                    className="w-full h-14 luxury-input px-6 rounded-2xl text-[10px] font-black uppercase bg-white/5 text-white" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4 italic">DNI</span>
                                <input type="text" placeholder="SIN PUNTOS" value={newPermanente.dni} onChange={e => setNewPermanente({...newPermanente, dni: e.target.value})}
                                    className="w-full h-14 luxury-input px-6 rounded-2xl text-[10px] font-black uppercase bg-white/5 text-white" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4 italic">Categoría</span>
                                <input type="text" placeholder="EJ: FAMILIAR" value={newPermanente.category} onChange={e => setNewPermanente({...newPermanente, category: e.target.value.toUpperCase()})}
                                    className="w-full h-14 luxury-input px-6 rounded-2xl text-[10px] font-black uppercase bg-white/5 text-white" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4 italic">Vínculo con Lote</span>
                                <input type="text" placeholder="EJ: LOTE 210" value={newPermanente.employer} onChange={e => setNewPermanente({...newPermanente, employer: e.target.value.toUpperCase()})}
                                    className="w-full h-14 luxury-input px-6 rounded-2xl text-[10px] font-black uppercase bg-white/5 text-white" />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.4em] ml-2 italic">Fotos de Identidad</p>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    {id: 'selfie', label: 'Rostro'}, {id: 'dni_front', label: 'DNI Front'}, {id: 'dni_back', label: 'DNI Back'}
                                ].map(p => (
                                    <div key={p.id} className="relative aspect-square bg-white/5 rounded-2xl border border-dashed border-white/10 flex items-center justify-center overflow-hidden group shadow-inner hover:border-emerald-500 transition-all">
                                        {manualCapturedPhotos[p.id as keyof typeof manualCapturedPhotos] ? (
                                            <>
                                                <img src={manualCapturedPhotos[p.id as keyof typeof manualCapturedPhotos]} className="w-full h-full object-cover" />
                                                <button onClick={() => startManualCamera(p.id)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Camera className="w-6 h-6 text-white" />
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={() => startManualCamera(p.id)} className="flex flex-col items-center gap-2">
                                                <Camera className="w-5 h-5 text-slate-700" />
                                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{p.label}</span>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={handleAddPermanente} disabled={loading}
                            className="w-full h-16 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-3">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar Permanente
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
        
        <AnimatePresence>
            {zoomedImg && (
                <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-500"
                    onClick={() => setZoomedImg(null)}>
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                        className="relative max-w-6xl w-full max-h-[90vh] flex items-center justify-center">
                        <img src={zoomedImg} className="max-w-full max-h-[90vh] object-contain rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)]" alt="Zoom Document" />
                        <button className="fixed top-8 right-8 w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all flex items-center justify-center"
                            onClick={() => setZoomedImg(null)}>
                            <X className="w-6 h-6" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isCapturingManual && (
                <div className="fixed inset-0 z-[400] bg-[#0c0c0c] flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
                    <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.15)] border-4 border-[#10b981]/10">
                        <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${manualCaptureType === 'selfie' ? 'scale-x-[-1]' : ''}`} />
                        <div className="absolute inset-x-0 bottom-12 flex flex-col items-center gap-6">
                            <button onClick={handleManualCapture}
                                className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)] active:scale-90 transition-all group">
                                <div className="w-20 h-20 border-4 border-slate-900/5 rounded-full group-hover:scale-105 transition-transform" />
                            </button>
                            <p className="text-white font-black uppercase tracking-[0.4em] text-[10px] drop-shadow-2xl">
                                Capturar {manualCaptureType === 'selfie' ? 'Rostro' : 'Documento'}
                            </p>
                        </div>
                        <button onClick={stopManualCamera} className="absolute top-10 right-10 w-12 h-12 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all flex items-center justify-center">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </AnimatePresence>
    </div>
    </div>
  );
}

