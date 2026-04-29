// App.jsx
import { useState } from "react";
import Menu from "./components/Menu";
import Cart from "./components/Cart";

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
