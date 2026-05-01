import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Cart from "./Cart";

// Las categorías las dejamos fijas aquí por ahora
const CATEGORIAS = ["todos", "desayunos", "bebidas", "comida"];

export default function Menu({ mesaId = "S/N" }) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriaSel, setCategoriaSel] = useState("todos");
  const [carrito, setCarrito] = useState([]);
  const [showCart, setShowCart] = useState(false);

  // 1. Cargar productos desde Supabase
  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("disponible", true); // Solo mostramos lo que hay en stock

      if (!error) {
        setProductos(data || []);
      } else {
        console.error("Error cargando menú:", error.message);
      }
      setLoading(false);
    };

    fetchProductos();
  }, []);

  // 2. Lógica del Carrito
  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existe = prev.find((item) => item.id === producto.id);
      if (existe) {
        return prev.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  // 3. Filtrado por categoría
  const productosFiltrados = categoriaSel === "todos" 
    ? productos 
    : productos.filter(p => p.categoria === categoriaSel);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-mono">
        Cargando delicias...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-24">
      {/* Header Estilo Bar */}
      <header className="p-6 pt-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter">SmartMenu</h1>
        <p className="text-orange-500 font-bold uppercase text-xs tracking-widest">Mesa {mesaId}</p>
      </header>

      {/* Selector de Categorías */}
      <div className="flex gap-2 overflow-x-auto px-6 mb-8 no-scrollbar">
        {CATEGORIAS.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoriaSel(cat)}
            className={`px-6 py-2 rounded-full text-xs font-black uppercase transition-all whitespace-nowrap ${
              categoriaSel === cat ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-500'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid de Productos */}
      <div className="grid gap-6 px-6">
        {productosFiltrados.map(p => (
          <div key={p.id} className="bg-white/5 rounded-3xl overflow-hidden border border-white/5 flex flex-col">
            <div className="h-48 overflow-hidden relative">
              <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
              {p.popular && (
                <span className="absolute top-4 left-4 bg-amber-500 text-black text-[10px] font-black px-2 py-1 rounded-lg uppercase">
                  ⭐ Popular
                </span>
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-xl leading-tight">{p.nombre}</h3>
                <span className="text-orange-500 font-black">${p.precio}</span>
              </div>
              <p className="text-slate-500 text-sm mb-6 flex-1">{p.descripcion}</p>
              <button
                onClick={() => agregarAlCarrito(p)}
                className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                Agregar al pedido +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Botón Flotante del Carrito (Solo aparece si hay items) */}
      {totalItems > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-8 left-6 right-6 bg-orange-500 py-5 rounded-3xl shadow-2xl shadow-orange-500/40 flex justify-between px-8 items-center animate-bounce-subtle"
        >
          <span className="bg-black text-white w-8 h-8 flex items-center justify-center rounded-full font-black text-sm">
            {totalItems}
          </span>
          <span className="font-black uppercase tracking-widest text-sm">Ver mi pedido</span>
          <span className="font-black text-lg">🚀</span>
        </button>
      )}

      {/* Modal del Carrito */}
      {showCart && (
        <Cart 
          items={carrito} 
          mesaId={mesaId} 
          onClose={() => setShowCart(false)} 
          onSuccess={() => {
            setCarrito([]);
            setShowCart(false);
            alert("¡Pedido enviado con éxito! 🥂");
          }}
        />
      )}
    </div>
  );
}
