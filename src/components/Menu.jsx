// App.jsx
import React, { useState, useEffect } from 'react';
import menuData from '../data/MenuData.json';
import Cart from './Cart'; // Así se llama al carrito si están en la misma carpeta
import { Clock, Star, Gift, ShoppingCart, MessageSquare } from 'lucide-react';
const MESA_ID = "uuid-de-tu-mesa"; // vendrá de la URL o contexto

export default function App() {
  const [cartItems, setCartItems] = useState([]);
  const [showCart, setShowCart]   = useState(false);

  const handleAdd = (producto) => {
    setCartItems((prev) => {
      const existe = prev.find((i) => i.id === producto.id);
      if (existe) return prev.map((i) => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  return (
    <>
      <Menu onAddToCart={handleAdd} onOpenCart={() => setShowCart(true)} />
      {showCart && (
        <Cart
          items={cartItems}
          mesaId={MESA_ID}
          onClose={() => setShowCart(false)}
          onSuccess={(ids) => { setCartItems([]); setShowCart(false); }}
        />
      )}
    </>
  );
}
