import twilio from "twilio";
import Alert from "../models/alerts.js";
import Tourist from "../models/tourist.js";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sosAlert = async (req, res) => {
  try {
    const { touristId } = req.body;

    if (!touristId) {
      return res
        .status(400)
        .json({ success: false, message: "touristId is required" });
    }

    // Fetch tourist details
    const tourist = await Tourist.findById(touristId);
    if (!tourist) {
      return res.status(404).json({ success: false, message: "Tourist not found" });
    }

    // Create SOS alert in DB
    const alert = await Alert.create({
      tourist_id: tourist._id,
      type: "panic",
      title: "SOS Alert",
      description: "Emergency SOS triggered by tourist",
      severity: "critical",
      latitude: tourist.current_location.latitude,
      longitude: tourist.current_location.longitude,
      address: tourist.current_location.address,
      status: "active",
      metadata: {
        device_id: tourist.digital_id,
        automatic_trigger: false,
      },
    });

    // Twilio call: Tourist first, then connect admin
    const twiml = `
      <Response>
        <Say voice="alice">
          SOS Alert! We are connecting you to emergency services. Please stay on the line.
        </Say>
        <Dial>
          <Number>${process.env.MY_PHONE_NUMBER}</Number>
        </Dial>
      </Response>
    `;

    await client.calls.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: tourist.phone,   // Tourist is dialed first
      twiml: twiml,
    });

    // Send SMS to admin with tourist location
    await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.MY_PHONE_NUMBER,
      body: `SOS Alert from Tourist: ${tourist.name}.
Location: https://www.google.com/maps?q=${tourist.current_location.latitude},${tourist.current_location.longitude}`,
    });

    res.status(200).json({
      success: true,
      message: "SOS Alert triggered: Tourist called, admin connected, SMS sent",
      alert,
    });

  } catch (error) {
    console.error("SOS Alert Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
