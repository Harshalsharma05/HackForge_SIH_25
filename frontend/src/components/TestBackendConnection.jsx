import React, { useState } from "react";
import { authAPI, touristAuthAPI } from "../services/api";

const TestBackendConnection = () => {
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const addResult = (test, status, message) => {
    setTestResults((prev) => [
      ...prev,
      { test, status, message, timestamp: new Date() },
    ]);
  };

  const testBackendConnection = async () => {
    setTesting(true);
    setTestResults([]);

    // Test 1: Basic backend connectivity
    try {
      const response = await fetch(
        "http://localhost:3000/api/v1/dashboard/stats"
      );
      if (response.ok) {
        addResult(
          "Backend Connectivity",
          "success",
          "Backend server is responding"
        );
      } else {
        addResult(
          "Backend Connectivity",
          "error",
          `Backend returned: ${response.status}`
        );
      }
    } catch (error) {
      addResult(
        "Backend Connectivity",
        "error",
        `Cannot connect to backend: ${error.message}`
      );
    }

    // Test 2: Authority login endpoint
    try {
      const response = await authAPI.login({
        email: "nonexistent@email.com",
        password: "wrongpassword",
      });
      addResult(
        "Authority Login Endpoint",
        "info",
        "Endpoint exists (expected auth failure)"
      );
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 400) {
        addResult(
          "Authority Login Endpoint",
          "success",
          "Authority login endpoint working"
        );
      } else {
        addResult(
          "Authority Login Endpoint",
          "error",
          `Unexpected error: ${error.message}`
        );
      }
    }

    // Test 3: Tourist login endpoint
    try {
      const response = await touristAuthAPI.login({
        email: "nonexistent@email.com",
        password: "wrongpassword",
      });
      addResult(
        "Tourist Login Endpoint",
        "info",
        "Endpoint exists (expected auth failure)"
      );
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 400) {
        addResult(
          "Tourist Login Endpoint",
          "success",
          "Tourist login endpoint working"
        );
      } else {
        addResult(
          "Tourist Login Endpoint",
          "error",
          `Unexpected error: ${error.message}`
        );
      }
    }

    setTesting(false);
  };

  const clearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    alert("Storage cleared! Page will reload.");
    window.location.reload();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        background: "white",
        border: "1px solid #ccc",
        padding: "15px",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        maxWidth: "400px",
        maxHeight: "80vh",
        overflow: "auto",
        zIndex: 9999,
      }}
    >
      <h3 style={{ margin: "0 0 15px 0", fontSize: "16px" }}>
        Backend Connection Test
      </h3>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <button
          onClick={testBackendConnection}
          disabled={testing}
          style={{
            padding: "8px 16px",
            backgroundColor: testing ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: testing ? "not-allowed" : "pointer",
            fontSize: "12px",
          }}
        >
          {testing ? "Testing..." : "Test Backend"}
        </button>

        <button
          onClick={clearStorage}
          style={{
            padding: "8px 16px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Clear Storage
        </button>
      </div>

      <div style={{ maxHeight: "300px", overflow: "auto" }}>
        {testResults.map((result, index) => (
          <div
            key={index}
            style={{
              padding: "8px",
              margin: "5px 0",
              borderRadius: "4px",
              fontSize: "12px",
              backgroundColor:
                result.status === "success"
                  ? "#d4edda"
                  : result.status === "error"
                  ? "#f8d7da"
                  : "#d1ecf1",
              border:
                result.status === "success"
                  ? "1px solid #c3e6cb"
                  : result.status === "error"
                  ? "1px solid #f5c6cb"
                  : "1px solid #bee5eb",
            }}
          >
            <strong>{result.test}:</strong>
            <br />
            <span
              style={{
                color:
                  result.status === "success"
                    ? "#155724"
                    : result.status === "error"
                    ? "#721c24"
                    : "#0c5460",
              }}
            >
              {result.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestBackendConnection;
