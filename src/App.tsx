import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { useState } from 'react';
import AdminPanel from "./components/AdminPanel";
import Menu from "./components/Menu";
import Cart from "./components/Cart";

export default function App() {
  const [cartItems, setCartItems] = useState([]);
  const [showCart, setShowCart] = useState(false);

  const handleAdd = (producto) => {
    setCartItems((prev) => {
      const existe = prev.find((i) => i.id === producto.id);
      if (existe) return prev.map((i) => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <main className="min-h-screen bg-slate-950">
            {/* Si el carrito NO está abierto, mostramos el Menú normal */}
            {!showCart ? (
              <Menu 
                onAddToCart={handleAdd} 
                onOpenCart={() => setShowCart(true)} 
                cartCount={cartItems.length} 
              />
            ) : (
              /* Si el carrito ESTÁ abierto, mostramos solo el Carrito */
              <Cart
                items={cartItems}
                mesaId={new URLSearchParams(window.location.search).get('mesa') || 'S/N'}
                onClose={() => setShowCart(false)}
                onSuccess={() => { 
                  setCartItems([]); 
                  setShowCart(false); 
                  alert("¡Pedido enviado con éxito!");
                }}
              />
            )}
          </main>
        } />
        <Route path="/cocina" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
