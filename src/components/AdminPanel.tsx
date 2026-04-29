import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

export default function AdminPanel() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPedidos = useCallback(async () => {
    // EL CAMBIO CLAVE: Quitamos la relación con 'mesas' y 'usuarios_sesion'
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, cantidad, precio_unitario, estado, created_at, nombre_cliente, mesa_id")
      .not("estado", "eq", "listo") // Solo mostrar lo que falta entregar
      .order("created_at", { ascending: true });

    if (error) console.error(error);
    else setPedidos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPedidos();
    const channel = supabase.channel("realtime-pedidos").on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pedidos" },
      () => fetchPedidos()
    ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchPedidos]);

  const updateEstado = async (id, nuevoEstado) => {
    await supabase.from("pedidos").update({ estado: nuevoEstado }).eq("id", id);
    fetchPedidos();
  };

  if (loading) return <div className="p-10 text-white">Cargando pedidos...</div>;

  return (
    <div className="min-h-screen bg-black p-6 text-white font-sans">
      <h1 className="text-2xl font-black mb-6 tracking-tighter">PANEL DE COCINA 🔥</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pedidos.map(p => (
          <div key={p.id} className={`p-5 rounded-2xl border ${p.estado === 'pendiente' ? 'bg-amber-500/10 border-amber-500' : 'bg-blue-500/10 border-blue-500'}`}>
            <div className="flex justify-between mb-2">
              <span className="font-black text-xl">Mesa {p.mesa_id}</span>
              <span className="text-xs opacity-50">{new Date(p.created_at).toLocaleTimeString()}</span>
            </div>
            <p className="text-lg font-bold mb-4">{p.nombre_cliente}</p>
            <div className="bg-black/20 p-3 rounded-lg mb-4">
               <p className="text-sm">ID Producto: {p.producto_id}</p>
               <p className="text-sm font-bold">Cantidad: {p.cantidad}</p>
            </div>
            <button 
              onClick={() => updateEstado(p.id, p.estado === 'pendiente' ? 'cocina' : 'listo')}
              className="w-full py-3 bg-white text-black rounded-xl font-bold uppercase text-xs"
            >
              {p.estado === 'pendiente' ? 'Tomar Pedido' : 'Marcar Listo'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
