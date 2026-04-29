/**
 * AdminPanel.jsx — SmartMenu / Panel de Cocina
 *
 * Lee pedidos en tiempo real desde Supabase y permite al cocinero
 * avanzar el estado: pendiente → cocina → listo.
 *
 * Variables de entorno requeridas:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * El usuario de DB debe tener el rol 'cocina' (ver RLS en smartmenu_schema.sql)
 * o usar la service_role key en un entorno de servidor seguro.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Constantes ───────────────────────────────────────────────────────────────
const ESTADOS = {
  pendiente: { label: "Pendiente", next: "cocina",    nextLabel: "Tomar pedido",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "🕐" },
  cocina:    { label: "En cocina", next: "listo",     nextLabel: "Marcar listo",   color: "#3b82f6", bg: "rgba(59,130,246,0.12)",   icon: "🔥" },
  listo:     { label: "Listo",     next: null,        nextLabel: null,             color: "#22c55e", bg: "rgba(34,197,94,0.12)",    icon: "✅" },
  cancelado: { label: "Cancelado", next: null,        nextLabel: null,             color: "#6b7280", bg: "rgba(107,114,128,0.08)",  icon: "✕"  },
};

const FILTROS = ["todos", "pendiente", "cocina", "listo"];

const formatHora = (iso) =>
  new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

const formatARS = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

// Tiempo transcurrido en minutos
const minutosDesde = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

// ─── Hook: pedidos en tiempo real ────────────────────────────────────────────
function usePedidosRealtime() {
  const [pedidos, setPedidos]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const channelRef              = useRef(null);

  const fetchPedidos = useCallback(async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        id, cantidad, precio_unitario, estado, pagado, created_at,
        productos ( nombre, descripcion ),
        usuarios_sesion ( nombre_cliente ),
        mesas ( numero )
      `)
      .not("estado", "eq", "cancelado")
      .order("created_at", { ascending: true });

    if (error) { setError(error.message); return; }
    setPedidos(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPedidos();

    // Suscripción Realtime — escucha INSERT y UPDATE en pedidos
    channelRef.current = supabase
      .channel("cocina-pedidos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => fetchPedidos()          // re-fetch simple: mantiene consistencia total
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelRef.current);
    };
  }, [fetchPedidos]);

  return { pedidos, loading, error, refetch: fetchPedidos };
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AdminPanel() {
  const { pedidos, loading, error, refetch } = usePedidosRealtime();
  const [filtro, setFiltro]       = useState("todos");
  const [updating, setUpdating]   = useState({}); // { [pedidoId]: bool }
  const [tick, setTick]           = useState(0);  // para refrescar timers

  // Refresca timers cada 30 segundos
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Avanzar estado de un pedido
  const avanzarEstado = useCallback(async (pedido) => {
    const cfg = ESTADOS[pedido.estado];
    if (!cfg?.next) return;

    setUpdating((prev) => ({ ...prev, [pedido.id]: true }));

    const { error } = await supabase
      .from("pedidos")
      .update({ estado: cfg.next })
      .eq("id", pedido.id);

    if (error) console.error("[AdminPanel] Error al actualizar estado:", error);

    setUpdating((prev) => ({ ...prev, [pedido.id]: false }));
    // El canal Realtime dispara refetch automáticamente
  }, []);

  // Filtrado y agrupación
  const pedidosFiltrados = pedidos.filter(
    (p) => filtro === "todos" || p.estado === filtro
  );

  const counts = pedidos.reduce((acc, p) => {
    acc[p.estado] = (acc[p.estado] ?? 0) + 1;
    return acc;
  }, {});

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

        :root {
          --bg:       #0a0a0a;
          --surface:  #111111;
          --border:   #222222;
          --text:     #e5e5e5;
          --muted:    #555555;
          --amber:    #f59e0b;
          --blue:     #3b82f6;
          --green:    #22c55e;
          --red:      #ef4444;
        }

        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        @keyframes fadeSlide { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes pop       { 0%{transform:scale(1)} 50%{transform:scale(0.94)} 100%{transform:scale(1)} }

        .card-enter  { animation: fadeSlide 0.3s ease both; }
        .dot-pulse   { animation: pulse 1.4s ease infinite; }
        .btn-pop:active { animation: pop 0.15s ease; }
      `}</style>

      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", background: "var(--bg)", minHeight: "100svh", color: "var(--text)" }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <header style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>

              {/* Logo / título */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16
                }}>🍳</div>
                <div>
                  <p style={{ fontFamily: "'IBM Plex Mono'", fontWeight: 700, fontSize: 15, color: "var(--text)", margin: 0, lineHeight: 1 }}>
                    COCINA
                  </p>
                  <p style={{ fontSize: 11, color: "var(--muted)", margin: 0, letterSpacing: "0.05em" }}>
                    SmartMenu · Panel en vivo
                  </p>
                </div>
              </div>

              {/* Stats rápidas */}
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <StatPill color="var(--amber)" label="Pendientes" count={counts.pendiente ?? 0} />
                <StatPill color="var(--blue)"  label="En cocina"  count={counts.cocina    ?? 0} />
                <StatPill color="var(--green)" label="Listos"     count={counts.listo     ?? 0} />

                {/* Indicador live */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="dot-pulse" style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--green)" }} />
                  <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'IBM Plex Mono'" }}>LIVE</span>
                </div>

                {/* Botón refrescar manual */}
                <button
                  onClick={refetch}
                  style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", color: "var(--muted)", cursor: "pointer", fontSize: 12, fontFamily: "'IBM Plex Mono'" }}
                >
                  ↻ Sync
                </button>
              </div>
            </div>

            {/* ── Filtros ── */}
            <div style={{ display: "flex", gap: 4, paddingBottom: 12 }}>
              {FILTROS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  style={{
                    padding: "5px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12,
                    fontFamily: "'IBM Plex Mono'", fontWeight: 600, letterSpacing: "0.04em",
                    border: filtro === f ? "1px solid var(--amber)" : "1px solid var(--border)",
                    background: filtro === f ? "rgba(245,158,11,0.12)" : "transparent",
                    color: filtro === f ? "var(--amber)" : "var(--muted)",
                    textTransform: "uppercase",
                    transition: "all 0.15s ease",
                  }}
                >
                  {f === "todos" ? `Todos (${pedidos.length})` : `${f} (${counts[f] ?? 0})`}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── CONTENT ────────────────────────────────────────────────────── */}
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "20px" }}>

          {/* Estado de carga */}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 12 }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--amber)", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
              <span style={{ color: "var(--muted)", fontFamily: "'IBM Plex Mono'", fontSize: 13 }}>Cargando pedidos…</span>
            </div>
          )}

          {/* Error de conexión */}
          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <p style={{ color: "var(--red)", margin: 0, fontFamily: "'IBM Plex Mono'", fontSize: 13 }}>
                ⚠ Error de conexión: {error}
              </p>
            </div>
          )}

          {/* Sin pedidos */}
          {!loading && !error && pedidosFiltrados.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 12 }}>
              <span style={{ fontSize: 48 }}>🍽️</span>
              <p style={{ color: "var(--muted)", fontFamily: "'IBM Plex Mono'", fontSize: 13, margin: 0 }}>
                {filtro === "todos" ? "Sin pedidos activos" : `Sin pedidos en estado "${filtro}"`}
              </p>
            </div>
          )}

          {/* ── Grid de tarjetas ── */}
          {!loading && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}>
              {pedidosFiltrados.map((pedido, i) => (
                <PedidoCard
                  key={pedido.id}
                  pedido={pedido}
                  delay={i * 40}
                  isUpdating={!!updating[pedido.id]}
                  onAvanzar={() => avanzarEstado(pedido)}
                  tick={tick}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// ─── PedidoCard ───────────────────────────────────────────────────────────────
function PedidoCard({ pedido, delay, isUpdating, onAvanzar, tick }) {
  const cfg      = ESTADOS[pedido.estado] ?? ESTADOS.pendiente;
  const minutos  = minutosDesde(pedido.created_at);
  const urgente  = pedido.estado === "pendiente" && minutos >= 8;
  const nombre   = pedido.usuarios_sesion?.nombre_cliente ?? "—";
  const producto = pedido.productos?.nombre              ?? "Producto";
  const mesa     = pedido.mesas?.numero                  ?? "?";

  return (
    <div
      className="card-enter"
      style={{
        animationDelay: `${delay}ms`,
        background: urgente ? "rgba(239,68,68,0.06)" : "var(--surface)",
        border: urgente
          ? "1px solid rgba(239,68,68,0.35)"
          : `1px solid ${pedido.estado === "listo" ? "rgba(34,197,94,0.2)" : "var(--border)"}`,
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.3s ease",
      }}
    >
      {/* ── Barra de estado superior ── */}
      <div style={{
        height: 4,
        background: urgente ? "var(--red)" : cfg.color,
        opacity: pedido.estado === "listo" ? 0.5 : 1,
      }} />

      {/* ── Cabecera ── */}
      <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          {/* Mesa + nombre */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              fontFamily: "'IBM Plex Mono'", fontWeight: 700, fontSize: 13,
              background: "rgba(255,255,255,0.07)", borderRadius: 6,
              padding: "2px 8px", color: "var(--text)"
            }}>
              Mesa {mesa}
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{nombre}</span>
          </div>
          {/* Hora */}
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", fontFamily: "'IBM Plex Mono'" }}>
            {formatHora(pedido.created_at)}
          </p>
        </div>

        {/* Estado badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: cfg.bg, borderRadius: 8,
          padding: "4px 10px",
          border: `1px solid ${cfg.color}22`,
        }}>
          <span style={{ fontSize: 13 }}>{cfg.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, fontFamily: "'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* ── Producto ── */}
      <div style={{ padding: "0 16px 14px", flex: 1 }}>
        <p style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
          {pedido.cantidad > 1 && (
            <span style={{ color: cfg.color, fontFamily: "'IBM Plex Mono'", fontWeight: 700 }}>
              {pedido.cantidad}×{" "}
            </span>
          )}
          {producto}
        </p>
        {pedido.productos?.descripcion && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
            {pedido.productos.descripcion}
          </p>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: "10px 16px 14px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>

        {/* Timer */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 12, fontFamily: "'IBM Plex Mono'", color: urgente ? "var(--red)" : "var(--muted)", fontWeight: urgente ? 700 : 400 }}>
            {urgente && "⚠ "}⏱ {minutos}min
          </span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {formatARS(pedido.precio_unitario * pedido.cantidad)}
          </span>
        </div>

        {/* Botón de acción */}
        {cfg.next ? (
          <button
            className="btn-pop"
            onClick={onAvanzar}
            disabled={isUpdating}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              border: "none",
              cursor: isUpdating ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'IBM Plex Mono'",
              color: "#000",
              background: isUpdating ? "var(--border)" : cfg.color,
              display: "flex", alignItems: "center", gap: 6,
              transition: "background 0.2s ease",
              minWidth: 130,
              justifyContent: "center",
            }}
          >
            {isUpdating
              ? <><Spinner color="#888" /> Actualizando…</>
              : cfg.nextLabel
            }
          </button>
        ) : (
          <span style={{
            fontSize: 12, fontFamily: "'IBM Plex Mono'", fontWeight: 600,
            color: "var(--green)", padding: "9px 16px",
            background: "rgba(34,197,94,0.08)", borderRadius: 10,
          }}>
            ✓ Entregado
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────
function StatPill({ color, label, count }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <span style={{ fontFamily: "'IBM Plex Mono'", fontWeight: 700, fontSize: 18, color, lineHeight: 1 }}>
        {count}
      </span>
      <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function Spinner({ color = "#000" }) {
  return (
    <span style={{
      display: "inline-block", width: 13, height: 13, borderRadius: "50%",
      border: `2px solid ${color}44`,
      borderTopColor: color,
      animation: "spin 0.7s linear infinite",
    }} />
  );
}
