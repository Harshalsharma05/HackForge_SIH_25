import { generateOtp, saveOtp, verifyOtp as verifyOtpFn } from "../utils/otpUtils.js";
import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number required" });
    }

    const otp = generateOtp();

    // Send OTP via Twilio SMS
    await client.messages.create({
      body: `Your verification code is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER, // Twilio number
      to: phone,
    });

    // Save OTP (in-memory / Redis / DB)
    saveOtp(phone, otp);

    res.status(200).json({ success: true, message: "OTP sent via Twilio" });
  } catch (err) {
    console.error("Twilio Send OTP Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: "Phone and OTP required" });
    }

    const isValid = verifyOtpFn(phone, otp);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    res.status(200).json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    console.error("Verify OTP Error:", err.message);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};
