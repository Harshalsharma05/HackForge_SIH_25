import { useState } from "react";
import {
  FaShieldAlt,
  FaUser,
  FaLock,
  FaUserTie,
  FaPlane,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import TestBackendConnection from "../components/TestBackendConnection";
import TouristRegistration from "./TouristRegistration";
import "./AuthorityLoginPage.css";

const LoginPage = () => {
  const [loginType, setLoginType] = useState("authority"); // 'authority' or 'tourist'
  const [showRegistration, setShowRegistration] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Basic validation
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const result = await login(formData, loginType);
      if (!result.success) {
        setError(
          result.error || "Login failed. Please check your credentials."
        );
      }
      // If successful, the app will redirect automatically via AuthContext
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const getHeaderConfig = () => {
    if (loginType === "authority") {
      return {
        icon: <FaShieldAlt className="header-icon" />,
        title: "Authority Portal",
        subtitle: "For authorized personnel only",
        placeholder: "Authority ID or Email",
      };
    } else {
      return {
        icon: <FaPlane className="header-icon" />,
        title: "Tourist Portal",
        subtitle: "Welcome back, traveler!",
        placeholder: "Email Address",
      };
    }
  };

  // Show registration form if requested
  if (showRegistration) {
    return (
      <TouristRegistration onBackToLogin={() => setShowRegistration(false)} />
    );
  }

  const headerConfig = getHeaderConfig();

  return (
    <div className="login-page-container">
      <div className="auth-login-card">
        {/* User Type Toggle */}
        <div className="user-type-toggle">
          <button
            type="button"
            className={`toggle-btn ${
              loginType === "authority" ? "active" : ""
            }`}
            onClick={() => setLoginType("authority")}
          >
            <FaUserTie /> Authority
          </button>
          <button
            type="button"
            className={`toggle-btn ${loginType === "tourist" ? "active" : ""}`}
            onClick={() => setLoginType("tourist")}
          >
            <FaPlane /> Tourist
          </button>
        </div>

        <div className="auth-login-header">
          {headerConfig.icon}
          <h2>{headerConfig.title}</h2>
          <p>{headerConfig.subtitle}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form className="auth-login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <FaUser className="input-icon" />
            <input
              type="email"
              name="email"
              placeholder={headerConfig.placeholder}
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-signin-button"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Secure Sign In"}
          </button>
        </form>

        <div className="auth-login-footer">
          <a href="#" onClick={(e) => e.preventDefault()}>
            Forgot Password?
          </a>
          {loginType === "tourist" && (
            <div className="register-link">
              <span>New to Trayana? </span>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowRegistration(true);
                }}
              >
                Create Account
              </a>
            </div>
          )}
        </div>

        {/* Dynamic Test Credentials Helper */}
        {loginType === "authority" && (
          <div className="test-credentials">
            <details
              style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}
            >
              <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                Available Test Accounts
              </summary>
              <div style={{ marginTop: "8px", lineHeight: "1.4" }}>
                <div>
                  <strong>Super Admin:</strong> admin@tourism.gov.in / admin123
                </div>
                <div>
                  <strong>Police:</strong> police.mumbai@police.gov.in /
                  police123
                </div>
                <div>
                  <strong>Tourism:</strong> tourism.goa@tourism.gov.in /
                  tourism123
                </div>
                <div>
                  <strong>Emergency:</strong> emergency.delhi@emergency.gov.in /
                  emergency123
                </div>
                <small
                  style={{ color: "#999", display: "block", marginTop: "5px" }}
                >
                  Run backend seed script if accounts don't exist
                </small>
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Backend Connection Test */}
      {/* <TestBackendConnection /> */}
    </div>
  );
};

export default LoginPage;
