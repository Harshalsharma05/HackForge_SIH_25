import React, { useState } from "react";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaIdCard,
  FaUpload,
  FaEye,
  FaEyeSlash,
  FaCheck,
  FaTimes,
  FaLock,
  FaShieldAlt,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import "./TouristRegistration.css";
import axios from "axios";

const TouristRegistration = ({ onBackToLogin }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Information
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    date_of_birth: "",
    gender: "",
    nationality: "Indian",

    // KYC Information
    kyc_id: "",
    kyc_document_type: "",

    // Emergency Contacts
    emergency_contacts: [
      {
        name: "",
        phone: "",
        relationship: "",
        email: "",
      },
    ],

    // Preferences
    language: "english",
    tracking_consent: true,
    emergency_notifications: true,
    family_tracking_consent: false,

    // Verification
    otp: "",
    termsAccepted: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [documentPreviews, setDocumentPreviews] = useState({});

  const { register } = useAuth();

  const steps = [
    { id: 1, title: "Personal Info", icon: FaUser },
    { id: 2, title: "KYC & Emergency", icon: FaIdCard },
    { id: 3, title: "Verification", icon: FaShieldAlt },
  ];

  const indianStates = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Puducherry",
    "Chandigarh",
    "Andaman and Nicobar Islands",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Lakshadweep",
  ];

  const languages = [
    "Hindi",
    "English",
    "Bengali",
    "Telugu",
    "Marathi",
    "Tamil",
    "Gujarati",
    "Urdu",
    "Kannada",
    "Odia",
    "Malayalam",
    "Punjabi",
    "Assamese",
    "Maithili",
  ];

  const idTypes = [
    { value: "aadhaar", label: "Aadhaar Card" },
    { value: "passport", label: "Passport" },
    { value: "driving_license", label: "Driving License" },
    { value: "voter_id", label: "Voter ID Card" },
    { value: "pan", label: "PAN Card" },
  ];

  const relationships = [
    "Parent",
    "Spouse",
    "Sibling",
    "Child",
    "Friend",
    "Colleague",
    "Other",
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({});

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleEmergencyContactChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      ),
    }));
  };

  const addEmergencyContact = () => {
    setFormData((prev) => ({
      ...prev,
      emergency_contacts: [
        ...prev.emergency_contacts,
        { name: "", phone: "", relationship: "", email: "" },
      ],
    }));
  };

  const removeEmergencyContact = (index) => {
    if (formData.emergency_contacts.length > 1) {
      setFormData((prev) => ({
        ...prev,
        emergency_contacts: prev.emergency_contacts.filter(
          (_, i) => i !== index
        ),
      }));
    }
  };

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [fieldName]: file }));

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setDocumentPreviews((prev) => ({
            ...prev,
            [fieldName]: e.target.result,
          }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = "Full name is required";
        if (!formData.email.trim()) newErrors.email = "Email is required";
        if (!/\S+@\S+\.\S+/.test(formData.email))
          newErrors.email = "Email is invalid";
        if (!formData.phone.trim())
          newErrors.phone = "Phone number is required";
        if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone))
          newErrors.phone = "Invalid phone number";
        if (!formData.password) newErrors.password = "Password is required";
        if (formData.password.length < 8)
          newErrors.password = "Password must be at least 8 characters";
        if (formData.password !== formData.confirmPassword)
          newErrors.confirmPassword = "Passwords do not match";
        if (!formData.date_of_birth)
          newErrors.date_of_birth = "Date of birth is required";
        if (!formData.gender) newErrors.gender = "Gender is required";
        break;

      case 2:
        if (!formData.kyc_document_type)
          newErrors.kyc_document_type = "KYC document type is required";
        if (!formData.kyc_id.trim())
          newErrors.kyc_id = "KYC document number is required";

        // Validate first emergency contact
        const firstContact = formData.emergency_contacts[0];
        if (!firstContact.name.trim())
          newErrors.emergency_contact_name =
            "Emergency contact name is required";
        if (!firstContact.phone.trim())
          newErrors.emergency_contact_phone =
            "Emergency contact phone is required";
        if (!firstContact.relationship.trim())
          newErrors.emergency_contact_relationship =
            "Emergency contact relationship is required";
        break;

      case 3:
        if (!otpVerified) newErrors.otp = "Phone number must be verified";
        if (!formData.termsAccepted)
          newErrors.termsAccepted = "You must accept the terms and conditions";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const sendOTP = async () => {
    if (!formData.phone.trim()) {
      setErrors({ otp: "Phone number is required" });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:3000/api/v1/kyc/send-otp",
        {
          phone: formData.phone, // use phone from formData
        }
      );

      if (res.data.success) {
        setOtpSent(true);
        setErrors({});
      } else {
        setErrors({ otp: res.data.message || "Failed to send OTP" });
      }
    } catch (err) {
      setErrors({ otp: err.response?.data?.message || "Failed to send OTP" });
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!formData.otp.trim()) {
      setErrors({ otp: "OTP is required" });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:3000/api/v1/kyc/verify-otp",
        {
          phone: formData.phone, // use phone from formData
          otp: formData.otp, // user entered OTP
        }
      );

      if (res.data.success) {
        setOtpVerified(true);
        setErrors({});
      } else {
        setErrors({ otp: res.data.message || "Invalid OTP" });
      }
    } catch (err) {
      setErrors({
        otp: err.response?.data?.message || "OTP verification failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep(3)) {
      return;
    }

    setLoading(true);
    try {
      // Prepare registration data to match backend API structure
      const registrationData = {
        // Basic required fields
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,

        // KYC fields
        kyc_id: formData.kyc_id,
        kyc_document_type: formData.kyc_document_type,

        // Optional fields
        nationality: formData.nationality || "Indian",
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,

        // Emergency contacts array
        emergency_contacts: formData.emergency_contacts.filter(
          (contact) => contact.name.trim() && contact.phone.trim()
        ),

        // Preferences object
        preferences: {
          language: formData.language,
          tracking_consent: formData.tracking_consent,
          emergency_notifications: formData.emergency_notifications,
          family_tracking_consent: formData.family_tracking_consent,
        },
      };

      const result = await register(registrationData);

      if (result.success) {
        alert(
          "Registration successful! You can now login with your credentials."
        );
        onBackToLogin();
      } else {
        setErrors((prev) => ({ ...prev, submit: result.message }));
      }
    } catch (error) {
      console.error("Registration error:", error);
      setErrors((prev) => ({
        ...prev,
        submit: "Registration failed. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <h3>Personal Information</h3>

            <div className="form-group">
              <label>Full Name *</label>
              <div className="input-group">
                <FaUser className="input-icon" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className={errors.name ? "error" : ""}
                />
              </div>
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <div className="input-group">
                <FaEnvelope className="input-icon" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  className={errors.email ? "error" : ""}
                />
              </div>
              {errors.email && (
                <span className="error-text">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <div className="input-group">
                <FaPhone className="input-icon" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 9876543210"
                  className={errors.phone ? "error" : ""}
                />
              </div>
              {errors.phone && (
                <span className="error-text">{errors.phone}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Password *</label>
                <div className="input-group">
                  <FaLock className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a strong password"
                    className={errors.password ? "error" : ""}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password && (
                  <span className="error-text">{errors.password}</span>
                )}
              </div>

              <div className="form-group">
                <label>Confirm Password *</label>
                <div className="input-group">
                  <FaLock className="input-icon" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    className={errors.confirmPassword ? "error" : ""}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="error-text">{errors.confirmPassword}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  className={errors.date_of_birth ? "error" : ""}
                />
                {errors.date_of_birth && (
                  <span className="error-text">{errors.date_of_birth}</span>
                )}
              </div>

              <div className="form-group">
                <label>Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={errors.gender ? "error" : ""}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
                {errors.gender && (
                  <span className="error-text">{errors.gender}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Nationality</label>
              <select
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
              >
                <option value="Indian">Indian</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <h3>KYC & Emergency Contact Information</h3>

            <div className="form-row">
              <div className="form-group">
                <label>KYC Document Type *</label>
                <select
                  name="kyc_document_type"
                  value={formData.kyc_document_type}
                  onChange={handleInputChange}
                  className={errors.kyc_document_type ? "error" : ""}
                >
                  <option value="">Select Document Type</option>
                  {idTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.kyc_document_type && (
                  <span className="error-text">{errors.kyc_document_type}</span>
                )}
              </div>

              <div className="form-group">
                <label>Document Number *</label>
                <input
                  type="text"
                  name="kyc_id"
                  value={formData.kyc_id}
                  onChange={handleInputChange}
                  placeholder="Enter document number"
                  className={errors.kyc_id ? "error" : ""}
                />
                {errors.kyc_id && (
                  <span className="error-text">{errors.kyc_id}</span>
                )}
              </div>
            </div>

            <h4>Emergency Contacts</h4>

            {formData.emergency_contacts.map((contact, index) => (
              <div key={index} className="emergency-contact-section">
                <div className="emergency-contact-header">
                  <h5>Emergency Contact {index + 1}</h5>
                  {formData.emergency_contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmergencyContact(index)}
                      className="btn-remove"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) =>
                        handleEmergencyContactChange(
                          index,
                          "name",
                          e.target.value
                        )
                      }
                      placeholder="Emergency contact name"
                      className={
                        index === 0 && errors.emergency_contact_name
                          ? "error"
                          : ""
                      }
                    />
                    {index === 0 && errors.emergency_contact_name && (
                      <span className="error-text">
                        {errors.emergency_contact_name}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Relationship *</label>
                    <select
                      value={contact.relationship}
                      onChange={(e) =>
                        handleEmergencyContactChange(
                          index,
                          "relationship",
                          e.target.value
                        )
                      }
                      className={
                        index === 0 && errors.emergency_contact_relationship
                          ? "error"
                          : ""
                      }
                    >
                      <option value="">Select Relationship</option>
                      {relationships.map((rel) => (
                        <option key={rel} value={rel.toLowerCase()}>
                          {rel}
                        </option>
                      ))}
                    </select>
                    {index === 0 && errors.emergency_contact_relationship && (
                      <span className="error-text">
                        {errors.emergency_contact_relationship}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Phone *</label>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) =>
                        handleEmergencyContactChange(
                          index,
                          "phone",
                          e.target.value
                        )
                      }
                      placeholder="+91 9876543210"
                      className={
                        index === 0 && errors.emergency_contact_phone
                          ? "error"
                          : ""
                      }
                    />
                    {index === 0 && errors.emergency_contact_phone && (
                      <span className="error-text">
                        {errors.emergency_contact_phone}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Email (Optional)</label>
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(e) =>
                        handleEmergencyContactChange(
                          index,
                          "email",
                          e.target.value
                        )
                      }
                      placeholder="emergency@email.com"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addEmergencyContact}
              className="btn-add-contact"
            >
              <FaPlus /> Add Another Emergency Contact
            </button>
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <h3>Phone Verification & Final Steps</h3>

            <div className="verification-section">
              <div className="form-group">
                <label>Verify Phone Number: {formData.phone}</label>
                <div className="otp-section">
                  {!otpSent ? (
                    <button
                      type="button"
                      onClick={sendOTP}
                      disabled={loading}
                      className="otp-btn"
                    >
                      {loading ? "Sending..." : "Send OTP"}
                    </button>
                  ) : (
                    <div className="otp-verify">
                      <input
                        type="text"
                        name="otp"
                        value={formData.otp}
                        onChange={handleInputChange}
                        placeholder="Enter 6-digit OTP"
                        maxLength="6"
                        className={errors.otp ? "error" : ""}
                      />
                      <button
                        type="button"
                        onClick={verifyOTP}
                        disabled={loading || otpVerified}
                        className={`otp-btn ${otpVerified ? "verified" : ""}`}
                      >
                        {otpVerified ? (
                          <>
                            <FaCheck /> Verified
                          </>
                        ) : loading ? (
                          "Verifying..."
                        ) : (
                          "Verify OTP"
                        )}
                      </button>
                    </div>
                  )}
                </div>
                {errors.otp && <span className="error-text">{errors.otp}</span>}
              </div>
            </div>

            <div className="registration-summary">
              <h4>Registration Summary</h4>
              <div className="summary-item">
                <strong>Name:</strong> {formData.name}
              </div>
              <div className="summary-item">
                <strong>Email:</strong> {formData.email}
              </div>
              <div className="summary-item">
                <strong>Phone:</strong> {formData.phone}{" "}
                {otpVerified && <FaCheck className="verified-icon" />}
              </div>
              <div className="summary-item">
                <strong>KYC Document:</strong> {formData.kyc_document_type}
              </div>
              <div className="summary-item">
                <strong>Emergency Contact:</strong>{" "}
                {formData.emergency_contacts[0]?.name} (
                {formData.emergency_contacts[0]?.relationship})
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label terms-label">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleInputChange}
                  className={errors.termsAccepted ? "error" : ""}
                />
                I agree to the{" "}
                <a href="#" target="_blank">
                  Terms and Conditions
                </a>{" "}
                and{" "}
                <a href="#" target="_blank">
                  Privacy Policy
                </a>
              </label>
              {errors.termsAccepted && (
                <span className="error-text">{errors.termsAccepted}</span>
              )}
            </div>

            {errors.submit && (
              <div className="error-text submit-error">{errors.submit}</div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="tourist-registration">
      <div className="registration-container">
        <div className="registration-header">
          <h2>Tourist Registration</h2>
          <p>Join Trayana for a secure travel experience</p>
        </div>

        <div className="progress-bar">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`progress-step ${
                currentStep >= step.id ? "active" : ""
              } ${currentStep > step.id ? "completed" : ""}`}
            >
              <div className="step-icon">
                {currentStep > step.id ? <FaCheck /> : <step.icon />}
              </div>
              <span className="step-title">{step.title}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="registration-form">
          {renderStepContent()}

          <div className="form-actions">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="btn-secondary"
              >
                Previous
              </button>
            )}

            <div className="right-actions">
              <button
                type="button"
                onClick={onBackToLogin}
                className="btn-link"
              >
                Back to Login
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="btn-primary"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? "Registering..." : "Complete Registration"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TouristRegistration;
