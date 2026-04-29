import React, { useState, useEffect } from 'react';
import menuData from '../data/MenuData.json';
import { ShoppingCart, Gift } from 'lucide-react';

const Menu = ({ onAddToCart, onOpenCart, cartCount }) => {
  const [categoriaActiva, setCategoriaActiva] = useState('desayunos');
  const [mesa, setMesa] = useState('S/N');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mesaParam = params.get('mesa');
    if (mesaParam) setMesa(mesaParam);
  }, []);

  return (
    <div className="min-h-screen text-white pb-24">
      {/* Banner Cumpleaños */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 text-center">
        <button className="flex items-center justify-center gap-2 w-full font-bold">
          <Gift size={20} /> ¡ES MI CUMPLEAÑOS!
        </button>
      </div>

      <header className="p-6">
        <h1 className="text-3xl font-black italic tracking-tighter">SMART MENU</h1>
        <p className="text-slate-400 text-sm">Escaneado en Mesa #{mesa}</p>
      </header>

      {/* Categorías */}
      <div className="flex gap-2 overflow-x-auto px-6 mb-8 no-scrollbar">
        {menuData.categorias.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoriaActiva(cat.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium ${
              categoriaActiva === cat.id ? 'bg-white text-black' : 'bg-slate-900 text-slate-400'
            }`}
          >
            {cat.nombre}
          </button>
        ))}
      </div>

      {/* Productos */}
      <div className="grid gap-6 px-6">
        {menuData.productos
          .filter(p => p.categoria === categoriaActiva)
          .map(producto => (
            <div key={producto.id} className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex">
              <img src={producto.imagen} alt={producto.nombre} className="w-24 h-24 object-cover" />
              <div className="p-4 flex-1 flex flex-col justify-between">
                <h3 className="font-bold">{producto.nombre}</h3>
                <div className="flex justify-between items-end">
                  <p className="font-bold text-green-400">${producto.precio}</p>
                  <button 
                    onClick={() => onAddToCart(producto)}
                    className="bg-white text-black p-2 rounded-lg"
                  >
                    <ShoppingCart size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Botón Flotante para abrir el Carrito */}
      <button 
        onClick={onOpenCart}
        className="fixed bottom-6 left-6 right-6 bg-white text-black h-16 rounded-2xl flex items-center justify-between px-6 shadow-2xl z-50"
      >
        <div className="flex items-center gap-3">
          <div className="bg-black text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">
            {cartCount}
          </div>
          <span className="font-bold">Ver mi pedido</span>
        </div>
      </button>
    </div>
  );
};

export default Menu;
