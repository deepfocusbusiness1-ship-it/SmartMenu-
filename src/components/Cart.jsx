/**
 * Cart.jsx — SmartMenu
 *
 * Props:
 *  - items:    Array<{ id, nombre, precio, cantidad, happy_hour? }>
 *  - mesaId:   string (UUID de la mesa activa)
 *  - onClose:  () => void
 *  - onSuccess: (pedidoIds: string[]) => void  — callback tras insert exitoso
 *
 * Dependencias: @supabase/supabase-js (instalada en el proyecto)
 * Variables de entorno necesarias:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 */

import { useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Cliente Supabase (singleton por módulo) ──────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatARS = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

const precioEfectivo = (item) =>
  item.happy_hour ? item.precio * 0.5 : item.precio;

// ─── Estados del flujo ────────────────────────────────────────────────────────
const STEP = { CART: "cart", NOMBRE: "nombre", CONFIRM: "confirm", SUCCESS: "success" };

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Cart({ items = [], mesaId, onClose, onSuccess }) {
  const [step, setStep]           = useState(STEP.CART);
  const [nombre, setNombre]       = useState("");
  const [nombreError, setNombreError] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [pedidoIds, setPedidoIds] = useState([]);

  // Total calculado (respeta happy_hour)
  const total = useMemo(
    () => items.reduce((acc, i) => acc + precioEfectivo(i) * i.cantidad, 0),
    [items]
  );

  const propinaSugerida = Math.round(total * 0.1);

  // ── Validación de nombre ──────────────────────────────────────────────────
  const validarNombre = () => {
    const limpio = nombre.trim();
    if (!limpio) {
      setNombreError("Ingresá tu nombre para continuar.");
      return false;
    }
    if (limpio.length < 2) {
      setNombreError("El nombre debe tener al menos 2 caracteres.");
      return false;
    }
    setNombreError("");
    return true;
  };

  // ── INSERT en Supabase ────────────────────────────────────────────────────
  const confirmarPedido = async () => {
    if (!validarNombre()) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Crear sesión de usuario en la mesa
      const { data: sesion, error: sesionError } = await supabase
        .from("usuarios_sesion")
        .insert({ mesa_id: mesaId, nombre_cliente: nombre.trim() })
        .select("id")
        .single();

      if (sesionError) throw sesionError;

      // 2. Insertar una fila por cada ítem del carrito
      const filasPedidos = items.map((item) => ({
        mesa_id:         mesaId,
        usuario_id:      sesion.id,
        producto_id:     item.id,
        cantidad:        item.cantidad,
        precio_unitario: precioEfectivo(item), // snapshot de precio (incl. descuento activo)
        estado:          "pendiente",
        pagado:          false,
      }));

      const { data: pedidos, error: pedidosError } = await supabase
        .from("pedidos")
        .insert(filasPedidos)
        .select("id");

      if (pedidosError) throw pedidosError;

      const ids = pedidos.map((p) => p.id);
      setPedidoIds(ids);
      setStep(STEP.SUCCESS);
      onSuccess?.(ids);
    } catch (err) {
      console.error("[Cart] Error al confirmar pedido:", err);
      setError(err.message ?? "Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Render por step ────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes slideUp  { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes popIn    { 0%{opacity:0;transform:scale(0.85)} 100%{opacity:1;transform:scale(1)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        .cart-overlay { animation: fadeIn 0.25s ease }
        .cart-sheet   { animation: slideUp 0.35s cubic-bezier(.22,1,.36,1) }
        .pop-in       { animation: popIn 0.4s cubic-bezier(.22,1,.36,1) }
        ::-webkit-scrollbar{display:none}
        * { -webkit-tap-highlight-color:transparent }
      `}</style>

      {/* Overlay */}
      <div
        className="cart-overlay fixed inset-0 z-40 flex items-end justify-center"
        style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        {/* Sheet */}
        <div
          className="cart-sheet relative w-full max-w-md rounded-t-3xl overflow-hidden"
          style={{
            fontFamily: "'Outfit', sans-serif",
            background: "linear-gradient(170deg,#16122a 0%,#1e1535 60%,#12202e 100%)",
            maxHeight: "92svh",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* ── STEP: CART ─────────────────────────────────────────────── */}
          {step === STEP.CART && (
            <>
              <Header title="Tu pedido" subtitle={`${items.length} ítem${items.length !== 1 ? "s" : ""}`} onClose={onClose} />

              {/* Lista de ítems */}
              <div className="flex-1 overflow-y-auto px-5 pb-2">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <span className="text-5xl mb-3">🛒</span>
                    <p className="text-sm">El carrito está vacío.</p>
                  </div>
                ) : (
                  <ul className="space-y-2 py-2">
                    {items.map((item) => (
                      <CartRow key={item.id} item={item} />
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer con total */}
              {items.length > 0 && (
                <CartFooter total={total}>
                  <GradBtn onClick={() => setStep(STEP.NOMBRE)}>
                    Continuar →
                  </GradBtn>
                </CartFooter>
              )}
            </>
          )}

          {/* ── STEP: NOMBRE ───────────────────────────────────────────── */}
          {step === STEP.NOMBRE && (
            <>
              <Header title="¿Cómo te llamás?" subtitle="Para identificar tu pedido en la mesa" onClose={onClose} />

              <div className="flex-1 px-5 py-4 flex flex-col gap-5">
                {/* Input nombre */}
                <div>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => { setNombre(e.target.value); setNombreError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && validarNombre() && setStep(STEP.CONFIRM)}
                    placeholder="Tu nombre (ej: Lucas)"
                    maxLength={40}
                    autoFocus
                    className="w-full px-4 py-4 rounded-xl text-white text-base font-medium outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: nombreError
                        ? "1.5px solid #ef4444"
                        : "1.5px solid rgba(255,255,255,0.12)",
                      caretColor: "#f59e0b",
                    }}
                  />
                  {nombreError && (
                    <p className="text-red-400 text-xs mt-1.5 ml-1">{nombreError}</p>
                  )}
                </div>

                {/* Resumen compacto */}
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Resumen</p>
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-white/70 py-0.5">
                      <span>{item.cantidad}× {item.nombre}</span>
                      <span>{formatARS(precioEfectivo(item) * item.cantidad)}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 mt-2 pt-2 flex justify-between text-white font-bold">
                    <span>Total</span>
                    <span>{formatARS(total)}</span>
                  </div>
                </div>
              </div>

              <CartFooter total={total}>
                <div className="flex gap-2">
                  <OutlineBtn onClick={() => setStep(STEP.CART)}>← Volver</OutlineBtn>
                  <GradBtn onClick={() => validarNombre() && setStep(STEP.CONFIRM)}>
                    Confirmar →
                  </GradBtn>
                </div>
              </CartFooter>
            </>
          )}

          {/* ── STEP: CONFIRM ──────────────────────────────────────────── */}
          {step === STEP.CONFIRM && (
            <>
              <Header title="Confirmá tu pedido" subtitle={`Pedido de ${nombre.trim()}`} onClose={onClose} />

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {/* Ítems */}
                <ul className="space-y-2">
                  {items.map((item) => (
                    <CartRow key={item.id} item={item} />
                  ))}
                </ul>

                {/* Propina sugerida */}
                <div
                  className="rounded-xl p-4 flex items-center gap-3"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
                >
                  <span className="text-2xl">💛</span>
                  <div className="flex-1">
                    <p className="text-amber-400 text-sm font-semibold">Propina sugerida (10%)</p>
                    <p className="text-white/60 text-xs">Podés agregarla al pagar en la mesa</p>
                  </div>
                  <p className="text-amber-400 font-bold text-base">{formatARS(propinaSugerida)}</p>
                </div>

                {/* Error de red */}
                {error && (
                  <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <span className="text-red-400 text-lg">⚠️</span>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
              </div>

              <CartFooter total={total}>
                <div className="flex gap-2">
                  <OutlineBtn onClick={() => setStep(STEP.NOMBRE)} disabled={loading}>
                    ← Volver
                  </OutlineBtn>
                  <GradBtn onClick={confirmarPedido} disabled={loading}>
                    {loading ? <Spinner /> : "Enviar a cocina 🚀"}
                  </GradBtn>
                </div>
              </CartFooter>
            </>
          )}

          {/* ── STEP: SUCCESS ──────────────────────────────────────────── */}
          {step === STEP.SUCCESS && (
            <div className="pop-in flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="text-7xl mb-5">🎉</div>
              <h2 className="text-white text-2xl font-bold mb-2">
                ¡Pedido enviado, {nombre.trim()}!
              </h2>
              <p className="text-gray-400 text-sm mb-8 max-w-xs">
                Tu pedido ya está en cocina. Podés seguir el estado en tiempo real desde la mesa.
              </p>

              {/* IDs de referencia (útil para debugging / soporte) */}
              <p className="text-gray-600 text-xs mb-8">
                Ref: {pedidoIds[0]?.slice(0, 8)}…
              </p>

              <GradBtn onClick={onClose}>Volver al menú</GradBtn>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Sub-componentes internos ─────────────────────────────────────────────────

function Header({ title, subtitle, onClose }) {
  return (
    <div className="flex-shrink-0 flex items-center justify-between px-5 pt-2 pb-4">
      <div>
        <h2 className="text-white text-xl font-bold leading-tight">{title}</h2>
        {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      <button
        onClick={onClose}
        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 text-xl"
        style={{ background: "rgba(255,255,255,0.07)" }}
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}

function CartRow({ item }) {
  const precio = precioEfectivo(item);
  return (
    <li className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
        style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>
        {item.cantidad}
      </span>
      <span className="flex-1 text-white/90 text-sm font-medium truncate">{item.nombre}</span>
      <div className="text-right flex-shrink-0">
        {item.happy_hour && (
          <p className="text-gray-600 text-xs line-through">{formatARS(item.precio * item.cantidad)}</p>
        )}
        <p className={`text-sm font-bold ${item.happy_hour ? "text-amber-400" : "text-white"}`}>
          {formatARS(precio * item.cantidad)}
        </p>
      </div>
    </li>
  );
}

function CartFooter({ total, children }) {
  return (
    <div className="flex-shrink-0 px-5 pt-3 pb-7 border-t border-white/10 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-gray-400 text-sm">Total</span>
        <span className="text-white text-2xl font-bold">{formatARS(total)}</span>
      </div>
      {children}
    </div>
  );
}

function GradBtn({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-4 rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 transition-opacity"
      style={{
        background: disabled
          ? "rgba(255,255,255,0.1)"
          : "linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function OutlineBtn({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-4 rounded-xl font-semibold text-white/70 text-base transition-opacity"
      style={{ background: "rgba(255,255,255,0.07)", opacity: disabled ? 0.5 : 1 }}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block w-5 h-5 rounded-full border-2 border-white/30"
      style={{ borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }}
    />
  );
}
