import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import Login from "./Login";
import { Plus, Coffee, Utensils, IceCream, Beer } from "lucide-react";

// --- Tipos ---
interface Pedido {
  id: string;
  mesa_id: string;
  producto_id: string;
  cantidad: number;
  estado: "pendiente" | "cocina" | "entregado";
  nombre_cliente: string;
  pide_cuenta: boolean;
  productos?: {
    nombre: string;
    categoria: string;
  };
}

export default function AdminPanel() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  // --- Gestión de Sesión ---
  useEffect(() => {
    const getSession = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      setLoading(false);
    };
    getSession();
  }, []);

  const fetchPedidos = useCallback(async () => {
    const { data } = await supabase.from("pedidos").select("*, productos(nombre, categoria)");
    setPedidos(data || []);
  }, []);

  useEffect(() => {
    if (session) fetchPedidos();
  }, [session, fetchPedidos]);

  // --- LÓGICA DE AGRUPACIÓN ---
  const mesasAgrupadas = useMemo(() => {
    const grupos: Record<string, any> = {};
    
    pedidos.forEach(p => {
      if (!grupos[p.mesa_id]) {
        grupos[p.mesa_id] = { items: [], pide_cuenta: false, tiene_pendientes: false };
      }
      grupos[p.mesa_id].items.push(p);
      if (p.pide_cuenta) grupos[p.mesa_id].pide_cuenta = true;
      if (p.estado !== "entregado") grupos[p.mesa_id].tiene_pendientes = true;
    });

    return Object.entries(grupos).sort(([a], [b]) => Number(a) - Number(b));
  }, [pedidos]);

  const actualizarEstadoMesa = async (mesa_id: string, nuevoEstado: string) => {
    // Avanza todos los items de esa mesa al siguiente estado
    await supabase.from("pedidos").update({ estado: nuevoEstado }).eq("mesa_id", mesa_id);
    fetchPedidos();
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Cargando SmartMenu...</div>;
  if (!session) return <Login onLogin={fetchPedidos} />;

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-white">
      <header className="mb-10 flex justify-between items-center border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-orange-500 uppercase tracking-tighter">Panel de Servicio</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Manejo de Mesas Agrupado</p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {mesasAgrupadas.map(([mesaId, info]) => (
          <div key={mesaId} className={`rounded-[2.5rem] border-2 transition-all p-6 flex flex-col justify-between ${
            info.pide_cuenta ? "bg-purple-900/40 border-purple-500 animate-pulse" :
            info.tiene_pendientes ? "bg-amber-500/5 border-amber-500/30" : "bg-emerald-500/5 border-emerald-500/30"
          }`}>
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-5xl font-black italic">M{mesaId}</span>
                <div className="flex gap-2">
                  <button className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                    <Plus size={20} className="text-orange-400" />
                  </button>
                </div>
              </div>

              {/* Agrupación interna por categorías */}
              <div className="space-y-4">
                {["bebidas", "comidas", "postres"].map(cat => {
                  const itemsCat = info.items.filter((i: any) => i.productos?.categoria?.toLowerCase() === cat);
                  if (itemsCat.length === 0) return null;
                  
                  return (
                    <div key={cat} className="bg-white/5 p-4 rounded-3xl">
                      <p className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest flex items-center gap-2">
                        {cat === 'bebidas' && <Beer size={12}/>}
                        {cat === 'comidas' && <Utensils size={12}/>}
                        {cat}
                      </p>
                      {itemsCat.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center mb-1">
                          <span className={`font-bold ${item.estado === 'entregado' ? 'text-slate-600 line-through' : 'text-white'}`}>
                            {item.cantidad}x {item.productos?.nombre}
                          </span>
                          <span className="text-[8px] uppercase font-bold text-slate-500">{item.estado}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {info.pide_cuenta ? (
                <button 
                  onClick={() => supabase.from("pedidos").delete().eq("mesa_id", mesaId).then(fetchPedidos)}
                  className="w-full py-4 bg-purple-600 rounded-2xl font-black uppercase text-xs"
                >
                  ✅ Cobrar y Liberar Mesa
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => actualizarEstadoMesa(mesaId, "cocina")}
                    className="py-3 bg-amber-500 text-black rounded-xl font-black text-[10px] uppercase"
                  >
                    Todo a Cocina
                  </button>
                  <button 
                    onClick={() => actualizarEstadoMesa(mesaId, "entregado")}
                    className="py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase"
                  >
                    Todo Entregado
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
