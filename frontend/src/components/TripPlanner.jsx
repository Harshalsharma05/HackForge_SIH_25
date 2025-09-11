import React, { useState, useEffect } from "react";
import {
  FaPlus,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaEdit,
  FaTrash,
  FaPlay,
  FaCheck,
  FaSearch,
  FaStar,
  FaFilter,
  FaRoute,
  FaQrcode,
  FaCube,
  FaShieldAlt,
  FaTimes,
  FaDownload,
  FaLocationArrow,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import LocationTester from "./LocationTester";
import "./TripPlanner.css";

const TripPlanner = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedTripQR, setSelectedTripQR] = useState(null);
  const [showLocationTester, setShowLocationTester] = useState(false);
  const [selectedTripForTesting, setSelectedTripForTesting] = useState(null);

  // Trip form state - Updated to match backend controller
  const [tripForm, setTripForm] = useState({
    trip_name: "",
    destination: "",
    start_date: "",
    end_date: "",
    purpose: "tourism",
    itinerary: "",
    accommodation_details: "",
    emergency_contacts_for_trip: [
      {
        name: "",
        relationship: "",
        phone: "",
        email: "",
      },
    ],
    tracking_enabled: true,
  });

  const availablePurposes = [
    "tourism",
    "business",
    "education",
    "medical",
    "family",
    "religious",
    "adventure",
    "research",
  ];

  const tripStatuses = [
    { value: "all", label: "All Trips" },
    { value: "planned", label: "Planned" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  useEffect(() => {
    loadTrips();
  }, []);

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

  const loadTrips = async () => {
    try {
      setLoading(true);
      const response = await api.get("/trips/my-trips");
      console.log("Trips loaded:", response.data); // Debug log
      setTrips(response.data.data.trips || []);
    } catch (error) {
      console.error("Error loading trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTripForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEmergencyContactChange = (index, field, value) => {
    setTripForm((prev) => ({
      ...prev,
      emergency_contacts_for_trip: prev.emergency_contacts_for_trip.map(
        (contact, i) => (i === index ? { ...contact, [field]: value } : contact)
      ),
    }));
  };

  const addEmergencyContact = () => {
    setTripForm((prev) => ({
      ...prev,
      emergency_contacts_for_trip: [
        ...prev.emergency_contacts_for_trip,
        { name: "", relationship: "", phone: "", email: "" },
      ],
    }));
  };

  const removeEmergencyContact = (index) => {
    setTripForm((prev) => ({
      ...prev,
      emergency_contacts_for_trip: prev.emergency_contacts_for_trip.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const handleSubmitTrip = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (editingTrip) {
        const response = await api.patch(
          `/trips/${editingTrip._id}/update`,
          tripForm
        );
        setTrips((prev) =>
          prev.map((trip) =>
            trip._id === editingTrip._id ? response.data.data : trip
          )
        );
        alert("Trip updated successfully!");
      } else {
        const response = await api.post("/trips/create", tripForm);
        const newTrip = response.data.data;
        setTrips((prev) => [newTrip, ...prev]);

        // Show success message with blockchain info
        if (newTrip.blockchain_info) {
          alert(
            `Trip created successfully with blockchain Digital ID: ${newTrip.digital_id}\nTransaction Hash: ${newTrip.blockchain_info.tx_hash}`
          );
        } else {
          alert("Trip created successfully!");
        }
      }

      resetForm();
      setShowCreateForm(false);
      setEditingTrip(null);
    } catch (error) {
      console.error("Error saving trip:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Failed to save trip";
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTripForm({
      trip_name: "",
      destination: "",
      start_date: "",
      end_date: "",
      purpose: "tourism",
      itinerary: "",
      accommodation_details: "",
      emergency_contacts_for_trip: [
        {
          name: "",
          relationship: "",
          phone: "",
          email: "",
        },
      ],
      tracking_enabled: true,
    });
  };

  const handleEditTrip = (trip) => {
    setTripForm({
      trip_name: trip.trip_name || "",
      destination: trip.destination || "",
      start_date: trip.start_date
        ? new Date(trip.start_date).toISOString().split("T")[0]
        : "",
      end_date: trip.end_date
        ? new Date(trip.end_date).toISOString().split("T")[0]
        : "",
      purpose: trip.purpose || "tourism",
      itinerary: trip.itinerary || "",
      accommodation_details: trip.accommodation_details || "",
      emergency_contacts_for_trip: Array.isArray(
        trip.emergency_contacts_for_trip
      )
        ? trip.emergency_contacts_for_trip.length > 0
          ? trip.emergency_contacts_for_trip
          : [{ name: "", relationship: "", phone: "", email: "" }]
        : [{ name: "", relationship: "", phone: "", email: "" }],
      tracking_enabled: trip.tracking_enabled !== false,
    });
    setEditingTrip(trip);
    setShowCreateForm(true);
  };

  const handleDeleteTrip = async (tripId) => {
    if (window.confirm("Are you sure you want to delete this trip?")) {
      try {
        await api.delete(`/trips/${tripId}`);
        setTrips((prev) => prev.filter((trip) => trip._id !== tripId));
      } catch (error) {
        console.error("Error deleting trip:", error);
        alert("Failed to delete trip. Please try again.");
      }
    }
  };

  const handleStartTrip = async (tripId) => {
    try {
      const response = await api.post(`/trips/${tripId}/activate`);
      setTrips((prev) =>
        prev.map((trip) => (trip._id === tripId ? response.data.data : trip))
      );
      alert("Trip activated successfully!");
    } catch (error) {
      console.error("Error starting trip:", error);
      alert("Failed to start trip. Please try again.");
    }
  };

  const handleCompleteTrip = async (tripId) => {
    try {
      const response = await api.post(`/trips/${tripId}/complete`);
      setTrips((prev) =>
        prev.map((trip) => (trip._id === tripId ? response.data.data : trip))
      );
      alert("Trip completed successfully!");
    } catch (error) {
      console.error("Error completing trip:", error);
      alert("Failed to complete trip. Please try again.");
    }
  };

  const handleShowQRCode = async (trip) => {
    console.log("Trip QR codes:", trip.qr_codes); // Debug log

    if (trip.qr_codes && trip.qr_codes["digital_id"]) {
      // QR codes are already available in the trip data
      setSelectedTripQR(trip);
      setShowQRCode(true);
    } else {
      // If no QR codes are available, show an error message
      alert(
        "QR code not available for this trip. Please try recreating the trip or contact support."
      );
    }
  };

  const handleShowLocationTester = (trip) => {
    setSelectedTripForTesting(trip);
    setShowLocationTester(true);
  };

  const handleCloseLocationTester = () => {
    setShowLocationTester(false);
    setSelectedTripForTesting(null);
  };

  const filteredTrips = trips.filter((trip) => {
    const matchesStatus =
      filterStatus === "all" || trip.status === filterStatus;
    const matchesSearch =
      (trip.trip_name || trip.title || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      trip.destination.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "planned":
        return "#007bff";
      case "active":
        return "#28a745";
      case "completed":
        return "#6c757d";
      case "cancelled":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getStatusBadgeStyles = (status) => {
    switch (status) {
      case "planned":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-purple-100 text-purple-800";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="trip-planner loading">
        <div className="loading-spinner"></div>
        <p>Loading your trips...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl lg:text-4xl font-bold mb-3">
                Trip Planner
              </h2>
              <p className="text-lg text-blue-100 max-w-2xl">
                Plan, organize, and manage your travel adventures with secure
                digital IDs
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
              onClick={() => setShowCreateForm(true)}
            >
              <FaPlus className="w-4 h-4" />
              Create New Trip
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search trips..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none cursor-pointer"
              >
                {tripStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              {filteredTrips.length} trip{filteredTrips.length !== 1 ? "s" : ""}{" "}
              found
            </div>
          </div>
        </div>
      </div>

      {/* Trip Creation Form */}
      {showCreateForm && (
        <div className="form-overlay">
          <div className="trip-form-container">
            <div className="form-header">
              <h3>{editingTrip ? "Edit Trip" : "Create New Trip"}</h3>
              <button
                className="close-form-btn"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingTrip(null);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitTrip} className="trip-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="trip_name">Trip Name *</label>
                  <input
                    type="text"
                    id="trip_name"
                    name="trip_name"
                    value={tripForm.trip_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Weekend in Goa"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="destination">Destination *</label>
                  <input
                    type="text"
                    id="destination"
                    name="destination"
                    value={tripForm.destination}
                    onChange={handleInputChange}
                    placeholder="e.g., Goa, India"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="start_date">Start Date *</label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={tripForm.start_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="end_date">End Date *</label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={tripForm.end_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="purpose">Purpose</label>
                  <select
                    id="purpose"
                    name="purpose"
                    value={tripForm.purpose}
                    onChange={handleInputChange}
                  >
                    {availablePurposes.map((purpose) => (
                      <option key={purpose} value={purpose}>
                        {purpose.charAt(0).toUpperCase() + purpose.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="tracking_enabled">
                    Enable Location Tracking
                  </label>
                  <div className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      id="tracking_enabled"
                      name="tracking_enabled"
                      checked={tripForm.tracking_enabled}
                      onChange={(e) =>
                        setTripForm((prev) => ({
                          ...prev,
                          tracking_enabled: e.target.checked,
                        }))
                      }
                    />
                    <span>Allow location tracking for safety</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="itinerary">Itinerary</label>
                <textarea
                  id="itinerary"
                  name="itinerary"
                  value={tripForm.itinerary}
                  onChange={handleInputChange}
                  placeholder="Describe your trip itinerary, places to visit, activities..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="accommodation_details">
                  Accommodation Details
                </label>
                <textarea
                  id="accommodation_details"
                  name="accommodation_details"
                  value={tripForm.accommodation_details}
                  onChange={handleInputChange}
                  placeholder="Hotel name, address, booking details..."
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label>Emergency Contacts for Trip</label>
                {tripForm.emergency_contacts_for_trip.map((contact, index) => (
                  <div key={index} className="emergency-contact-group">
                    <div className="emergency-contact-header">
                      <h4>Emergency Contact {index + 1}</h4>
                      {tripForm.emergency_contacts_for_trip.length > 1 && (
                        <button
                          type="button"
                          className="btn-danger remove-contact"
                          onClick={() => removeEmergencyContact(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor={`contact_name_${index}`}>Name *</label>
                        <input
                          type="text"
                          id={`contact_name_${index}`}
                          value={contact.name}
                          onChange={(e) =>
                            handleEmergencyContactChange(
                              index,
                              "name",
                              e.target.value
                            )
                          }
                          placeholder="Contact person name"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`contact_relationship_${index}`}>
                          Relationship *
                        </label>
                        <select
                          id={`contact_relationship_${index}`}
                          value={contact.relationship}
                          onChange={(e) =>
                            handleEmergencyContactChange(
                              index,
                              "relationship",
                              e.target.value
                            )
                          }
                          required
                        >
                          <option value="">Select relationship</option>
                          <option value="parent">Parent</option>
                          <option value="spouse">Spouse</option>
                          <option value="sibling">Sibling</option>
                          <option value="child">Child</option>
                          <option value="friend">Friend</option>
                          <option value="colleague">Colleague</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor={`contact_phone_${index}`}>
                          Phone *
                        </label>
                        <input
                          type="tel"
                          id={`contact_phone_${index}`}
                          value={contact.phone}
                          onChange={(e) =>
                            handleEmergencyContactChange(
                              index,
                              "phone",
                              e.target.value
                            )
                          }
                          placeholder="+91-9876543210"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`contact_email_${index}`}>Email</label>
                        <input
                          type="email"
                          id={`contact_email_${index}`}
                          value={contact.email}
                          onChange={(e) =>
                            handleEmergencyContactChange(
                              index,
                              "email",
                              e.target.value
                            )
                          }
                          placeholder="contact@email.com"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary add-contact"
                  onClick={addEmergencyContact}
                >
                  + Add Another Emergency Contact
                </button>
                <small className="form-help">
                  Add emergency contacts who can be reached during your trip. At
                  least one contact is required.
                </small>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingTrip ? "Update Trip" : "Create Trip"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingTrip(null);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trip List */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {filteredTrips.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FaRoute className="mx-auto w-16 h-16 text-gray-300 mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No trips found
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              {searchTerm || filterStatus !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Start planning your first adventure!"}
            </p>
            {!searchTerm && filterStatus === "all" && (
              <button
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                onClick={() => setShowCreateForm(true)}
              >
                <FaPlus className="w-4 h-4" />
                Create Your First Trip
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTrips.map((trip) => (
              <div
                key={trip._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                {/* Trip Card Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 truncate">
                          {safeRender(trip.trip_name || trip.title)}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getStatusBadgeStyles(
                              trip.status
                            )}`}
                          >
                            {safeRender(trip.status)}
                          </span>
                          {trip.tracking_enabled && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              📍 Tracking
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Trip Details Row */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <FaMapMarkerAlt className="text-gray-400" />
                          <span className="font-medium">
                            {safeRender(trip.destination)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FaCalendarAlt className="text-gray-400" />
                          <span>
                            {formatDate(trip.start_date || trip.startDate)} -{" "}
                            {formatDate(trip.end_date || trip.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FaShieldAlt className="text-gray-400" />
                          <span className="capitalize">
                            {trip.purpose || "Tourism"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {trip.qr_codes && (
                        <button
                          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-600 hover:text-white transition-colors"
                          onClick={() => handleShowQRCode(trip)}
                          title="Show QR Code"
                        >
                          <FaQrcode className="w-4 h-4" />
                        </button>
                      )}
                      {(trip.status === "active" ||
                        trip.status === "planned") &&
                        trip.tracking_enabled && (
                          <button
                            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                            onClick={() => handleShowLocationTester(trip)}
                            title="Test Location Update"
                          >
                            <FaLocationArrow className="w-4 h-4" />
                          </button>
                        )}
                      <button
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-600 hover:text-white transition-colors"
                        onClick={() => handleEditTrip(trip)}
                        title="Edit trip"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                        onClick={() => handleDeleteTrip(trip._id)}
                        title="Delete trip"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Trip Content */}
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Section - Trip Description */}
                    <div className="flex-1">
                      {trip.itinerary && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            Itinerary
                          </h4>
                          <p
                            className="text-gray-600 text-sm leading-relaxed overflow-hidden"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {trip.itinerary}
                          </p>
                        </div>
                      )}

                      {trip.accommodation_details && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            Accommodation
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {trip.accommodation_details}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right Section - Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:w-48">
                      {trip.status === "planned" && (
                        <button
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                          onClick={() => handleStartTrip(trip._id)}
                        >
                          <FaPlay className="w-4 h-4" />
                          Start Trip
                        </button>
                      )}

                      {trip.status === "active" && (
                        <>
                          <button
                            className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            onClick={() => handleCompleteTrip(trip._id)}
                          >
                            <FaCheck className="w-4 h-4" />
                            Complete Trip
                          </button>
                          {trip.tracking_enabled && (
                            <button
                              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                              onClick={() => handleShowLocationTester(trip)}
                            >
                              <FaLocationArrow className="w-4 h-4" />
                              Test Location
                            </button>
                          )}
                        </>
                      )}

                      {trip.status === "completed" && (
                        <div className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg">
                          <FaStar className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium">Completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Location Tester Modal */}
      {showLocationTester && selectedTripForTesting && (
        <LocationTester
          selectedTrip={selectedTripForTesting}
          onClose={handleCloseLocationTester}
        />
      )}

      {/* QR Code Modal */}
      {showQRCode && selectedTripQR && (
        <div className="form-overlay">
          <div className="qr-modal">
            <div className="qr-modal-header">
              <h3>Digital ID QR Code</h3>
              <button
                className="close-form-btn"
                onClick={() => {
                  setShowQRCode(false);
                  setSelectedTripQR(null);
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div className="qr-modal-content">
              <div className="trip-info">
                <h4>{selectedTripQR.trip_name || selectedTripQR.title}</h4>
                <p>
                  <strong>Destination:</strong> {selectedTripQR.destination}
                </p>
                <p>
                  <strong>Digital ID:</strong> {selectedTripQR.digital_id}
                </p>
                {selectedTripQR.blockchain_info && (
                  <p>
                    <strong>Blockchain TX:</strong>{" "}
                    {selectedTripQR.blockchain_info.tx_hash?.substring(0, 20)}
                    ...
                  </p>
                )}
              </div>
              {selectedTripQR.qr_codes &&
                selectedTripQR.qr_codes["digital_id"] && (
                  <div className="qr-code-display">
                    <img
                      src={selectedTripQR.qr_codes["digital_id"]}
                      alt="Digital ID QR Code"
                      className="qr-code-image"
                    />
                    <p className="qr-instructions">
                      Show this QR code to authorities for quick verification
                    </p>

                    <div className="qr-actions">
                      <button
                        className="btn-primary"
                        onClick={() => {
                          // Download QR code
                          const link = document.createElement("a");
                          link.href = selectedTripQR.qr_codes["digital_id"];
                          link.download = `digital-id-${selectedTripQR.digital_id}.png`;
                          link.click();
                        }}
                      >
                        <FaDownload /> Download QR Code
                      </button>
                    </div>
                  </div>
                )}{" "}
              {selectedTripQR.blockchain_info && (
                <div className="blockchain-details">
                  <h5>Blockchain Verification</h5>
                  <div className="blockchain-item">
                    <strong>Network:</strong> Arbitrum Sepolia
                  </div>
                  <div className="blockchain-item">
                    <strong>Contract ID:</strong>{" "}
                    {selectedTripQR.blockchain_info.contract_id}
                  </div>
                  {selectedTripQR.blockchain_info.verification_url && (
                    <div className="blockchain-item">
                      <a
                        href={selectedTripQR.blockchain_info.verification_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="verification-link"
                      >
                        🔗 Verify on Blockchain
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPlanner;
