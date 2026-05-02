import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Menu from "./components/Menu";
import AdminPanel from "./components/AdminPanel";
import OwnerDashboard from "./components/OwnerDashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta para el cliente (Mesa 1 por defecto) */}
        <Route path="/" element={<Menu mesaId="1" />} />
        
        {/* Ruta para la Cocina */}
        <Route path="/admin" element={<AdminPanel />} />
        
        {/* Ruta para el Dueño (Estadísticas e Inventario) */}
        <Route path="/owner" element={<OwnerDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
