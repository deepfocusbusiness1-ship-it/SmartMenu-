import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Menu from "./components/Menu";
import AdminPanel from "./components/AdminPanel";
import OwnerDashboard from "./components/OwnerDashboard";

/**
 * App.tsx - Director de Rutas de SmartMenu
 * Ubicación: src/App.tsx
 */
function App() {
  return (
    <Router>
      <Routes>
        {/* 1. Interfaz del Cliente (Escaneo de QR) 
            Por defecto cargamos Mesa 1, pero esto cambiará con los QRs dinámicos */}
        <Route path="/" element={<Menu mesaId="1" />} />
        
        {/* 2. Panel de Cocina / Mozos (Gestión de pedidos)
            Acceso: tudominio.com/admin */}
        <Route path="/admin" element={<AdminPanel />} />
        
        {/* 3. Panel del Dueño (Estadísticas, Inventario y Seguridad)
            Acceso: tudominio.com/owner */}
        <Route path="/owner" element={<OwnerDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
