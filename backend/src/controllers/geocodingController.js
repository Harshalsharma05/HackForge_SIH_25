import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// REVERSE GEOCODING
const reverseGeocode = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    throw new ApiError(400, "Latitude and longitude are required");
  }

  try {
    // Using fetch for Node.js (available from Node 18+)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`,
      {
        headers: {
          'User-Agent': 'Tourist Safety Platform/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding service returned ${response.status}`);
    }

    const data = await response.json();

    if (data && data.address) {
      const locationData = {
        area:
          data.address.suburb ||
          data.address.neighbourhood ||
          data.address.locality ||
          data.address.village ||
          data.address.town ||
          data.address.city_district ||
          "Unknown Area",
        city:
          data.address.city ||
          data.address.town ||
          data.address.municipality ||
          data.address.county ||
          "Unknown City",
        state:
          data.address.state ||
          data.address.region ||
          data.address.province ||
          "Unknown State",
        country: data.address.country || "Unknown Country",
        display_name: data.display_name || `${lat}, ${lng}`,
      };

      return res.status(200).json(
        new ApiResponse(200, locationData, "Location info fetched successfully")
      );
    } else {
      // Fallback to coordinates if no address data
      const fallbackData = {
        area: "Unknown Area",
        city: "Unknown City", 
        state: "Unknown State",
        country: "Unknown Country",
        display_name: `${lat}, ${lng}`,
      };

      return res.status(200).json(
        new ApiResponse(200, fallbackData, "Location coordinates returned")
      );
    }
  } catch (error) {
    console.error("Geocoding error:", error);
    
    // Return fallback location data instead of throwing error
    const fallbackData = {
      area: "Unknown Area",
      city: "Unknown City",
      state: "Unknown State", 
      country: "Unknown Country",
      display_name: `${lat}, ${lng}`,
    };

    return res.status(200).json(
      new ApiResponse(200, fallbackData, "Fallback location data returned")
    );
  }
});

export { reverseGeocode };