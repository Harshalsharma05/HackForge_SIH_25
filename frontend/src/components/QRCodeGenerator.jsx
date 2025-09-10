import React, { useState, useEffect, useRef } from "react";
import {
  FaQrcode,
  FaDownload,
  FaShare,
  FaCopy,
  FaCheck,
  FaSync,
  FaInfoCircle,
  FaEye,
  FaShieldAlt,
  FaCube,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./QRCodeGenerator.css";

const QRCodeGenerator = () => {
  const { user } = useAuth();
  const [currentTrip, setCurrentTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrSize, setQrSize] = useState(256);
  const [showFullDetails, setShowFullDetails] = useState(false);

  // Helper function to safely render values
  const safeRender = (value, fallback = "N/A") => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "[Object]";
      }
    }
    return String(value);
  };

  useEffect(() => {
    loadCurrentTrip();
  }, []);

  const loadCurrentTrip = async () => {
    try {
      setLoading(true);
      const response = await api.get("/trips/current");
      if (response.data.data) {
        console.log("Current trip data:", response.data.data); // Debug log
        setCurrentTrip(response.data.data);
      } else {
        // If no current trip, try to get the most recent trip
        const tripsResponse = await api.get("/trips/my-trips");
        const trips = tripsResponse.data.data.trips || [];
        console.log("All trips data:", trips); // Debug log
        if (trips.length > 0) {
          // Get the most recent planned or active trip
          const activeTrip = trips.find(
            (trip) => trip.status === "active" || trip.status === "planned"
          );
          const selectedTrip = activeTrip || trips[0];
          console.log("Selected trip:", selectedTrip); // Debug log
          setCurrentTrip(selectedTrip);
        }
      }
    } catch (error) {
      console.error("Error loading current trip:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (
      !currentTrip ||
      !currentTrip.qr_codes ||
      !currentTrip.qr_codes["digital_id"]
    ) {
      alert("QR code not available");
      return;
    }

    const link = document.createElement("a");
    link.download = `trip-digital-id-${currentTrip.digital_id}.png`;
    link.href = currentTrip.qr_codes["digital_id"];
    link.click();
  };

  const shareQRCode = async () => {
    if (
      !currentTrip ||
      !currentTrip.qr_codes ||
      !currentTrip.qr_codes["digital_id"]
    ) {
      alert("QR code not available");
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Trip Digital ID",
          text: `Digital ID for trip: ${currentTrip.trip_name}`,
          url: window.location.href,
        });
      } else {
        // Fallback: copy verification URL to clipboard
        const verificationUrl =
          currentTrip.blockchain_info?.verification_url ||
          `${window.location.origin}/verify/${currentTrip.digital_id}`;
        await navigator.clipboard.writeText(verificationUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error("Error sharing QR code:", error);
    }
  };

  const copyVerificationUrl = async () => {
    try {
      const url =
        currentTrip?.blockchain_info?.verification_url ||
        `${window.location.origin}/verify/${currentTrip?.digital_id}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying URL:", error);
    }
  };

  const refreshTrip = async () => {
    await loadCurrentTrip();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "verified":
        return "#28a745";
      case "pending":
        return "#ffc107";
      case "rejected":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "verified":
        return <FaCheck />;
      case "pending":
        return <FaSync />;
      case "rejected":
        return <FaInfoCircle />;
      default:
        return <FaInfoCircle />;
    }
  };

  if (loading) {
    return (
      <div className="qr-generator loading">
        <div className="loading-spinner"></div>
        <p>Loading your trip information...</p>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div className="qr-generator error">
        <FaQrcode className="error-icon" />
        <h3>No Active Trip Found</h3>
        <p>
          You don't have any active trips. Create a trip to get your digital ID.
        </p>
        <button className="btn-primary" onClick={refreshTrip}>
          <FaSync /> Refresh
        </button>
      </div>
    );
  }

  const hasQRCode = currentTrip.qr_codes && currentTrip.qr_codes["digital_id"];

  return (
    <div className="qr-generator">
      <div className="qr-header">
        <div className="header-content">
          <h2>Trip Digital ID</h2>
          <p>Your secure, blockchain-verified trip identity</p>
        </div>
        <div className="verification-status">
          <div
            className={`status-badge ${
              currentTrip.blockchain_status || "pending"
            }`}
            style={{
              backgroundColor: getStatusColor(
                currentTrip.blockchain_status || "pending"
              ),
            }}
          >
            {getStatusIcon(currentTrip.blockchain_status || "pending")}
            <span>{safeRender(currentTrip.blockchain_status, "Pending")}</span>
          </div>
        </div>
      </div>

      <div className="qr-content">
        <div className="qr-card">
          <div className="qr-display">
            <div className="qr-code-container">
              {hasQRCode ? (
                <img
                  src={currentTrip.qr_codes["digital_id"]}
                  alt="Trip Digital ID QR Code"
                  className="qr-image"
                  style={{ width: `${qrSize}px`, height: `${qrSize}px` }}
                />
              ) : (
                <div
                  className="no-qr-placeholder"
                  style={{ width: `${qrSize}px`, height: `${qrSize}px` }}
                >
                  <FaQrcode />
                  <p>QR Code not available</p>
                </div>
              )}

              <div className="qr-overlay">
                <div className="qr-center-logo">
                  <FaShieldAlt />
                </div>
              </div>
            </div>

            <div className="qr-controls">
              <label htmlFor="qrSize">QR Size:</label>
              <input
                type="range"
                id="qrSize"
                min="128"
                max="512"
                step="64"
                value={qrSize}
                onChange={(e) => setQrSize(parseInt(e.target.value))}
                className="size-slider"
              />
              <span>{qrSize}px</span>
            </div>

            <div className="qr-actions">
              <button
                className="action-btn download"
                onClick={downloadQRCode}
                disabled={!hasQRCode}
              >
                <FaDownload />
                Download
              </button>
              <button
                className="action-btn share"
                onClick={shareQRCode}
                disabled={!hasQRCode}
              >
                <FaShare />
                Share
              </button>
              <button className="action-btn refresh" onClick={refreshTrip}>
                <FaSync />
                Refresh
              </button>
            </div>
          </div>

          <div className="id-details">
            <div className="id-header">
              <h3>Trip Details</h3>
              <button
                className="toggle-details"
                onClick={() => setShowFullDetails(!showFullDetails)}
              >
                <FaEye />
                {showFullDetails ? "Hide" : "Show"} Full Details
              </button>
            </div>

            <div className="basic-info">
              <div className="info-item">
                <label>Trip Name</label>
                <span>{safeRender(currentTrip.trip_name)}</span>
              </div>
              <div className="info-item">
                <label>Digital ID</label>
                <span>{safeRender(currentTrip.digital_id)}</span>
              </div>
              <div className="info-item">
                <label>Destination</label>
                <span>{safeRender(currentTrip.destination)}</span>
              </div>
              <div className="info-item">
                <label>Trip Status</label>
                <span className={`status-text ${currentTrip.status}`}>
                  {safeRender(currentTrip.status)}
                </span>
              </div>
            </div>

            {showFullDetails && (
              <div className="detailed-info">
                <div className="info-section">
                  <h4>Trip Information</h4>
                  <div className="info-item">
                    <label>Start Date</label>
                    <span>
                      {currentTrip.start_date
                        ? new Date(currentTrip.start_date).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>End Date</label>
                    <span>
                      {currentTrip.end_date
                        ? new Date(currentTrip.end_date).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Purpose</label>
                    <span>{safeRender(currentTrip.purpose, "Tourism")}</span>
                  </div>
                  {currentTrip.itinerary && (
                    <div className="info-item">
                      <label>Itinerary</label>
                      <span>{safeRender(currentTrip.itinerary)}</span>
                    </div>
                  )}
                </div>

                <div className="info-section">
                  <h4>Verification Details</h4>
                  <div className="info-item">
                    <label>Blockchain Status</label>
                    <span
                      className={`status-text ${currentTrip.blockchain_status}`}
                    >
                      {safeRender(currentTrip.blockchain_status, "Pending")}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Created</label>
                    <span>
                      {currentTrip.created_at
                        ? new Date(currentTrip.created_at).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Last Updated</label>
                    <span>
                      {currentTrip.updatedAt
                        ? new Date(currentTrip.updatedAt).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="info-section">
                  <h4>Blockchain Security</h4>
                  <div className="info-item">
                    <label>Transaction Hash</label>
                    <span className="hash-display">
                      {currentTrip.blockchain_info?.tx_hash ? (
                        <>
                          <FaCube className="blockchain-icon" />
                          {currentTrip.blockchain_info.tx_hash.substring(0, 20)}
                          ...
                        </>
                      ) : (
                        "Pending blockchain registration"
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="verification-url">
              <label>Verification URL</label>
              <div className="url-container">
                <input
                  type="text"
                  value={
                    currentTrip.blockchain_info?.verification_url ||
                    `${window.location.origin}/verify/${currentTrip.digital_id}`
                  }
                  readOnly
                  className="url-input"
                />
                <button
                  className="copy-btn"
                  onClick={copyVerificationUrl}
                  title="Copy verification URL"
                >
                  {copied ? <FaCheck /> : <FaCopy />}
                </button>
              </div>
              {copied && (
                <span className="copy-success">Copied to clipboard!</span>
              )}
            </div>
          </div>
        </div>

        <div className="qr-info">
          <div className="info-card">
            <FaInfoCircle className="info-icon" />
            <div className="info-content">
              <h4>How to use your Trip Digital ID</h4>
              <ul>
                <li>
                  Show this QR code to authorities for instant trip verification
                </li>
                <li>
                  Use at checkpoints and border controls for quick processing
                </li>
                <li>
                  Share with accommodation providers for seamless check-ins
                </li>
                <li>
                  Emergency services can access your trip details via QR scan
                </li>
              </ul>
            </div>
          </div>

          <div className="info-card">
            <FaShieldAlt className="info-icon security" />
            <div className="info-content">
              <h4>Security Features</h4>
              <ul>
                <li>Blockchain-secured for tamper-proof verification</li>
                <li>Encrypted QR code with secure hash verification</li>
                <li>Real-time status updates and trip validity checks</li>
                <li>Privacy-focused - only essential trip data is shared</li>
              </ul>
            </div>
          </div>

          <div className="info-card">
            <FaCube className="info-icon blockchain" />
            <div className="info-content">
              <h4>Blockchain Verification</h4>
              <p>
                Your trip identity is secured on the blockchain, ensuring
                authenticity and preventing fraud. Each scan verifies your trip
                details against the immutable blockchain record.
              </p>
              {currentTrip.blockchain_info?.tx_hash && (
                <div className="blockchain-link">
                  <a
                    href={`https://arbiscan.io/tx/${currentTrip.blockchain_info.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                  >
                    View on Blockchain
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
