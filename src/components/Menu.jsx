import React, { useState, useEffect } from 'react';
import menuData from '../data/MenuData.json';
import { Clock, Star, Gift, ShoppingCart, MessageSquare } from 'lucide-react';

const Menu = ({ onAddToCart }) => {
  const [horaActual, setHoraActual] = useState(new Date());
  const [categoriaActiva, setCategoriaActiva] = useState('desayunos');

  // Lógica para detectar la mesa desde la URL (ej: ?mesa=5)
  const [mesa, setMesa] = useState('S/N');

  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 60000);
    
    // Detectar mesa al cargar
    const params = new URLSearchParams(window.location.search);
    const mesaParam = params.get('mesa');
    if (mesaParam) setMesa(mesaParam);

    return () => clearInterval(timer);
  }, []);

  const getPromosActivas = () => {
    const hora = horaActual.getHours();
    return {
      esDesayuno: hora >= 8 && hora < 12,
      esHappyHour: hora >= 17 && hora < 20
    };
  };

  const { esDesayuno, esHappyHour } = getPromosActivas();

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* Banner Cumpleaños */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 text-center">
        <button className="flex items-center justify-center gap-2 w-full font-bold">
          <Gift size={20} /> ¡ES MI CUMPLEAÑOS! (Ver regalo)
        </button>
      </div>

      <header className="p-6">
        <h1 className="text-3xl font-black italic tracking-tighter">SMART MENU</h1>
        <p className="text-slate-400 text-sm">Escaneado en Mesa #{mesa}</p>
      </header>

      {/* Chips de Categorías */}
      <div className="flex gap-2 overflow-x-auto px-6 mb-8 no-scrollbar">
        {menuData.categorias.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoriaActiva(cat.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
              categoriaActiva === cat.id 
                ? 'bg-white text-black' 
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            {cat.nombre}
            {cat.id === 'desayunos' && esDesayuno && <span className="ml-2 text-orange-500">●</span>}
          </button>
        ))}
      </div>

      {/* Lista de Productos */}
      <div className="grid gap-6 px-6">
        {menuData.productos
          .filter(p => p.categoria === categoriaActiva)
          .map(producto => {
            const aplicaHappyHour = producto.happy_hour && esHappyHour;
            
            return (
              <div key={producto.id} className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex">
                <img src={producto.imagen} alt={producto.nombre} className="w-32 h-32 object-cover" />
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold">{producto.nombre}</h3>
                      {aplicaHappyHour && <span className="bg-orange-600 text-[10px] font-black px-2 py-1 rounded">2x1</span>}
                    </div>
                    <p className="text-slate-400 text-xs mt-1 line-clamp-2">{producto.descripcion}</p>
                  </div>
                  
                  <div className="flex justify-between items-end mt-2">
                    <div>
                      {aplicaHappyHour ? (
                        <>
                          <span className="text-slate-500 line-through text-xs">${producto.precio}</span>
                          <p className="font-bold text-green-400">${producto.precio / 2}</p>
                        </>
                      ) : (
                        <p className="font-bold">${producto.precio}</p>
                      )}
                    </div>
                    <button 
                      onClick={() => onAddToCart(producto)}
                      className="bg-white text-black p-2 rounded-xl active:scale-90 transition-transform"
                    >
                      <ShoppingCart size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Carrito Flotante (UI solamente) */}
      <div className="fixed bottom-6 left-6 right-6 bg-white text-black h-16 rounded-2xl flex items-center justify-between px-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-black text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">0</div>
          <span className="font-bold">Ver pedido</span>
        </div>
        <span className="font-black">$0</span>
      </div>
    </div>
  );
};

export default Menu;
