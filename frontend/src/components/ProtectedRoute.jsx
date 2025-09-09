import { useAuth } from '../context/AuthContext';
import AuthorityLoginPage from '../pages/AuthorityLoginPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Loading...
      </div>
    );
  }

  return isAuthenticated ? children : <AuthorityLoginPage />;
};

export default ProtectedRoute;