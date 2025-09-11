import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthorityDashboard from "./pages/AuthorityDashboard";
import TouristDashboard from "./pages/TouristDashboard";
import TestBackendConnection from "./components/TestBackendConnection";
import "./App.css";
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
          fontSize: "18px",
          color: "#673AB7",
        }}
      >
        Loading Trayana...
      </div>
    );
  }

  // Render appropriate dashboard based on user type
  if (userType === "authority") {
    return (
      <>
        {/* <TestBackendConnection /> */}
        <AuthorityDashboard />
      </>
    );
  } else if (userType === "tourist") {
    return (
      <>
        {/* <TestBackendConnection /> */}
        <TouristDashboard />
      </>
    );
  }

  // This should not happen as ProtectedRoute handles unauthenticated users
  return null;
};

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppRouter />
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
