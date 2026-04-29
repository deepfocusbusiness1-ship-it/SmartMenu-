import Menu from './components/Menu';

function App() {
  // Función temporal para manejar los clics en "Agregar"
  const handleAddToCart = (producto: any) => {
    console.log('Producto agregado al carrito:', producto);
    // Aquí es donde luego conectaremos la lógica de Supabase
  };

  return (
    <main className="min-h-screen bg-slate-950">
      <Menu onAddToCart={handleAddToCart} />
    </main>
  );
}

export default App;
