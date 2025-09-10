import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthorityDashboard from "./pages/AuthorityDashboard";
import Dashboard from "./pages/Dashboard"; // Tourist Dashboard
import "./index.css";

// Component to handle routing based on user type
const AppRouter = () => {
  const { userType, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        Loading...
      </div>
    );
  }

  // Render appropriate dashboard based on user type
  if (userType === "authority") {
    return <AuthorityDashboard />;
  } else if (userType === "tourist") {
    return <Dashboard />; // Tourist Dashboard
  }

  // This should not happen as ProtectedRoute handles unauthenticated users
  return null;
};

function MainApp() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppRouter />
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default MainApp;
