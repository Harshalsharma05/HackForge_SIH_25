import { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';

function App() {
  // State to control the sidebar's visibility on mobile/tablet
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // On larger screens, the sidebar will be controlled by CSS, not this state.
  // This state is primarily for the mobile toggle functionality.

  return (
    <div className="app-container">
      <Sidebar isOpen={isSidebarOpen} />
      <main className="main-content">
        <Dashboard toggleSidebar={toggleSidebar} />
      </main>
    </div>
  );
}

export default App; 

