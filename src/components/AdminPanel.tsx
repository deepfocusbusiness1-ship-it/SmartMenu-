import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import Login from "./Login";

// ─── Tipos Actualizados ──────────────────────────────────────────────────────
interface Pedido {
  id: string;
  mesa_id: string;
  producto_id: string | number;
  cantidad: number;
  estado: "pendiente" | "cocina" | "listo";
  nombre_cliente: string;
  created_at: string;
  // Agregamos la relación con productos que viene de la DB
  productos?: {
    nombre: string;
  };
}

// ─── Componente principal ─────────────────────────────────────────────────────
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

  // ── Fetch inicial con JOIN de productos ───────────────────────────────────
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

  // ── Handlers quirúrgicos ───────────────────────────────────────────────────

  const handleInsert = useCallback(async (nuevoPedido: Pedido) => {
    // Como el Realtime no trae el JOIN automáticamente, hacemos un fetch rápido del nombre
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

    // Buscamos el nombre si no lo tenemos (para mantener la consistencia)
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

  // ── Suscripción Realtime ───────────────────────────────────────────────────
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-mono">
        Verificando credenciales...
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tighter text-orange-500">
          Cocina Pro 🍳
        </h1>
        <button
          onClick={handleLogout}
          className="text-xs bg-red-500/10 text-red-400 px-3 py-1 rounded-lg border border-red-500/20"
        >
          Salir
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pedidos.length === 0 ? (
          <p className="text-slate-500 italic col-span-full text-center py-10">
            Esperando nuevas comandas...
          </p>
        ) : (
          pedidos.map((p) => (
            <div
              key={p.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-3xl font-black text-white">Mesa {p.mesa_id}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                  p.estado === 'pendiente' ? 'bg-amber-500 text-black' : 'bg-blue-500 text-white'
                }`}>
                  {p.estado}
                </span>
              </div>

              {/* Ahora leemos el nombre directamente de la relación con la tabla productos */}
              <p className="text-orange-400 font-bold text-lg leading-tight mb-1">
                {p.productos?.nombre || `Cargando producto...`}
              </p>

              <p className="text-slate-400 text-sm mb-4">
                Cant: <span className="text-white font-bold">{p.cantidad}</span>
                {" · "}
                <span className="italic">{p.nombre_cliente}</span>
              </p>

              <button
                onClick={() => avanzarEstado(p)}
                className="w-full py-3 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-colors"
              >
                {p.estado === "pendiente" ? "Tomar Comanda" : "Marcar como Entregado"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
