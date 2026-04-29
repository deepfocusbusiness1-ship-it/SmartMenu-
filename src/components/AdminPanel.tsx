import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import Login from "./Login";
import menuData from "../data/MenuData.json";

export default function AdminPanel() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true); // Nuevo estado de carga más sólido
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    // 1. Verificamos sesión apenas arranca
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };
    initSession();

    // 2. Escuchamos cambios (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPedidos = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .not("estado", "eq", "listo")
      .order("created_at", { ascending: true });

    if (!error) setPedidos(data || []);
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchPedidos();
      const channel = supabase.channel("realtime-pedidos")
        .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, fetchPedidos)
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [session, fetchPedidos]);

  const getNombreProducto = (producto_id: any) => {
    const lista = menuData.productos || [];
    const p = lista.find((item: any) => String(item.id) === String(producto_id));
    return p ? p.nombre : `Producto #${producto_id}`;
  };

  const handleLogout = () => supabase.auth.signOut();

  // --- RENDERIZADO SEGURO ---
  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-mono">Verificando credenciales...</div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tighter text-orange-500">Cocina Pro 🍳</h1>
        <button onClick={handleLogout} className="text-xs bg-red-500/10 text-red-400 px-3 py-1 rounded-lg border border-red-500/20">Salir</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pedidos.length === 0 ? (
          <p className="text-slate-500 italic col-span-full text-center py-10">Esperando nuevas comandas...</p>
        ) : (
          pedidos.map((p: any) => (
            <div key={p.id} className="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
              <div className="flex justify-between items-start mb-3">
                <span className="text-3xl font-black text-white">Mesa {p.mesa_id}</span>
                <span className="bg-orange-500 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">{p.estado}</span>
              </div>
              <p className="text-orange-400 font-bold text-lg leading-tight mb-1">{getNombreProducto(p.producto_id)}</p>
              <p className="text-slate-400 text-sm mb-4">Cant: <span className="text-white font-bold">{p.cantidad}</span> · {p.nombre_cliente}</p>
              
              <button 
                onClick={async () => {
                  const proximo = p.estado === 'pendiente' ? 'cocina' : 'listo';
                  await supabase.from("pedidos").update({ estado: proximo }).eq("id", p.id);
                  fetchPedidos();
                }}
                className="w-full py-3 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-colors"
              >
                {p.estado === 'pendiente' ? 'Tomar Comanda' : 'Marcar como Entregado'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
