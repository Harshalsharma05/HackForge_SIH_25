import twilio from "twilio";
import Alert from "../models/alerts.js";
import DigitalId from "../models/digitalId.js";
import Tourist from "../models/tourist.js";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Helper: format phone numbers to E.164
const formatPhoneNumber = (number) => {
  if (!number) return null;
  let cleaned = number.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  if (!cleaned.startsWith("91")) cleaned = "91" + cleaned;
  return "+" + cleaned;
};

/**
 * Trigger SOS Alert:
 *  - Saves alert in DB including smart_contract_id
 *  - Calls tourist and sends SMS to admin
 */
export const sosAlert = async (req, res) => {
  try {
    const { smart_contract_id, latitude, longitude, address } = req.body;
    if (!smart_contract_id)
      return res.status(400).json({ success: false, message: "smart_contract_id is required" });

    // Fetch DigitalId
    const digitalId = await DigitalId.findOne({ smart_contract_id });
    if (!digitalId)
      return res.status(404).json({ success: false, message: "DigitalId not found" });

    // Fetch Tourist
    const tourist = await Tourist.findById(digitalId.tourist_id);
    if (!tourist)
      return res.status(404).json({ success: false, message: "Tourist not found" });

    // Determine location
    const finalLatitude = latitude ?? tourist.current_location?.latitude ?? 0;
    const finalLongitude = longitude ?? tourist.current_location?.longitude ?? 0;
    const finalAddress = address ?? tourist.current_location?.address ?? "Unknown Location";

    // Save alert
    let alert;
    try {
      alert = await Alert.create({
        tourist_id: tourist._id,
        smart_contract_id: digitalId.smart_contract_id, // ✅ store smart_contract_id
        type: "panic",
        title: "SOS Alert",
        description: "Emergency SOS triggered by tourist",
        severity: "critical",
        latitude: finalLatitude,
        longitude: finalLongitude,
        address: finalAddress,
        status: "active",
        metadata: { device_id: digitalId.smart_contract_id, automatic_trigger: false },
      });
      console.log("✅ Alert saved:", alert._id);
    } catch (err) {
      console.error("❌ Error saving alert:", err.message);
      return res.status(500).json({ success: false, message: "Failed to save alert", error: err.message });
    }

    // Format phone numbers
    const touristPhone = formatPhoneNumber(tourist.phone);
    const adminPhone = formatPhoneNumber(process.env.MY_PHONE_NUMBER);

    // Send notifications safely
    try {
      if (touristPhone && adminPhone) {
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
        await client.calls.create({ from: process.env.TWILIO_PHONE_NUMBER, to: touristPhone, twiml });
        await client.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: adminPhone,
          body: `🚨 SOS Alert 🚨
Tourist: ${tourist.name}
Phone: ${tourist.phone}
Location: https://www.google.com/maps?q=${finalLatitude},${finalLongitude}`,
        });
        console.log("✅ Notifications sent via Twilio");
      }
    } catch (err) {
      console.error("❌ Twilio notification error:", err.message);
    }

    res.status(200).json({ success: true, message: "SOS Alert triggered successfully", alert });

  } catch (error) {
    console.error("❌ SOS Alert Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Panic Notify Admin:
 *  - Saves alert in DB including smart_contract_id
 *  - Sends SMS notification to admin only
 */
export const panicNotifyAdmin = async (req, res) => {
  try {
    const { smart_contract_id, latitude, longitude, address } = req.body;
    if (!smart_contract_id)
      return res.status(400).json({ success: false, message: "smart_contract_id is required" });

    // Fetch DigitalId
    const digitalId = await DigitalId.findOne({ smart_contract_id });
    if (!digitalId)
      return res.status(404).json({ success: false, message: "DigitalId not found" });

    // Fetch Tourist
    const tourist = await Tourist.findById(digitalId.tourist_id);
    if (!tourist)
      return res.status(404).json({ success: false, message: "Tourist not found" });

    const finalLatitude = latitude ?? tourist.current_location?.latitude ?? 0;
    const finalLongitude = longitude ?? tourist.current_location?.longitude ?? 0;
    const finalAddress = address ?? tourist.current_location?.address ?? "Unknown Location";

    // Save alert
    let alert;
    try {
      alert = await Alert.create({
        tourist_id: tourist._id,
        smart_contract_id: digitalId.smart_contract_id, // ✅ store smart_contract_id
        type: "panic",
        title: "Panic Alert",
        description: "Panic API triggered by tourist",
        severity: "critical",
        latitude: finalLatitude,
        longitude: finalLongitude,
        address: finalAddress,
        status: "active",
        metadata: { device_id: digitalId.smart_contract_id, automatic_trigger: false },
      });
      console.log("✅ Alert saved:", alert._id);
    } catch (err) {
      console.error("❌ Failed to save alert:", err);
      return res.status(500).json({ success: false, message: "Failed to save alert", error: err.message });
    }

    // Send notification to admin
    const adminPhone = formatPhoneNumber(process.env.MY_PHONE_NUMBER);
    if (adminPhone) {
      try {
        await client.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: adminPhone,
          body: `🚨 PANIC ALERT 🚨
Tourist: ${tourist.name}
Phone: ${tourist.phone}
Location: https://www.google.com/maps?q=${finalLatitude},${finalLongitude}`,
        });
        console.log("✅ Panic notification sent to admin");
      } catch (err) {
        console.error("❌ Twilio panic notification error:", err.message);
      }
    }

    res.status(200).json({ success: true, message: "Panic alert saved and admin notified", alert });

  } catch (error) {
    console.error("❌ Panic Notify Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
