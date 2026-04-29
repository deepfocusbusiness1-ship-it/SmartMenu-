import { useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

// Funciones auxiliares de formato y cálculo
const formatARS = (n) => new Intl.NumberFormat("es-AR", { 
  style: "currency", 
  currency: "ARS", 
  maximumFractionDigits: 0 
}).format(n);

const precioEfectivo = (item) => item.happy_hour ? item.precio * 0.5 : item.precio;

export default function Cart({ items = [], mesaId, onClose, onSuccess }) {
  const [nombre, setNombre] = useState("");
  const [mesaManual, setMesaManual] = useState(mesaId !== 'S/N' ? mesaId : ""); // Toma la mesa del QR o inicia vacío
  const [propinaSel, setPropinaSel] = useState(10); // 10% por defecto
  const [propinaManual, setPropinaManual] = useState("");
  const [loading, setLoading] = useState(false);

  // Cálculos de totales
  const subtotal = useMemo(() => items.reduce((acc, i) => acc + precioEfectivo(i) * i.cantidad, 0), [items]);
  
  const montoPropina = useMemo(() => {
    if (propinaSel === "manual") return Number(propinaManual) || 0;
    return Math.round(subtotal * (propinaSel / 100));
  }, [subtotal, propinaSel, propinaManual]);

  const totalFinal = subtotal + montoPropina;

  const confirmarPedido = async () => {
    if (!nombre.trim()) return alert("Por favor, ingresá tu nombre");
    if (!mesaManual.trim()) return alert("Por favor, ingresá el número de mesa");

    setLoading(true);
    try {
      const filasPedidos = items.map((item) => ({
        mesa_id: mesaManual.toString(), // Usamos el valor del estado mesaManual
        producto_id: item.id.toString(),
        cantidad: item.cantidad,
        precio_unitario: precioEfectivo(item),
        estado: "pendiente",
        nombre_cliente: nombre.trim()
      }));

      const { error } = await supabase.from("pedidos").insert(filasPedidos);
      if (error) throw error;
      onSuccess();
    } catch (err) {
      alert("Error al enviar pedido: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col text-white font-sans">
      {/* Header del Carrito */}
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-900/50 backdrop-blur-xl">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">Tu Pedido</h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Revisá antes de enviar</p>
        </div>
        <button onClick={onClose} className="bg-white/10 px-4 py-2 rounded-xl text-xs font-bold uppercase">Cerrar</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Lista de Productos */}
        <div className="space-y-3 mb-8">
          {items.map(item => (
            <div key={item.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <div>
                <p className="font-bold text-white">{item.cantidad}x {item.nombre}</p>
                {item.happy_hour && <p className="text-[10px] text-orange-400 font-bold uppercase">Happy Hour 50% OFF</p>}
              </div>
              <span className="font-mono text-sm text-slate-400">{formatARS(precioEfectivo(item) * item.cantidad)}</span>
            </div>
          ))}
        </div>

        {/* SECCIÓN DE PROPINA */}
        <div className="p-5 bg-orange-500/5 border border-orange-500/10 rounded-3xl mb-8">
          <p className="text-[10px] uppercase text-orange-500 font-black mb-3 tracking-widest text-center">¿Querés dejar propina para el mozo?</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[0, 10, 15, "manual"].map(val => (
              <button 
                key={val}
                onClick={() => setPropinaSel(val)}
                className={`py-3 rounded-xl text-xs font-black transition-all ${propinaSel === val ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400'}`}
              >
                {val === "manual" ? "OTRO" : val === 0 ? "NO" : val + "%"}
              </button>
            ))}
          </div>
          {propinaSel === "manual" && (
            <input 
              type="number" 
              placeholder="Monto en pesos"
              className="w-full bg-black/40 p-4 rounded-2xl mb-4 outline-none border border-orange-500/30 text-center font-bold"
              onChange={(e) => setPropinaManual(e.target.value)}
            />
          )}
          <div className="flex justify-between items-center px-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Propina sugerida:</span>
            <span className="text-lg font-black text-orange-400">{formatARS(montoPropina)}</span>
          </div>
        </div>

        {/* DATOS DEL CLIENTE (DISEÑO PRO) */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Campo Mesa */}
            <div className="col-span-1">
              <label className="text-[10px] uppercase text-slate-500 ml-2 mb-1 block">Mesa</label>
              <input 
                type="text" 
                placeholder="N°" 
                disabled={mesaId !== 'S/N'}
                className="w-full bg-white/5 p-4 rounded-2xl outline-none text-center font-black text-xl text-orange-500 border border-white/5 focus:border-orange-500/50 disabled:opacity-50"
                value={mesaManual}
                onChange={(e) => setMesaManual(e.target.value)}
              />
            </div>
            {/* Campo Nombre */}
            <div className="col-span-2">
              <label className="text-[10px] uppercase text-slate-500 ml-2 mb-1 block">Tu Nombre</label>
              <input 
                type="text" 
                placeholder="Ej: Ezequiel" 
                className="w-full bg-white/5 p-4 rounded-2xl outline-none font-bold border border-white/5 focus:border-orange-500/50"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <div className="flex justify-between items-end">
              <span className="text-slate-500 text-xs font-bold uppercase mb-1">Total Final</span>
              <span className="text-4xl font-black text-white tracking-tighter">{formatARS(totalFinal)}</span>
            </div>
          </div>

          <button 
            onClick={confirmarPedido}
            disabled={loading || items.length === 0}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-800 text-white py-5 rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-orange-500/20 active:scale-95 transition-all mt-4"
          >
            {loading ? "Procesando..." : "Enviar Pedido 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}
