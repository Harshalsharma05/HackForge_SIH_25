import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// In-memory OTP store (for dev/testing)
const otpStore = {}; 

export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
};

export const sendOtp = async (phone, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your verification OTP is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    return message.sid;
  } catch (error) {
    console.error("Twilio SMS Error:", error.message);
    throw new Error("Failed to send OTP via Twilio");
  }
};

export const saveOtp = (userId, otp) => {
  otpStore[userId] = {
    otp,
    expiresAt: Date.now() + process.env.OTP_EXPIRY_MINUTES * 60 * 1000
  };
};

export const verifyOtp = (userId, otpInput) => {
  const record = otpStore[userId];
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    delete otpStore[userId];
    return false;
  }
  if (record.otp === Number(otpInput)) {
    delete otpStore[userId];
    return true;
  }
  return false;
};
