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
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUser,
  FaEyeSlash,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

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

  // Format date helper function
  const formatDate = (date) => {
    if (!date) return "Not set";
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "Not set";
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Not set";
    }
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
      case "active":
        return "bg-green-100 text-green-800";
      case "planned":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "verified":
      case "active":
        return <FaCheck className="w-3 h-3" />;
      case "planned":
        return <FaSync className="w-3 h-3" />;
      case "completed":
        return <FaCheck className="w-3 h-3" />;
      default:
        return <FaInfoCircle className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your trip information...</p>
        </div>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <FaQrcode className="w-16 h-16 text-gray-300 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Active Trip Found
          </h3>
          <p className="text-gray-600 mb-6">
            You don't have any active trips. Create a trip to get your digital
            ID.
          </p>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={refreshTrip}
          >
            <FaSync className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const hasQRCode = currentTrip.qr_codes && currentTrip.qr_codes["digital_id"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl lg:text-4xl font-bold mb-3">
                Digital Travel ID
              </h2>
              <p className="text-lg text-blue-100 max-w-2xl">
                Your secure digital identity for seamless travel verification
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${getStatusColor(
                  currentTrip.status
                )}`}
              >
                {getStatusIcon(currentTrip.status)}
                {safeRender(currentTrip.status, "Active").toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Code Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Your Digital ID
              </h3>

              {/* QR Code Display */}
              <div className="relative inline-block mb-6">
                {hasQRCode ? (
                  <div className="relative">
                    <img
                      src={currentTrip.qr_codes["digital_id"]}
                      alt="Trip Digital ID QR Code"
                      className="border-2 border-gray-200 rounded-lg shadow-sm"
                      style={{ width: `${qrSize}px`, height: `${qrSize}px` }}
                    />
                    {/* Center Logo Overlay */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-2 border-2 border-gray-200">
                      <FaShieldAlt className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50"
                    style={{ width: `${qrSize}px`, height: `${qrSize}px` }}
                  >
                    <FaQrcode className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">
                      QR Code not available
                    </p>
                  </div>
                )}
              </div>

              {/* QR Size Control */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR Code Size: {qrSize}px
                </label>
                <input
                  type="range"
                  min="128"
                  max="512"
                  step="64"
                  value={qrSize}
                  onChange={(e) => setQrSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={downloadQRCode}
                  disabled={!hasQRCode}
                >
                  <FaDownload className="w-4 h-4" />
                  Download
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={shareQRCode}
                  disabled={!hasQRCode}
                >
                  <FaShare className="w-4 h-4" />
                  Share
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  onClick={refreshTrip}
                >
                  <FaSync className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Trip Details Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Trip Details
              </h3>
              <button
                className="inline-flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                onClick={() => setShowFullDetails(!showFullDetails)}
              >
                {showFullDetails ? (
                  <FaEyeSlash className="w-4 h-4" />
                ) : (
                  <FaEye className="w-4 h-4" />
                )}
                {showFullDetails ? "Hide" : "Show"} Details
              </button>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Trip Name
                  </label>
                  <p className="text-gray-900 font-medium">
                    {safeRender(currentTrip.trip_name)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Digital ID
                  </label>
                  <p className="text-gray-900 font-mono text-sm">
                    {safeRender(currentTrip.digital_id)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Destination
                  </label>
                  <div className="flex items-center gap-2">
                    <FaMapMarkerAlt className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">
                      {safeRender(currentTrip.destination)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Purpose
                  </label>
                  <p className="text-gray-900 capitalize">
                    {safeRender(currentTrip.purpose, "Tourism")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Start Date
                  </label>
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">
                      {formatDate(currentTrip.start_date)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    End Date
                  </label>
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">
                      {formatDate(currentTrip.end_date)}
                    </p>
                  </div>
                </div>
              </div>

              {showFullDetails && (
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                  {currentTrip.itinerary && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Itinerary
                      </label>
                      <p className="text-gray-900 text-sm leading-relaxed">
                        {safeRender(currentTrip.itinerary)}
                      </p>
                    </div>
                  )}

                  {currentTrip.accommodation_details && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Accommodation
                      </label>
                      <p className="text-gray-900 text-sm">
                        {safeRender(currentTrip.accommodation_details)}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Created
                      </label>
                      <p className="text-gray-900 text-sm">
                        {formatDate(currentTrip.created_at)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Last Updated
                      </label>
                      <p className="text-gray-900 text-sm">
                        {formatDate(currentTrip.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Verification URL */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Verification URL
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={`${window.location.origin}/verify/${currentTrip.digital_id}`}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm"
                />
                <button
                  className="px-3 py-2 bg-gray-600 text-white rounded-r-lg hover:bg-gray-700 transition-colors"
                  onClick={copyVerificationUrl}
                  title="Copy verification URL"
                >
                  {copied ? (
                    <FaCheck className="w-4 h-4" />
                  ) : (
                    <FaCopy className="w-4 h-4" />
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-green-600 text-sm mt-1">
                  Copied to clipboard!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FaInfoCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  How to use your Digital ID
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>
                    • Show this QR code to authorities for instant verification
                  </li>
                  <li>
                    • Use at checkpoints and border controls for quick
                    processing
                  </li>
                  <li>
                    • Share with accommodation providers for seamless check-ins
                  </li>
                  <li>
                    • Emergency services can access your trip details via QR
                    scan
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <FaShieldAlt className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Security Features
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Secure QR code with verification capabilities</li>
                  <li>• Real-time status updates and trip validity checks</li>
                  <li>
                    • Privacy-focused - only essential trip data is shared
                  </li>
                  <li>• Tamper-proof digital identity for travel safety</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
