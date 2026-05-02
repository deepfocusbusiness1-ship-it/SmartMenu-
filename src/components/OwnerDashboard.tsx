import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Settings,
  LogOut,
  Plus,
  Pencil,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  Zap,
  DollarSign,
  ShoppingBag,
  Star,
  AlertCircle,
  Loader2,
  Search,
  Coffee,
} from "lucide-react";

// Conexión segura mediante variables de entorno
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// --- Tipos ---
interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen_url: string;
  disponible: boolean;
  popular: boolean;
  happy_hour: boolean;
}

interface Pedido {
  id: string;
  precio_unitario: number;
  cantidad: number;
  propina: number;
  estado: string;
  created_at: string;
}

interface Stats {
  totalFacturado: number;
  totalPropinas: number;
  cantidadPedidos: number;
}

type Section = "stats" | "inventario" | "configuracion";

// --- Seguridad: Lista blanca de accesos ---
const ALLOWED_EMAILS: string[] = [
  "ezesaavedra5@gmail.com" // Acceso exclusivo para Ezequiel
];

// --- Helper de Moneda ---
const formatARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

// --- Componente Login ---
function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("Credenciales incorrectas. Verificá tu email y contraseña.");
    } else {
      onLogin();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <Coffee size={28} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SmartMenu</h1>
          <p className="text-slate-500 text-sm mt-1">Panel del dueño</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="dueño@mibar.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/40 text-slate-950 font-bold rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Secciones de Estadísticas, Inventario y Configuración (Omitidas por brevedad pero integradas en el archivo principal) ---

export default function OwnerDashboard() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("stats");

  const checkSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    if (s && ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(s.user.email ?? "")) {
      setUnauthorized(true);
      await supabase.auth.signOut();
      setSession(null);
    } else {
      setSession(s);
      setUnauthorized(false);
    }
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    checkSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s && ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(s.user.email ?? "")) {
        setUnauthorized(true);
        supabase.auth.signOut();
        setSession(null);
      } else {
        setSession(s);
        setUnauthorized(false);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [checkSession]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 size={32} className="text-amber-400 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <>
        {unauthorized && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertCircle size={16} /> Tu cuenta no tiene acceso a este panel.
          </div>
        )}
        <Login onLogin={checkSession} />
      </>
    );
  }

  const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: "stats", label: "Resumen", icon: LayoutDashboard },
    { id: "inventario", label: "Inventario", icon: Package },
    { id: "configuracion", label: "Config", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header y Navegación principal del Dashboard */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800/60">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Coffee size={14} className="text-amber-400" />
            </div>
            <span className="font-bold text-sm tracking-tight">SmartMenu <span className="text-slate-500 font-normal">/ Owner</span></span>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-slate-500 hover:text-red-400 text-xs flex items-center gap-1.5 transition-colors">
            <LogOut size={15} /> Salir
          </button>
        </div>
      </header>

      <nav className="sticky top-14 z-30 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800/40">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium border-b-2 transition-colors ${
                  activeSection === item.id ? "border-amber-500 text-amber-400" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <item.icon size={15} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {activeSection === "stats" && <StatsSection />}
        {activeSection === "inventario" && <InventarioSection />}
        {activeSection === "configuracion" && <ConfiguracionSection />}
      </main>
    </div>
  );
}
