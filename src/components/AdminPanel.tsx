import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";   // ← instancia centralizada
import Login from "./Login";
import menuData from "../data/MenuData.json";

export default function AdminPanel() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión
  const [pedidos, setPedidos] = useState([]);

  // ── 1. Verificar sesión al montar y escuchar cambios ──────────────────
  useEffect(() => {
    // Leer sesión actual (evita parpadeo en F5)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Escuchar login / logout en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── 2. Pedidos (solo se activa si hay sesión) ─────────────────────────
  const fetchPedidos = useCallback(async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, cantidad, precio_unitario, estado, created_at, nombre_cliente, mesa_id, producto_id")
      .not("estado", "eq", "listo")
      .order("created_at", { ascending: true });

    if (!error) setPedidos(data || []);
  }, []);

  useEffect(() => {
    if (!session) return; // no suscribirse si no hay sesión

    fetchPedidos();

    const channel = supabase
      .channel("cocina-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, fetchPedidos)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session, fetchPedidos]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange detecta el logout y setea session = null automáticamente
  };

  const actualizarEstado = async (id, nuevoEstado) => {
    await supabase.from("pedidos").update({ estado: nuevoEstado }).eq("id", id);
    // El canal realtime dispara fetchPedidos, no hace falta actualizar local
  };

  // ── 3. Renders condicionales ──────────────────────────────────────────

  // Estado de carga inicial (evita mostrar Login por un frame antes de verificar)
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sin sesión → mostrar Login
  if (!session) return <Login />;

  // ── 4. Panel principal ────────────────────────────────────────────────
  const getNombreProducto = (producto_id) => {
    for (const categoria of Object.values(menuData)) {
      const item = categoria.find((p) => String(p.id) === String(producto_id));
      if (item) return item.nombre;
    }
    return `Producto #${producto_id}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white">🍳 Panel de Cocina</h1>
          <p className="text-slate-500 text-sm">{pedidos.length} pedidos activos</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-red-400 text-sm flex items-center gap-1.5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>

      {/* Grid de pedidos */}
      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-600">
          <span className="text-5xl mb-3">✅</span>
          <p className="text-lg font-medium">Todo al día</p>
          <p className="text-sm">No hay pedidos pendientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pedidos.map((pedido) => (
            <div key={pedido.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">

              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{getNombreProducto(pedido.producto_id)}</p>
                  <p className="text-slate-400 text-sm">
                    Mesa {pedido.mesa_id} · {pedido.nombre_cliente}
                  </p>
                </div>
                <span className="text-lg font-bold text-slate-300">×{pedido.cantidad}</span>
              </div>

              {/* Estado */}
              <div className="flex gap-2">
                {["pendiente", "cocina", "listo"].map((estado) => (
                  <button
                    key={estado}
                    onClick={() => actualizarEstado(pedido.id, estado)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                      ${pedido.estado === estado
                        ? "bg-orange-500 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                  >
                    {estado}
                  </button>
                ))}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
