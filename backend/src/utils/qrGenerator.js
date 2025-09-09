import QRCode from "qrcode";
import crypto from "crypto";

class QRCodeGenerator {
  /**
   * Generate QR code for blockchain digital ID
   * @param {Object} digitalIdData - Digital ID data
   * @returns {string} Base64 QR code image
   */
  static async generateDigitalIdQR(digitalIdData) {
    try {
      // Create QR code data object
      const qrData = {
        // Public verification data
        digitalId: digitalIdData.smartContractId,
        verificationUrl: digitalIdData.verificationUrl,
        tripName: digitalIdData.tripName,
        touristName: digitalIdData.touristName,
        validUntil: digitalIdData.validUntil,

        // Blockchain verification
        network: digitalIdData.network || "polygon-mumbai",
        contractAddress: process.env.CONTRACT_ADDRESS,

        // Security
        type: "TOURIST_DIGITAL_ID",
        version: "1.0",
        createdAt: new Date().toISOString(),
      };

      // Convert to JSON string
      const qrString = JSON.stringify(qrData);

      // Generate QR code with high error correction
      const qrCodeImage = await QRCode.toDataURL(qrString, {
        errorCorrectionLevel: "H", // High error correction
        type: "image/png",
        quality: 0.92,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        width: 512, // High resolution
      });

      console.log(
        `🎯 QR Code generated for Digital ID: ${digitalIdData.smartContractId}`
      );
      return qrCodeImage; // Returns base64 data URL
    } catch (error) {
      console.error("❌ QR Code generation failed:", error);
      throw new Error(`QR Code generation failed: ${error.message}`);
    }
  }

  /**
   * Generate verification URL for QR code scanning
   * @param {string} smartContractId - Smart contract ID
   * @returns {string} Verification URL
   */
  static generateVerificationUrl(smartContractId) {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return `${baseUrl}/verify/${smartContractId}`;
  }

  /**
   * Generate simple text QR code for emergency use
   * @param {Object} emergencyData - Emergency contact data
   * @returns {string} Base64 QR code image
   */
  static async generateEmergencyQR(emergencyData) {
    try {
      const emergencyInfo = {
        type: "EMERGENCY_CONTACT",
        touristName: emergencyData.touristName,
        digitalId: emergencyData.digitalId,
        emergencyContacts: emergencyData.emergencyContacts,
        medicalInfo:
          emergencyData.medicalInfo || "No specific medical conditions",
        lastKnownLocation: emergencyData.lastKnownLocation,
        generatedAt: new Date().toISOString(),
      };

      const qrString = JSON.stringify(emergencyInfo);

      const qrCodeImage = await QRCode.toDataURL(qrString, {
        errorCorrectionLevel: "M",
        type: "image/png",
        margin: 1,
        color: {
          dark: "#CC0000", // Red for emergency
          light: "#FFFFFF",
        },
        width: 256,
      });

      return qrCodeImage;
    } catch (error) {
      console.error("❌ Emergency QR Code generation failed:", error);
      throw new Error(`Emergency QR Code generation failed: ${error.message}`);
    }
  }

  /**
   * Parse QR code data (for verification apps)
   * @param {string} qrString - QR code string data
   * @returns {Object} Parsed QR data
   */
  static parseQRData(qrString) {
    try {
      const data = JSON.parse(qrString);

      // Validate QR code structure
      if (!data.type || !data.digitalId) {
        throw new Error("Invalid QR code format");
      }

      return {
        isValid: true,
        type: data.type,
        digitalId: data.digitalId,
        data: data,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate QR code for verification link only
   * @param {string} verificationUrl - Verification URL
   * @returns {string} Base64 QR code image
   */
  static async generateSimpleVerificationQR(verificationUrl) {
    try {
      const qrCodeImage = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: "M",
        type: "image/png",
        margin: 1,
        width: 256,
      });

      return qrCodeImage;
    } catch (error) {
      console.error("❌ Simple QR Code generation failed:", error);
      throw new Error(`Simple QR Code generation failed: ${error.message}`);
    }
  }
}

/**
 * Generate multiple QR codes for a trip
 * @param {Object} data - Trip and tourist data
 * @returns {Object} Generated QR codes
 */
export async function generateQRCodes(data) {
  try {
    const qrCodes = {};

    // Generate digital ID QR
    qrCodes.digital_id = await QRCodeGenerator.generateDigitalIdQR({
      smartContractId: data.blockchain_data?.contract_id || data.digital_id,
      verificationUrl:
        data.blockchain_data?.verification_url ||
        `${process.env.FRONTEND_URL}/verify/${data.digital_id}`,
      tripName: data.trip_data.trip_name,
      touristName: data.tourist_data.name,
      validUntil: data.trip_data.end_date.toISOString(),
      txHash: data.blockchain_data?.tx_hash,
      digitalId: data.digital_id,
    });

    // Generate emergency QR
    qrCodes.emergency = await QRCodeGenerator.generateEmergencyQR({
      digitalId: data.digital_id,
      touristName: data.tourist_data.name,
      emergencyPhone: data.tourist_data.phone,
      location: data.trip_data.destination,
    });

    // Generate simple verification QR
    qrCodes.verification = await QRCodeGenerator.generateSimpleVerificationQR(
      data.blockchain_data?.verification_url ||
        `${process.env.FRONTEND_URL}/verify/${data.digital_id}`
    );

    return qrCodes;
  } catch (error) {
    console.error("❌ QR codes generation failed:", error);
    throw new Error(`QR codes generation failed: ${error.message}`);
  }
}

export default QRCodeGenerator;
