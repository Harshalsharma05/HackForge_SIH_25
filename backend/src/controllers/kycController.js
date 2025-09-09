import { generateOtp, sendOtp as sendTwilioOtp, saveOtp, verifyOtp as verifyOtpFn } from "../utils/otpUtils.js";
import Tourist from "../models/tourist.js";

export const sendOtp = async (req, res) => {
  const { touristId } = req.body;

  if (!touristId) return res.status(400).json({ success: false, message: "touristId required" });

  const tourist = await Tourist.findById(touristId);
  if (!tourist) return res.status(404).json({ success: false, message: "Tourist not found" });

  const otp = generateOtp();
  await sendTwilioOtp(tourist.phone, otp);
  saveOtp(touristId, otp);

  res.status(200).json({ success: true, message: "OTP sent via Twilio" });
};

export const verifyOtp = async (req, res) => {
  const { touristId, otp } = req.body;
  if (!touristId || !otp) return res.status(400).json({ success: false, message: "touristId and otp required" });

  const isValid = verifyOtpFn(touristId, otp);
  if (!isValid) return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

  // Optional: mark KYC as verified
  await Tourist.findByIdAndUpdate(touristId, { kyc_verified: true });

  res.status(200).json({ success: true, message: "OTP verified successfully" });
};
