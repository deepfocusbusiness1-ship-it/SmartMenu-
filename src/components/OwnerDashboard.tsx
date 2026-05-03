import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom"; // Importamos para la redirección
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

// --- Cliente de Supabase ---
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

// --- SEGURIDAD: Email autorizado ---
const ALLOWED_EMAILS: string[] = ["ezesaavedra5@gmail.com"]; // Tu acceso exclusivo

// --- Helpers ---
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
      setError("Credenciales incorrectas.");
    } else {
      onLogin();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
          <Coffee size={28} className="text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-8">Panel SmartMenu</h1>
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none"
            placeholder="Email de administrador"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none"
            placeholder="Contraseña"
            required
          />
          {error && <p className="text-red-400 text-xs px-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl py-3 transition-all"
          >
            {loading ? "Cargando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Componente Principal Dashboard ---
export default function OwnerDashboard() {
  const navigate = useNavigate(); // Hook para redirección
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("stats");

  // Validación de acceso quirúrgica
  const checkSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const s = data.session;

    if (s) {
      if (!ALLOWED_EMAILS.includes(s.user.email ?? "")) {
        // Si el mail no es el tuyo, afuera de inmediato
        await supabase.auth.signOut();
        navigate("/"); // Te manda al Menú de clientes
      } else {
        setSession(s);
      }
    }
    setAuthLoading(false);
  }, [navigate]);

  useEffect(() => {
    checkSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s && !ALLOWED_EMAILS.includes(s.user.email ?? "")) {
        supabase.auth.signOut();
        navigate("/");
      } else {
        setSession(s);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [checkSession, navigate]);

  if (authLoading) return <div className="min-h-screen bg-slate-950" />;

  if (!session) return <Login onLogin={checkSession} />;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Header Fijo */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Coffee size={16} className="text-amber-400" />
            </div>
            <span className="font-black uppercase tracking-tighter text-sm">Dashboard Dueño</span>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Menú de Navegación */}
      <nav className="sticky top-16 z-30 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto flex">
          {[
            { id: "stats", label: "Ventas", icon: LayoutDashboard },
            { id: "inventario", label: "Menú", icon: Package },
            { id: "configuracion", label: "Ajustes", icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as Section)}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                activeSection === item.id ? "border-amber-500 text-amber-400" : "border-transparent text-slate-600"
              }`}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Contenido Dinámico */}
      <main className="max-w-2xl mx-auto p-6 pb-24">
        {/* Aquí irían los componentes StatsSection, InventarioSection, etc. que Claude generó */}
        <p className="text-slate-500 text-center mt-10 italic">
          Bienvenido Ezequiel. Seleccioná una sección para gestionar tu bar.
        </p>
      </main>
    </div>
  );
}
