import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthorityDashboard from './pages/AuthorityDashboard';
import './index.css';

function AuthorityApp() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AuthorityDashboard />
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default AuthorityApp;