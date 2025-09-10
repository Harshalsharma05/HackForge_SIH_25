import React, { useState, useEffect } from "react";
import {
  FaExclamationTriangle,
  FaPhone,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaMicrophone,
  FaSpinner,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./EmergencyPanel.css";

const EmergencyPanel = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [emergencyType, setEmergencyType] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

  // Emergency types
  const emergencyTypes = [
    { id: "medical", label: "Medical Emergency", icon: "🏥", color: "#ff4757" },
    { id: "safety", label: "Safety Threat", icon: "⚠️", color: "#ff6b35" },
    { id: "accident", label: "Accident", icon: "🚨", color: "#ff3838" },
    { id: "lost", label: "Lost/Stranded", icon: "🧭", color: "#ffa726" },
    { id: "theft", label: "Theft/Crime", icon: "🚔", color: "#e74c3c" },
    { id: "natural", label: "Natural Disaster", icon: "🌪️", color: "#8e44ad" },
    { id: "other", label: "Other Emergency", icon: "📞", color: "#34495e" },
  ];

  useEffect(() => {
    if (isOpen) {
      getCurrentLocation();
      loadEmergencyContacts();
    }
  }, [isOpen]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  };

  const loadEmergencyContacts = async () => {
    try {
      const response = await api.get("/tourist/emergency-contacts");
      setEmergencyContacts(response.data.contacts || []);
    } catch (error) {
      console.error("Error loading emergency contacts:", error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleSubmitEmergency = async (e) => {
    e.preventDefault();
    if (!emergencyType) {
      alert("Please select an emergency type");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("type", emergencyType);
      formData.append("description", description);
      formData.append("location", JSON.stringify(location));
      formData.append("timestamp", new Date().toISOString());

      if (audioBlob) {
        formData.append("audio", audioBlob, "emergency-audio.wav");
      }

      const response = await api.post("/sos/alert", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setAlertSent(true);

      // Auto-close after 3 seconds
      setTimeout(() => {
        setAlertSent(false);
        onClose();
        resetForm();
      }, 3000);
    } catch (error) {
      console.error("Error sending emergency alert:", error);
      alert("Failed to send emergency alert. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmergencyType("");
    setDescription("");
    setAudioBlob(null);
    setLocation(null);
  };

  const handleQuickCall = (contact) => {
    window.location.href = `tel:${contact.phone}`;
  };

  if (!isOpen) return null;

  return (
    <div className="emergency-panel-overlay">
      <div className="emergency-panel">
        <div className="emergency-header">
          <div className="emergency-title">
            <FaExclamationTriangle className="emergency-icon" />
            <h2>Emergency Alert</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {alertSent ? (
          <div className="alert-sent-confirmation">
            <FaCheckCircle className="success-icon" />
            <h3>Emergency Alert Sent!</h3>
            <p>Authorities and your emergency contacts have been notified.</p>
            <p>Help is on the way.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmitEmergency} className="emergency-form">
            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="quick-buttons">
                <button
                  type="button"
                  className="quick-btn police"
                  onClick={() => (window.location.href = "tel:100")}
                >
                  <FaShieldAlt />
                  Call Police (100)
                </button>
                <button
                  type="button"
                  className="quick-btn ambulance"
                  onClick={() => (window.location.href = "tel:108")}
                >
                  🚑 Call Ambulance (108)
                </button>
                <button
                  type="button"
                  className="quick-btn fire"
                  onClick={() => (window.location.href = "tel:101")}
                >
                  🚒 Fire Service (101)
                </button>
              </div>
            </div>

            {/* Emergency Type Selection */}
            <div className="form-group">
              <label>Type of Emergency *</label>
              <div className="emergency-types">
                {emergencyTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    className={`emergency-type-btn ${
                      emergencyType === type.id ? "selected" : ""
                    }`}
                    onClick={() => setEmergencyType(type.id)}
                    style={{
                      borderColor:
                        emergencyType === type.id ? type.color : "#ddd",
                    }}
                  >
                    <span className="type-icon">{type.icon}</span>
                    <span className="type-label">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="description">Description (Optional)</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the emergency situation..."
                rows="3"
              />
            </div>

            {/* Voice Recording */}
            <div className="form-group">
              <label>Voice Message (Optional)</label>
              <div className="voice-recording">
                {!isRecording ? (
                  <button
                    type="button"
                    className="record-btn"
                    onClick={startRecording}
                    disabled={audioBlob}
                  >
                    <FaMicrophone />
                    {audioBlob ? "Audio Recorded" : "Record Voice Message"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="record-btn recording"
                    onClick={stopRecording}
                  >
                    <FaMicrophone />
                    Recording... (Tap to stop)
                  </button>
                )}
                {audioBlob && (
                  <div className="audio-preview">
                    <audio controls src={URL.createObjectURL(audioBlob)} />
                    <button
                      type="button"
                      onClick={() => setAudioBlob(null)}
                      className="remove-audio"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Location Info */}
            <div className="form-group">
              <label>Current Location</label>
              <div className="location-info">
                <FaMapMarkerAlt className="location-icon" />
                {location ? (
                  <span>
                    Lat: {location.latitude.toFixed(6)}, Lng:{" "}
                    {location.longitude.toFixed(6)}
                    {location.accuracy &&
                      ` (±${Math.round(location.accuracy)}m)`}
                  </span>
                ) : (
                  <span>Getting location...</span>
                )}
              </div>
            </div>

            {/* Emergency Contacts */}
            {emergencyContacts.length > 0 && (
              <div className="form-group">
                <label>Emergency Contacts</label>
                <div className="emergency-contacts">
                  {emergencyContacts.slice(0, 3).map((contact, index) => (
                    <button
                      key={index}
                      type="button"
                      className="contact-btn"
                      onClick={() => handleQuickCall(contact)}
                    >
                      <FaPhone />
                      <div>
                        <div className="contact-name">{contact.name}</div>
                        <div className="contact-phone">{contact.phone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="form-actions">
              <button
                type="submit"
                className="emergency-submit-btn"
                disabled={isSubmitting || !emergencyType}
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="spinner" />
                    Sending Alert...
                  </>
                ) : (
                  <>
                    <FaExclamationTriangle />
                    Send Emergency Alert
                  </>
                )}
              </button>

              <p className="emergency-note">
                <strong>Note:</strong> This will immediately alert authorities
                and your emergency contacts
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EmergencyPanel;
