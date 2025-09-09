import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AuthorityApp from './AuthorityApp';

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <Router>
      <Routes>
        <Route path="/authority" element={<AuthorityApp />} />
        <Route path="/" element={
          <div className="app-container">
            <Sidebar isOpen={isSidebarOpen} />
            <main className="main-content">
              <Dashboard toggleSidebar={toggleSidebar} />
            </main>
          </div>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App; 

