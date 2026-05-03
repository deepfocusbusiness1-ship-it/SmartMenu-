import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import Login from "./Login";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Pedido {
  id: string;
  mesa_id: string;
  producto_id: string | number;
  cantidad: number;
  estado: "pendiente" | "cocina" | "entregado";
  nombre_cliente: string;
  created_at: string;
  pide_cuenta: boolean;
  productos?: {
    nombre: string;
  };
}

const playBell = () => {
  const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
  audio.play().catch(() => console.log("Audio bloqueado por el navegador."));
};

export default function AdminPanel() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Gestión de Sesión (REFORZADA) ──────────────────────────────────────────
  useEffect(() => {
    // 1. Chequeo inmediato al cargar
    const getInitialSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setLoading(false);
    };

    getInitialSession();

    // 2. Escucha activa de cambios (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Lógica de Pedidos ──────────────────────────────────────────────────────
  const fetchPedidos = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("pedidos")
      .select("*, productos(nombre)")
      .order("created_at", { ascending: true });

    if (!error) setPedidos(data as any || []);
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchPedidos();

      channelRef.current = supabase
        .channel("admin-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
          fetchPedidos();
          // Solo suena si es un pedido nuevo (INSERT)
        })
        .subscribe();
    }

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [session, fetchPedidos]);

  const avanzarEstado = async (p: Pedido) => {
    let nuevoEstado = p.estado;
    if (p.estado === "pendiente") nuevoEstado = "cocina";
    else if (p.estado === "cocina") nuevoEstado = "entregado";

    await supabase.from("pedidos").update({ estado: nuevoEstado }).eq("id", p.id);
  },

  const finalizarServicio = async (mesa_id: string) => {
    const { error } = await supabase.from("pedidos").delete().eq("mesa_id", mesa_id);
    if (!error) fetchPedidos();
  };

  // ── Renderizado Condicional ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-mono text-xs uppercase tracking-widest">
        Verificando credenciales...
      </div>
    );
  }

  // Si no hay sesión, mostramos el Login. Cuando el Login tenga éxito, 
  // el onAuthStateChange de arriba se disparará y cambiará el estado.
  if (!session) {
    return <Login onLogin={() => {}} />; 
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white font-sans">
      <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-orange-500">Monitor de Cocina</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Gestión en tiempo real</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-[10px] font-black uppercase bg-red-500/10 text-red-400 px-4 py-2 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
        >
          Cerrar Sesión
        </button>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pedidos.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10">
            <p className="text-slate-500 uppercase text-xs font-bold tracking-widest">Sin pedidos activos</p>
          </div>
        ) : (
          pedidos.map((p) => (
            <div
              key={p.id}
              className={`p-6 rounded-[2rem] border transition-all shadow-2xl flex flex-col justify-between ${
                p.pide_cuenta 
                  ? "bg-purple-900/40 border-purple-500 animate-pulse" 
                  : "bg-slate-900/50 border-white/5"
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-4xl font-black">Mesa {p.mesa_id}</span>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                    p.estado === 'pendiente' ? 'bg-amber-500 text-black' : 
                    p.estado === 'cocina' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    {p.estado}
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className="text-orange-400 font-black text-xl uppercase leading-none mb-1">
                    {p.productos?.nombre || "Cargando..."}
                  </h3>
                  <p className="text-slate-400 text-sm">Cantidad: <span className="text-white font-bold">{p.cantidad}</span></p>
                </div>
              </div>

              {p.pide_cuenta ? (
                <button
                  onClick={() => finalizarServicio(p.mesa_id)}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  ✅ Cobrado / Liberar Mesa
                </button>
              ) : (
                <button
                  onClick={() => avanzarEstado(p)}
                  disabled={p.estado === 'entregado'}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                    p.estado === 'entregado' 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                      : 'bg-white text-black hover:bg-orange-500 hover:text-white'
                  }`}
                >
                  {p.estado === "pendiente" ? "Empezar Cocina 👨‍🍳" : 
                   p.estado === "cocina" ? "Entregar a Mesa 🏃‍♂️" : "Pedido en Mesa 🍽️"}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
