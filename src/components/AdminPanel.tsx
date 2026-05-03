import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import Login from "./Login";

interface Pedido {
  id: string;
  mesa_id: string;
  producto_id: string;
  cantidad: number;
  estado: "pendiente" | "cocina" | "entregado"; // Nuevo estado: entregado
  nombre_cliente: string;
  created_at: string;
  pide_cuenta: boolean;
  productos?: { nombre: string };
}

export default function AdminPanel() {
  const [session, setSession] = useState<any>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  // ... (Mantenemos la lógica de login y sonido igual que antes)

  const fetchPedidos = useCallback(async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("*, productos(nombre)")
      .order("created_at", { ascending: true });
    setPedidos(data as any || []);
  }, []);

  useEffect(() => {
    fetchPedidos();
    // Suscripción Realtime (Mantenela igual a la anterior)
  }, [fetchPedidos]);

  const avanzarEstado = async (p: Pedido) => {
    let nuevoEstado = p.estado;
    if (p.estado === "pendiente") nuevoEstado = "cocina";
    else if (p.estado === "cocina") nuevoEstado = "entregado";

    await supabase.from("pedidos").update({ estado: nuevoEstado }).eq("id", p.id);
    fetchPedidos();
  };

  const finalizarServicio = async (mesa_id: string) => {
    // Cuando el mozo confirma que ya pagaron, borramos esos pedidos del panel
    const { error } = await supabase
      .from("pedidos")
      .delete() // O podrías marcarlos como 'archivado'
      .eq("mesa_id", mesa_id);
    
    if (!error) fetchPedidos();
  };

  if (!session) return <Login />;

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <h1 className="text-2xl font-black text-orange-500 mb-8 uppercase">Monitor de Servicio</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pedidos.map((p) => (
          <div key={p.id} className={`p-6 rounded-[2rem] border transition-all ${
            p.pide_cuenta ? "bg-purple-900/40 border-purple-500 animate-pulse" : "bg-slate-900/50 border-white/5"
          }`}>
            <div className="flex justify-between mb-4">
              <span className="text-3xl font-black italic">MESA {p.mesa_id}</span>
              <span className="text-[10px] font-bold uppercase bg-white/10 px-3 py-1 rounded-full">{p.estado}</span>
            </div>

            <h3 className="text-xl font-bold mb-4">{p.productos?.nombre} x{p.cantidad}</h3>

            {p.pide_cuenta ? (
              <button
                onClick={() => finalizarServicio(p.mesa_id)}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs"
              >
                ✅ Mesa Pagada / Liberar
              </button>
            ) : (
              <button
                onClick={() => avanzarEstado(p)}
                className={`w-full py-4 rounded-2xl font-black uppercase text-xs ${
                  p.estado === 'entregado' ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-black'
                }`}
                disabled={p.estado === 'entregado'}
              >
                {p.estado === "pendiente" ? "A Cocina 👨‍🍳" : p.estado === "cocina" ? "Entregar a Mesa 🏃‍♂️" : "En Mesa 🍽️"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
