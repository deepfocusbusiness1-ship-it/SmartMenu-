import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function CierreMesa({ mesaId, onClose, onSuccess }) {
  const [consumo, setConsumo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [propinaSel, setPropinaSel] = useState(0); // 0, 0.10, 0.15, etc.

  useEffect(() => {
    const cargarConsumo = async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, productos(nombre, precio)")
        .eq("mesa_id", mesaId)
        .eq("pide_cuenta", false); // Solo lo que no se pagó aún

      if (!error) setConsumo(data || []);
      setLoading(false);
    };
    cargarConsumo();
  }, [mesaId]);

  const subtotal = consumo.reduce((acc, p) => acc + (p.productos.precio * p.cantidad), 0);
  const montoPropina = subtotal * propinaSel;
  const totalFinal = subtotal + montoPropina;

  const confirmarCierre = async () => {
    // Marcamos todos los pedidos de la mesa como "pide_cuenta = true"
    // y guardamos la propina en el último registro o prorrateada (aquí la guardamos en todos para simplificar)
    const { error } = await supabase
      .from("pedidos")
      .update({ pide_cuenta: true, propina: montoPropina / consumo.length })
      .eq("mesa_id", mesaId)
      .eq("pide_cuenta", false);

    if (!error) {
      onSuccess();
    } else {
      alert("Hubo un error al pedir la cuenta.");
    }
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
        <h2 className="text-2xl font-black uppercase tracking-tighter mb-6 text-center">Resumen de Cuenta</h2>
        
        {/* Lista de Consumo */}
        <div className="space-y-4 mb-8 max-h-48 overflow-y-auto pr-2">
          {consumo.map((p) => (
            <div key={p.id} className="flex justify-between text-sm">
              <span className="text-slate-400">{p.cantidad}x {p.productos.nombre}</span>
              <span className="font-bold">${p.productos.precio * p.cantidad}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-6 mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-slate-400">Subtotal</span>
            <span className="font-bold">${subtotal}</span>
          </div>
          
          {/* Selector de Propina */}
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-3 mt-4">¿Deseas sumar propina?</p>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[0, 0.10, 0.15, 0.20].map((valor) => (
              <button
                key={valor}
                onClick={() => setPropinaSel(valor)}
                className={`py-2 rounded-xl text-xs font-black border ${
                  propinaSel === valor ? 'bg-orange-500 border-orange-500 text-white' : 'border-white/10 text-slate-500'
                }`}
              >
                {valor === 0 ? "NO" : `${valor * 100}%`}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
            <span className="font-black uppercase text-xs">Total a Pagar</span>
            <span className="text-3xl font-black text-orange-500">${totalFinal}</span>
          </div>
        </div>

        <button
          onClick={confirmarCierre}
          className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-orange-500 hover:text-white transition-all mb-3"
        >
          Confirmar y pedir cuenta 🔔
        </button>
        <button onClick={onClose} className="w-full text-slate-500 font-bold text-xs uppercase">Seguir pidiendo</button>
      </div>
    </div>
  );
}
