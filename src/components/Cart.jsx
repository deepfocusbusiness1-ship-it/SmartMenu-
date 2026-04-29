import { useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

// Aquí sigue el resto de tu código (formatARS, precioEfectivo, etc.)

const formatARS = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const precioEfectivo = (item) => item.happy_hour ? item.precio * 0.5 : item.precio;

export default function Cart({ items = [], mesaId, onClose, onSuccess }) {
  const [step, setStep] = useState("cart");
  const [nombre, setNombre] = useState("");
  const [propinaSel, setPropinaSel] = useState(10); // 10% por defecto
  const [propinaManual, setPropinaManual] = useState("");
  const [loading, setLoading] = useState(false);

  const subtotal = useMemo(() => items.reduce((acc, i) => acc + precioEfectivo(i) * i.cantidad, 0), [items]);
  
  const montoPropina = useMemo(() => {
    if (propinaSel === "manual") return Number(propinaManual) || 0;
    return Math.round(subtotal * (propinaSel / 100));
  }, [subtotal, propinaSel, propinaManual]);

  const totalFinal = subtotal + montoPropina;

  const confirmarPedido = async () => {
    if (!nombre.trim()) return alert("Por favor, ingresá tu nombre");
    setLoading(true);

    try {
      const filasPedidos = items.map((item) => ({
        mesa_id: mesaId.toString(), // Enviamos como texto puro
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: precioEfectivo(item),
        estado: "pendiente",
        nombre_cliente: nombre.trim() // Lo guardamos directo en el pedido
      }));

      const { error } = await supabase.from("pedidos").insert(filasPedidos);
      if (error) throw error;
      onSuccess();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end">
      <div className="w-full bg-slate-900 rounded-t-3xl p-6 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-6">
          <h2 className="text-xl font-bold">Resumen de Pedido</h2>
          <button onClick={onClose} className="text-slate-400">Cerrar</button>
        </div>

        {items.map(item => (
          <div key={item.id} className="flex justify-between mb-2 text-sm border-b border-white/5 pb-2">
            <span>{item.cantidad}x {item.nombre}</span>
            <span>{formatARS(precioEfectivo(item) * item.cantidad)}</span>
          </div>
        ))}

        {/* SECCIÓN DE PROPINA */}
        <div className="mt-6 p-4 bg-white/5 rounded-2xl">
          <p className="text-xs uppercase text-slate-400 mb-3 tracking-widest">¿Querés dejar propina?</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[0, 10, 15, "manual"].map(val => (
              <button 
                key={val}
                onClick={() => setPropinaSel(val)}
                className={`py-2 rounded-lg text-sm font-bold transition-all ${propinaSel === val ? 'bg-amber-500 text-black' : 'bg-white/10'}`}
              >
                {val === "manual" ? "Otro" : val === 0 ? "No" : val + "%"}
              </button>
            ))}
          </div>
          {propinaSel === "manual" && (
            <input 
              type="number" 
              placeholder="Monto de propina"
              className="w-full bg-black/40 p-3 rounded-xl mb-3 outline-none border border-amber-500/50"
              onChange={(e) => setPropinaManual(e.target.value)}
            />
          )}
          <div className="flex justify-between text-amber-400 font-bold">
            <span>Propina:</span>
            <span>{formatARS(montoPropina)}</span>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <input 
            type="text" 
            placeholder="Tu nombre" 
            className="w-full bg-white/10 p-4 rounded-xl outline-none"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-400">Total a pagar:</span>
            <span className="text-3xl font-black">{formatARS(totalFinal)}</span>
          </div>
          <button 
            onClick={confirmarPedido}
            disabled={loading}
            className="w-full bg-white text-black py-5 rounded-2xl font-black text-lg uppercase tracking-tighter"
          >
            {loading ? "Enviando..." : "Realizar Pedido 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}
