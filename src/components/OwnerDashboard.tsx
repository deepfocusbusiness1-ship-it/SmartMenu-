import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
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

// ─── Stats Section ────────────────────────────────────────────────────────────
function StatsSection() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("pedidos")
        .select("precio_unitario, cantidad, propina")
        .gte("created_at", today.toISOString());

      if (error || !data) {
        setLoading(false);
        return;
      }

      const totalFacturado = data.reduce(
        (acc: number, p: Pedido) => acc + (p.precio_unitario ?? 0) * (p.cantidad ?? 1),
        0
      );
      const totalPropinas = data.reduce((acc: number, p: Pedido) => acc + (p.propina ?? 0), 0);
      const cantidadPedidos = data.length;

      setStats({ totalFacturado, totalPropinas, cantidadPedidos });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Facturado hoy", value: stats ? formatARS(stats.totalFacturado) : "—", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
    { label: "Propinas acumuladas", value: stats ? formatARS(stats.totalPropinas) : "—", icon: DollarSign, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
    { label: "Pedidos realizados", value: stats ? stats.cantidadPedidos.toString() : "—", icon: ShoppingBag, color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/20" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Resumen del día</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          {new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="text-amber-400 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className={`bg-slate-900 border ${c.border} rounded-2xl p-5`}>
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${c.bg} mb-4`}>
                <c.icon size={20} className={c.color} />
              </div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Product Row ──────────────────────────────────────────────────────────────
function ProductRow({ product, onUpdate, onDelete }: { product: Producto; onUpdate: (id: string, changes: Partial<Producto>) => Promise<void>; onDelete: (id: string) => Promise<void>; }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ nombre: product.nombre, descripcion: product.descripcion, precio: product.precio });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(product.id, draft);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${product.disponible ? "border-slate-700/60" : "border-slate-800 opacity-60"}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => onUpdate(product.id, { disponible: !product.disponible })} className="shrink-0" title={product.disponible ? "Deshabilitar" : "Habilitar"}>
          {product.disponible ? <ToggleRight size={26} className="text-emerald-400" /> : <ToggleLeft size={26} className="text-slate-600" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm leading-tight truncate">{product.nombre}</p>
          <p className="text-slate-500 text-xs truncate">{product.categoria}</p>
        </div>
        <div className="shrink-0 text-right"><p className="text-amber-400 font-bold text-sm">{formatARS(product.precio)}</p></div>
        <button onClick={() => setExpanded((v) => !v)} className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-slate-800 px-4 py-4 space-y-4">
          {editing ? (
            <div className="space-y-3">
              <div><label className="text-xs text-slate-500 uppercase tracking-wider">Nombre</label><input value={draft.nombre} onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500" /></div>
              <div><label className="text-xs text-slate-500 uppercase tracking-wider">Descripción</label><textarea value={draft.descripcion} onChange={(e) => setDraft((d) => ({ ...d, descripcion: e.target.value }))} rows={2} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 resize-none" /></div>
              <div><label className="text-xs text-slate-500 uppercase tracking-wider">Precio (ARS)</label><input type="number" value={draft.precio} onChange={(e) => setDraft((d) => ({ ...d, precio: Number(e.target.value) }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500" /></div>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-lg py-2 transition-colors">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Guardar</button>
                <button onClick={() => { setDraft({ nombre: product.nombre, descripcion: product.descripcion, precio: product.precio }); setEditing(false); }} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg py-2 transition-colors"><X size={14} /> Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-400 text-sm">{product.descripcion || <span className="italic text-slate-600">Sin descripción</span>}</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onUpdate(product.id, { popular: !product.popular })} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${product.popular ? "bg-amber-400/10 border-amber-400/30 text-amber-400" : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600"}`}><Star size={11} /> Popular</button>
                <button onClick={() => onUpdate(product.id, { happy_hour: !product.happy_hour })} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${product.happy_hour ? "bg-purple-400/10 border-purple-400/30 text-purple-400" : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600"}`}><Zap size={11} /> Happy Hour</button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg py-2 transition-colors"><Pencil size={13} /> Editar</button>
                <button onClick={() => onDelete(product.id)} className="flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm rounded-lg px-3 py-2 transition-colors"><X size={13} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── New Product Modal ────────────────────────────────────────────────────────
function NewProductModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ nombre: "", descripcion: "", precio: "", categoria: "", imagen_url: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.precio || !form.categoria) { setError("Nombre, precio y categoría son obligatorios."); return; }
    setSaving(true);
    const { error: insertError } = await supabase.from("productos").insert({
      nombre: form.nombre, descripcion: form.descripcion, precio: Number(form.precio), categoria: form.categoria, imagen_url: form.imagen_url, disponible: true, popular: false, happy_hour: false,
    });
    setSaving(false);
    if (insertError) { setError(insertError.message); } else { onCreated(); onClose(); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="text-white font-bold">Nuevo producto</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {[{ key: "nombre", label: "Nombre *", placeholder: "Ej: Empanada de carne" }, { key: "categoria", label: "Categoría *", placeholder: "Ej: Entradas" }, { key: "precio", label: "Precio ARS *", placeholder: "1500", type: "number" }, { key: "imagen_url", label: "URL de imagen", placeholder: "https://..." }].map((f) => (
            <div key={f.key}><label className="text-xs text-slate-500 uppercase tracking-wider">{f.label}</label><input type={f.type || "text"} placeholder={f.placeholder} value={(form as Record<string, string>)[f.key]} onChange={(e) => setForm((d) => ({ ...d, [f.key]: e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500" /></div>
          ))}
          <div><label className="text-xs text-slate-500 uppercase tracking-wider">Descripción</label><textarea placeholder="Descripción opcional..." value={form.descripcion} onChange={(e) => setForm((d) => ({ ...d, descripcion: e.target.value }))} rows={2} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 resize-none" /></div>
          {error && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {error}</p>}
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl py-3 transition-colors">{saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Agregar producto</button>
        </form>
      </div>
    </div>
  );
}

// ─── Inventario Section ───────────────────────────────────────────────────────
function InventarioSection() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const fetchProductos = useCallback(async () => {
    const { data } = await supabase.from("productos").select("*").order("categoria").order("nombre");
    setProductos(data ?? []); setLoading(false);
  }, []);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  const updateProducto = async (id: string, changes: Partial<Producto>) => {
    await supabase.from("productos").update(changes).eq("id", id);
    setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  };

  const deleteProducto = async (id: string) => {
    if (!confirm("¿Eliminar este producto permanentemente?")) return;
    await supabase.from("productos").delete().eq("id", id);
    setProductos((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = productos.filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase()) || p.categoria.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold text-white">Inventario</h2><p className="text-slate-500 text-sm">{productos.length} productos</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl px-4 py-2.5 transition-colors shrink-0"><Plus size={16} /> Agregar</button>
      </div>
      <div className="relative"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto o categoría..." className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-amber-500 transition-colors" /></div>
      {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={28} className="text-amber-400 animate-spin" /></div> : (
        <div className="space-y-2">{filtered.length === 0 ? <p className="text-center text-slate-600 py-12 text-sm">No se encontraron productos.</p> : filtered.map((p) => <ProductRow key={p.id} product={p} onUpdate={updateProducto} onDelete={deleteProducto} />)}</div>
      )}
      {showModal && <NewProductModal onClose={() => setShowModal(false)} onCreated={fetchProductos} />}
    </div>
  );
}

// ─── Configuracion Section ────────────────────────────────────────────────────
function ConfiguracionSection() {
  const [happyHourActive, setHappyHourActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchState = async () => {
      const { data } = await supabase.from("productos").select("happy_hour").eq("happy_hour", true).limit(1);
      setHappyHourActive((data ?? []).length > 0); setLoading(false);
    };
    fetchState();
  }, []);

  const toggleHappyHour = async () => {
    const next = !happyHourActive; setSaving(true);
    await supabase.from("productos").update({ happy_hour: next }).neq("id", "00000000-0000-0000-0000-000000000000");
    setHappyHourActive(next); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-white">Configuración del local</h2><p className="text-slate-500 text-sm mt-0.5">Ajustes globales del menú</p></div>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center shrink-0"><Zap size={22} className="text-purple-400" /></div>
            <div><p className="text-white font-semibold">Happy Hour global</p><p className="text-slate-500 text-sm mt-0.5">Activa o desactiva el descuento 2×1 en <strong className="text-slate-400">todos</strong> los productos marcados.</p></div>
          </div>
          {loading ? <Loader2 size={20} className="text-slate-500 animate-spin shrink-0 mt-1" /> : (
            <button onClick={toggleHappyHour} disabled={saving} className="shrink-0 mt-1">{happyHourActive ? <ToggleRight size={36} className="text-purple-400" /> : <ToggleLeft size={36} className="text-slate-600" />}</button>
          )}
        </div>
        <div className={`mt-4 flex items-center gap-2 text-sm transition-all duration-300 ${saved ? "opacity-100" : "opacity-0"}`}><Check size={14} className="text-emerald-400" /><span className="text-emerald-400">Cambios guardados</span></div>
      </div>
    </div>
  );
}

// --- Componente Principal Dashboard ---
export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("stats");

  const checkSession = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    
    if (!s) {
      setAuthLoading(false);
      return;
    }

    if (!ALLOWED_EMAILS.includes(s.user.email ?? "")) {
      await supabase.auth.signOut();
      navigate("/");
    } else {
      setSession(s);
    }
    setAuthLoading(false);
  }, [navigate]);

  useEffect(() => {
    checkSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!s) {
        setSession(null);
      } else if (!ALLOWED_EMAILS.includes(s.user.email ?? "")) {
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
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20"><Coffee size={16} className="text-amber-400" /></div>
            <span className="font-black uppercase tracking-tighter text-sm">Dashboard Dueño</span>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-slate-500 hover:text-red-400 transition-colors"><LogOut size={18} /></button>
        </div>
      </header>
      <nav className="sticky top-16 z-30 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto flex">
          {[
            { id: "stats", label: "Ventas", icon: LayoutDashboard },
            { id: "inventario", label: "Menú", icon: Package },
            { id: "configuracion", label: "Ajustes", icon: Settings },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveSection(item.id as Section)} className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeSection === item.id ? "border-amber-500 text-amber-400" : "border-transparent text-slate-600"}`}>
              <item.icon size={14} />{item.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="max-w-2xl mx-auto p-6 pb-24">
        {activeSection === "stats" && <StatsSection />}
        {activeSection === "inventario" && <InventarioSection />}
        {activeSection === "configuracion" && <ConfiguracionSection />}
      </main>
    </div>
  );
}
