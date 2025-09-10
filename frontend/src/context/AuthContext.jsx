import { createContext, useContext, useState, useEffect } from "react";
import { authAPI, touristAuthAPI } from "../services/api";

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null); // 'authority' or 'tourist'

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const storedUserType = localStorage.getItem("userType");

      if (token && storedUserType) {
        setUserType(storedUserType);

        try {
          // Try to verify token based on user type
          if (storedUserType === "authority") {
            const response = await authAPI.verifyToken();
            if (response.data.success) {
              setUser(response.data.data);
            } else {
              throw new Error("Token verification failed");
            }
          } else if (storedUserType === "tourist") {
            const response = await touristAuthAPI.getCurrentTourist();
            if (response.data.success) {
              setUser(response.data.data);
            } else {
              throw new Error("Token verification failed");
            }
          }
        } catch (error) {
          console.error("Auth verification failed:", error);
          // Clear invalid tokens
          localStorage.removeItem("authToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userType");
          setUser(null);
          setUserType(null);
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userType");
      setUser(null);
      setUserType(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials, loginType = "authority") => {
    try {
      if (loginType === "authority") {
        // Real API call for authority login
        const response = await authAPI.login(credentials);

        if (response.data.success) {
          const { admin, accessToken, refreshToken } = response.data.data;

          // Store tokens and user type
          localStorage.setItem("authToken", accessToken);
          localStorage.setItem("userType", "authority");

          // Store refresh token if provided
          if (refreshToken) {
            localStorage.setItem("refreshToken", refreshToken);
          }

          setUser(admin);
          setUserType("authority");
          return { success: true, userType: "authority" };
        } else {
          return {
            success: false,
            error: response.data.message || "Authority login failed",
          };
        }
      } else if (loginType === "tourist") {
        // Real API call for tourist
        const response = await touristAuthAPI.login(credentials);

        if (response.data.success) {
          const { tourist, accessToken, refreshToken } = response.data.data;

          localStorage.setItem("authToken", accessToken);
          localStorage.setItem("userType", "tourist");

          // Store refresh token if provided
          if (refreshToken) {
            localStorage.setItem("refreshToken", refreshToken);
          }

          setUser(tourist);
          setUserType("tourist");
          return { success: true, userType: "tourist" };
        } else {
          return {
            success: false,
            error: response.data.message || "Login failed",
          };
        }
      }
    } catch (error) {
      console.error(`${loginType} login error:`, error);
      return {
        success: false,
        error: error.response?.data?.message || `${loginType} login failed`,
      };
    }
  };

  const logout = async () => {
    try {
      if (userType === "authority") {
        await authAPI.logout();
      } else if (userType === "tourist") {
        await touristAuthAPI.logout();
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userType");
      setUser(null);
      setUserType(null);
    }
  };

  const register = async (registrationData) => {
    try {
      const response = await touristAuthAPI.register(registrationData);

      if (response.data.success) {
        return {
          success: true,
          message:
            "Registration successful! Please login with your credentials.",
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          message: response.data.message || "Registration failed",
        };
      }
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Registration failed. Please try again.",
      };
    }
  };

  const value = {
    user,
    userType,
    login,
    logout,
    register,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
