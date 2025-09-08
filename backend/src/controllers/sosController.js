import twilio from "twilio";
import Alert from "../models/alerts.js";
import Tourist from "../models/tourist.js";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Helper: format phone numbers to E.164
const formatPhoneNumber = (number) => {
  if (!number) return null;
  let cleaned = number.replace(/\D/g, ""); // remove non-digit chars
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1); // remove leading 0
  if (!cleaned.startsWith("91")) cleaned = "91" + cleaned; // add India country code
  return "+" + cleaned;
};

export const sosAlert = async (req, res) => {
  try {
    const { touristId, latitude, longitude, address } = req.body;

    if (!touristId) {
      return res
        .status(400)
        .json({ success: false, message: "touristId is required" });
    }

    // Fetch tourist details
    const tourist = await Tourist.findById(touristId);
    if (!tourist) {
      return res
        .status(404)
        .json({ success: false, message: "Tourist not found" });
    }

    // Safe fallback if current_location is missing
    const loc = tourist.current_location || {};
    const finalLatitude = latitude || loc.latitude || 0;
    const finalLongitude = longitude || loc.longitude || 0;
    const finalAddress = address || loc.address || "Unknown Location";

    // Create SOS alert in DB
    const alert = await Alert.create({
      tourist_id: tourist._id,
      type: "panic",
      title: "SOS Alert",
      description: "Emergency SOS triggered by tourist",
      severity: "critical",
      latitude: finalLatitude,
      longitude: finalLongitude,
      address: finalAddress,
      status: "active",
      metadata: {
        device_id: tourist.digital_id,
        automatic_trigger: false,
      },
    });

    // Format phone numbers
    const touristPhone = formatPhoneNumber(tourist.phone);
    const adminPhone = formatPhoneNumber(process.env.MY_PHONE_NUMBER);

    if (!touristPhone || !adminPhone) {
      return res.status(400).json({
        success: false,
        message: "Invalid tourist or admin phone number",
      });
    }

    // Twilio call: connect tourist first, then admin
    const twiml = `
      <Response>
        <Say voice="alice">
          SOS Alert! We are connecting you to emergency services. Please stay on the line.
        </Say>
        <Dial>
          <Number>${adminPhone}</Number>
        </Dial>
      </Response>
    `;

    await client.calls.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: touristPhone,
      twiml: twiml,
    });

    // Send SMS to admin with tourist location
    await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: adminPhone,
      body: `🚨 SOS Alert 🚨
Tourist: ${tourist.name}
Phone: ${tourist.phone}
Location: https://www.google.com/maps?q=${finalLatitude},${finalLongitude}`,
    });

    res.status(200).json({
      success: true,
      message: "SOS Alert triggered: Tourist called, admin connected, SMS sent",
      alert,
    });

  } catch (error) {
    console.error("SOS Alert Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


//  Function 2: Panic Notify Admin
export const panicNotifyAdmin = async (req, res) => {
  try {
    const { touristId, latitude, longitude, address } = req.body;

    if (!touristId) {
      return res
        .status(400)
        .json({ success: false, message: "touristId is required" });
    }

    // Fetch tourist details
    const tourist = await Tourist.findById(touristId);
    if (!tourist) {
      return res
        .status(404)
        .json({ success: false, message: "Tourist not found" });
    }

    // Use live location if provided, else fallback to DB
    const finalLatitude = latitude || tourist.current_location.latitude;
    const finalLongitude = longitude || tourist.current_location.longitude;
    const finalAddress = address || tourist.current_location.address;

    // Send SMS to admin
    await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.MY_PHONE_NUMBER,
      body: `🚨 PANIC ALERT 🚨
Tourist: ${tourist.name}
Phone: ${tourist.phone}
Location: https://www.google.com/maps?q=${finalLatitude},${finalLongitude}`,
    });

    res.status(200).json({
      success: true,
      message: "Panic notification sent to admin",
    });

  } catch (error) {
    console.error("Panic Notify Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
