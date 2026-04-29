import React, { useState } from 'react';
import Menu from './components/Menu';
import Cart from './components/Cart';

export default function App() {
  const [cartItems, setCartItems] = useState([]);
  const [showCart, setShowCart] = useState(false);

  // Detectar mesa desde la URL para pasársela al carrito
  const params = new URLSearchParams(window.location.search);
  const MESA_ID = params.get('mesa') || 'S/N';

  const handleAdd = (producto) => {
    setCartItems((prev) => {
      const existe = prev.find((i) => i.id === producto.id);
      if (existe) return prev.map((i) => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  return (
    <main className="min-h-screen bg-slate-950">
      <Menu onAddToCart={handleAdd} onOpenCart={() => setShowCart(true)} cartCount={cartItems.length} />
      
      {showCart && (
        <Cart
          items={cartItems}
          mesaId={MESA_ID}
          onClose={() => setShowCart(false)}
          onSuccess={() => { 
            setCartItems([]); 
            setShowCart(false); 
            alert("¡Pedido enviado con éxito!");
          }}
        />
      )}
    </main>
  );
}
