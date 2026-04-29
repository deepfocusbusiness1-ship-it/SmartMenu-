import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import menuData from "../data/MenuData.json"; // Importamos los nombres de los productos

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

export default function AdminPanel() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPedidos = useCallback(async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, cantidad, precio_unitario, estado, created_at, nombre_cliente, mesa_id, producto_id")
      .not("estado", "eq", "listo")
      .order("created_at", { ascending: true });

    if (error) setError(error.message);
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

  const getNombreProducto = (id) => {
    const producto = menuData.productos.find(p => p.id.toString() === id.toString());
    return producto ? producto.nombre : `Producto ID: ${id}`;
  };

  if (loading) return <div className="p-10 text-white font-mono">Cargando pedidos...</div>;
  if (error) return <div className="p-10 text-red-500 font-mono">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-white font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <h1 className="text-3xl font-black tracking-tighter uppercase">Panel de Cocina 🔥</h1>
        <span className="bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full animate-pulse">LIVE</span>
      </div>

      {pedidos.length === 0 ? (
        <div className="text-center py-20 opacity-30">
          <p className="text-6xl mb-4">🍽️</p>
          <p className="text-xl font-bold italic">Esperando pedidos...</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pedidos.map(p => (
            <div key={p.id} className={`p-6 rounded-3xl border-2 transition-all ${p.estado === 'pendiente' ? 'bg-amber-500/5 border-amber-500' : 'bg-blue-500/5 border-blue-500'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="bg-white/10 px-4 py-2 rounded-2xl">
                  <span className="text-xs uppercase font-black opacity-50 block">Mesa</span>
                  <span className="text-2xl font-black">{p.mesa_id}</span>
                </div>
                <span className="text-[10px] font-mono opacity-40">{new Date(p.created_at).toLocaleTimeString()}</span>
              </div>
              
              <p className="text-amber-400 font-black text-lg mb-1 uppercase tracking-tight">{p.nombre_cliente}</p>
              
              <div className="bg-black/40 p-4 rounded-2xl mb-6 mt-4 border border-white/5">
                <p className="text-white text-xl font-bold leading-none mb-1">
                  {p.cantidad}x {getNombreProducto(p.producto_id)}
                </p>
                <p className="text-white/40 text-xs">Total: ${(p.precio_unitario * p.cantidad).toLocaleString()}</p>
              </div>

              <button 
                onClick={() => updateEstado(p.id, p.estado === 'pendiente' ? 'cocina' : 'listo')}
                className={`w-full py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all ${
                  p.estado === 'pendiente' 
                  ? 'bg-amber-500 text-black hover:bg-amber-400' 
                  : 'bg-blue-500 text-white hover:bg-blue-400'
                }`}
              >
                {p.estado === 'pendiente' ? '👨‍🍳 Tomar Pedido' : '✅ Marcar Listo'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
