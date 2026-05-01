import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import Login from "./Login";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Pedido {
  id: string;
  mesa_id: string;
  producto_id: string | number;
  cantidad: number;
  estado: "pendiente" | "cocina" | "listo";
  nombre_cliente: string;
  created_at: string;
  productos?: {
    nombre: string;
  };
}

// ─── Sonido de Campana ────────────────────────────────────────────────────────
const playBell = () => {
  const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
  audio.play().catch(error => {
    console.log("El navegador bloqueó el audio. Interactúa con la página para habilitarlo.", error);
  });
};

export default function AdminPanel() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Autenticación ──────────────────────────────────────────────────────────
  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Fetch inicial ──────────────────────────────────────────────────────────
  const fetchPedidosInicial = useCallback(async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        *,
        productos (
          nombre
        )
      `)
      .not("estado", "eq", "listo")
      .order("created_at", { ascending: true });

    if (!error) setPedidos(data as unknown as Pedido[] ?? []);
  }, []);

  // ── Handlers Realtime con Sonido ────────────────────────────────────────────
  const handleInsert = useCallback(async (nuevoPedido: Pedido) => {
    // 🔔 ¡SUENA LA CAMPANA! 
    playBell();

    const { data: prodData } = await supabase
      .from("productos")
      .select("nombre")
      .eq("id", nuevoPedido.producto_id)
      .single();

    const pedidoConNombre = {
      ...nuevoPedido,
      productos: prodData ? { nombre: prodData.nombre } : undefined
    };

    setPedidos((prev) => {
      if (prev.some((p) => p.id === nuevoPedido.id)) return prev;
      return [...prev, pedidoConNombre].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  const handleUpdate = useCallback(async (pedidoActualizado: Pedido) => {
    if (pedidoActualizado.estado === "listo") {
      setPedidos((prev) => prev.filter((p) => p.id !== pedidoActualizado.id));
      return;
    }

    const { data: prodData } = await supabase
      .from("productos")
      .select("nombre")
      .eq("id", pedidoActualizado.producto_id)
      .single();

    const pedidoConNombre = {
      ...pedidoActualizado,
      productos: prodData ? { nombre: prodData.nombre } : undefined
    };

    setPedidos((prev) => 
      prev.map((p) => p.id === pedidoActualizado.id ? pedidoConNombre : p)
    );
  }, []);

  // ── Suscripción ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    fetchPedidosInicial();

    channelRef.current = supabase
      .channel("realtime-pedidos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pedidos" },
        (payload) => handleInsert(payload.new as Pedido)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos" },
        (payload) => handleUpdate(payload.new as Pedido)
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [session, fetchPedidosInicial, handleInsert, handleUpdate]);

  const avanzarEstado = async (pedido: Pedido) => {
    const proximo = pedido.estado === "pendiente" ? "cocina" : "listo";
    await supabase.from("pedidos").update({ estado: proximo }).eq("id", pedido.id);
  };

  const handleLogout = () => supabase.auth.signOut();

  // ── Renderizado ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-mono text-xs uppercase tracking-widest">
        Iniciando sistemas...
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white font-sans">
      <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-orange-500">
            Cocina Smart 🍳
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Panel de Control en Vivo</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-[10px] font-black uppercase bg-red-500/10 text-red-400 px-4 py-2 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
        >
          Cerrar Sesión
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pedidos.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <span className="text-4xl mb-4">💤</span>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Sin pedidos pendientes</p>
          </div>
        ) : (
          pedidos.map((p) => (
            <div
              key={p.id}
              className="p-6 bg-slate-900/50 border border-white/5 rounded-[2rem] shadow-2xl backdrop-blur-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-4xl font-black text-white">#{p.mesa_id}</span>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                  p.estado === 'pendiente' ? 'bg-amber-500 text-black' : 'bg-blue-500 text-white'
                }`}>
                  {p.estado}
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-orange-400 font-black text-xl uppercase leading-none mb-1">
                  {p.productos?.nombre || "Cargando..."}
                </h3>
                <p className="text-slate-400 text-sm font-medium">
                  Cantidad: <span className="text-white font-black text-lg">{p.cantidad}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 mb-6 p-3 bg-white/5 rounded-2xl">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-xs font-black text-black">
                  {p.nombre_cliente.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-tight">{p.nombre_cliente}</span>
              </div>

              <button
                onClick={() => avanzarEstado(p)}
                className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white active:scale-95 transition-all shadow-lg"
              >
                {p.estado === "pendiente" ? "Empezar Cocina 👨‍🍳" : "¡Pedido Listo! ✅"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
