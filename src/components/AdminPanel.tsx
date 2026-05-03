import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import Login from "./Login";
import { Plus, Coffee, Utensils, Beer, Receipt, X } from "lucide-react";

// --- Tipos ---
interface Producto {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
}

interface Pedido {
  id: string;
  mesa_id: string;
  producto_id: string;
  cantidad: number;
  estado: "pendiente" | "cocina" | "entregado";
  nombre_cliente: string;
  pide_cuenta: boolean;
  productos?: { nombre: string; categoria: string; precio: number };
}

export default function AdminPanel() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      setLoading(false);
    };
    getSession();
  }, []);

  const fetchData = useCallback(async () => {
    const { data: pData } = await supabase.from("pedidos").select("*, productos(nombre, categoria, precio)");
    const { data: prodData } = await supabase.from("productos").select("*").eq("disponible", true);
    setPedidos(pData || []);
    setProductos(prodData || []);
  }, []);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

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

  // --- FUNCIONES MANUALES (MOZO) ---
  const agregarItemManual = async (producto: Producto) => {
    if (!mesaSeleccionada) return;
    const { error } = await supabase.from("pedidos").insert({
      mesa_id: mesaSeleccionada,
      producto_id: producto.id,
      cantidad: 1,
      estado: "entregado", // Se asume que el mozo lo sumó al llevarlo
      nombre_cliente: "Mozo (Manual)",
      precio_unitario: producto.precio
    });
    if (!error) {
      setShowAddModal(false);
      fetchData();
    }
  };

  const pedirCuentaManual = async (mesaId: string) => {
    await supabase.from("pedidos").update({ pide_cuenta: true }).eq("mesa_id", mesaId);
    fetchData();
  };

  const finalizarMesa = async (mesaId: string) => {
    await supabase.from("pedidos").delete().eq("mesa_id", mesaId);
    fetchData();
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Cargando SmartMenu...</div>;
  if (!session) return <Login onLogin={fetchData} />;

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-white font-sans">
      <header className="mb-10 flex justify-between items-center border-b border-white/5 pb-6">
        <h1 className="text-3xl font-black text-orange-500 uppercase">Monitor Híbrido</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-[10px] font-black uppercase text-slate-500 border border-white/10 px-4 py-2 rounded-xl">Salir</button>
      </header>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {mesasAgrupadas.map(([mesaId, info]) => (
          <div key={mesaId} className={`rounded-[2.5rem] border-2 transition-all p-6 flex flex-col justify-between ${
            info.pide_cuenta ? "bg-purple-900/40 border-purple-500 animate-pulse" :
            info.tiene_pendientes ? "bg-amber-500/5 border-amber-500/30" : "bg-emerald-500/5 border-emerald-500/30"
          }`}>
            <div>
              <div className="flex justify-between items-start mb-6">
                <span className="text-5xl font-black italic">M{mesaId}</span>
                <button 
                  onClick={() => { setMesaSeleccionada(mesaId); setShowAddModal(true); }}
                  className="p-4 bg-white/5 rounded-2xl hover:bg-orange-500/20 text-orange-500 transition-all border border-white/5"
                >
                  <Plus size={24} />
                </button>
              </div>

              <div className="space-y-3">
                {info.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-sm p-1">
                    <span className={item.estado === 'entregado' ? 'text-slate-500 line-through' : 'text-white font-bold'}>
                      {item.cantidad}x {item.productos?.nombre}
                    </span>
                    <span className="text-[8px] font-black uppercase bg-white/5 px-2 py-1 rounded text-slate-500">{item.estado}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 space-y-2">
              {info.pide_cuenta ? (
                <button onClick={() => finalizarMesa(mesaId)} className="w-full py-4 bg-purple-600 rounded-2xl font-black uppercase text-xs">Finalizar y Liberar</button>
              ) : (
                <>
                  <button onClick={() => pedirCuentaManual(mesaId)} className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[10px] text-slate-400 flex items-center justify-center gap-2">
                    <Receipt size={14} /> Marcar pedido de cuenta
                  </button>
                  <button onClick={() => supabase.from("pedidos").update({ estado: 'entregado' }).eq("mesa_id", mesaId).then(fetchData)} className="w-full py-3 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px]">Todo entregado</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL PARA AGREGAR ITEM MANUAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="font-black uppercase text-orange-500">Mesa {mesaSeleccionada}: Agregar Extra</h3>
              <button onClick={() => setShowAddModal(false)}><X size={20}/></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2">
              {productos.map(prod => (
                <button 
                  key={prod.id} 
                  onClick={() => agregarItemManual(prod)}
                  className="w-full flex justify-between items-center p-4 bg-white/5 rounded-2xl hover:bg-orange-500 hover:text-white transition-all group"
                >
                  <span className="font-bold text-sm">{prod.nombre}</span>
                  <span className="text-xs font-mono opacity-50 group-hover:opacity-100">${prod.precio}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
