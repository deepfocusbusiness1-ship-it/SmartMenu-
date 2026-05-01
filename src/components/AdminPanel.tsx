import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import Login from "./Login";
import menuData from "../data/MenuData.json";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Pedido {
  id: string;
  mesa_id: string;
  producto_id: string | number;
  cantidad: number;
  estado: "pendiente" | "cocina" | "listo";
  nombre_cliente: string;
  created_at: string;
}

// ─── Helper: nombre de producto ───────────────────────────────────────────────
// Lee desde menuData.productos tal como fue corregido.
const getNombreProducto = (producto_id: string | number): string => {
  const lista = menuData.productos || [];
  const p = lista.find((item: any) => String(item.id) === String(producto_id));
  return p ? p.nombre : `Producto #${producto_id}`;
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AdminPanel() {
  const [session, setSession]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [pedidos, setPedidos]   = useState<Pedido[]>([]);
  const channelRef              = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

  // ── Fetch inicial (solo al montar con sesión activa) ───────────────────────
  const fetchPedidosInicial = useCallback(async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .not("estado", "eq", "listo")
      .order("created_at", { ascending: true });

    if (!error) setPedidos(data as Pedido[] ?? []);
  }, []);

  // ── Handlers quirúrgicos ───────────────────────────────────────────────────

  // INSERT → agrega el pedido al final del estado local, respetando el orden por created_at.
  const handleInsert = useCallback((nuevoPedido: Pedido) => {
    // Ignorar si ya existe (deduplicación defensiva)
    setPedidos((prev) => {
      if (prev.some((p) => p.id === nuevoPedido.id)) return prev;
      return [...prev, nuevoPedido].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  // UPDATE → actualiza el pedido modificado en el estado local.
  // Si el nuevo estado es 'listo', lo elimina de la vista.
  const handleUpdate = useCallback((pedidoActualizado: Pedido) => {
    setPedidos((prev) => {
      if (pedidoActualizado.estado === "listo") {
        // Salió del flujo de cocina → remover de la vista
        return prev.filter((p) => p.id !== pedidoActualizado.id);
      }
      // Reemplazar solo el pedido modificado, sin tocar el resto
      return prev.map((p) => p.id === pedidoActualizado.id ? pedidoActualizado : p);
    });
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

  // ── Acción: avanzar estado desde el botón ─────────────────────────────────
  // El UPDATE de Supabase dispara el canal → handleUpdate se encarga del estado local.
  // No hace falta llamar a fetchPedidos manualmente.
  const avanzarEstado = async (pedido: Pedido) => {
    const proximo = pedido.estado === "pendiente" ? "cocina" : "listo";
    await supabase.from("pedidos").update({ estado: proximo }).eq("id", pedido.id);
    // handleUpdate reacciona al evento UPDATE vía canal — sin fetch adicional.
  };

  const handleLogout = () => supabase.auth.signOut();

  // ── Render ─────────────────────────────────────────────────────────────────
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
      {/* Header */}
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

      {/* Grid de pedidos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pedidos.length === 0 ? (
          <p className="text-slate-500 italic col-span-full text-center py-10">
            Esperando nuevas comandas...
          </p>
        ) : (
          pedidos.map((p) => (
            <div
              key={p.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-3xl font-black text-white">Mesa {p.mesa_id}</span>
                <span className="bg-orange-500 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">
                  {p.estado}
                </span>
              </div>

              <p className="text-orange-400 font-bold text-lg leading-tight mb-1">
                {getNombreProducto(p.producto_id)}
              </p>

              <p className="text-slate-400 text-sm mb-4">
                Cant: <span className="text-white font-bold">{p.cantidad}</span>
                {" · "}
                {p.nombre_cliente}
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
