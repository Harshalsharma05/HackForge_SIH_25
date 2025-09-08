import mongoose from "mongoose";
import GeoFence from "../models/geofence.js";
import connectDB from "../db/connectDB.js";

// Northeast India Geo-fence Mock Data
const northeastGeofences = [
  // MEGHALAYA - Safe Zones
  {
    name: "Shillong City Center - Tourist Hub",
    description:
      "Main commercial and tourist area with police presence and good infrastructure",
    latitude: 25.5788,
    longitude: 91.8933,
    radius_km: 2.5,
    zone_type: "safe_zone",
    risk_level: "very_low",
    entry_allowed: true,
    auto_alert_tourist: false,
    emergency_contact: {
      name: "Shillong Police Station",
      phone: "+91-364-2222222",
      email: "shillong.police@meghalaya.gov.in",
    },
  },
  {
    name: "Police Bazaar - Shopping District",
    description: "Busy commercial area with restaurants, hotels, and shops",
    latitude: 25.5741,
    longitude: 91.8932,
    radius_km: 1.2,
    zone_type: "safe_zone",
    risk_level: "very_low",
    entry_allowed: true,
    auto_alert_tourist: false,
  },
  {
    name: "Cherrapunji Tourist Area",
    description: "Popular tourist destination with waterfalls and viewpoints",
    latitude: 25.3,
    longitude: 91.7,
    radius_km: 3.0,
    zone_type: "safe_zone",
    risk_level: "low",
    entry_allowed: true,
    time_restrictions: {
      allowed_hours: "06:00-18:00",
      timezone: "Asia/Kolkata",
    },
  },
  {
    name: "Dawki River - Tourist Spot",
    description: "Crystal clear river popular for boating and photography",
    latitude: 25.1167,
    longitude: 91.7667,
    radius_km: 1.5,
    zone_type: "safe_zone",
    risk_level: "low",
    entry_allowed: true,
    time_restrictions: {
      allowed_hours: "08:00-17:00",
      timezone: "Asia/Kolkata",
    },
  },

  // MEGHALAYA - Caution Zones (using tourist_attraction for moderate risk areas)
  {
    name: "Mawsmai Cave Area",
    description: "Cave system requiring guided tours, moderate risk",
    latitude: 25.2959,
    longitude: 91.7311,
    radius_km: 0.8,
    zone_type: "tourist_attraction",
    risk_level: "medium",
    entry_allowed: true,
    time_restrictions: {
      allowed_hours: "09:00-16:00",
      timezone: "Asia/Kolkata",
    },
    emergency_contact: {
      name: "Tourism Department Cherrapunji",
      phone: "+91-364-2501234",
    },
  },

  // MEGHALAYA - Danger Zones
  {
    name: "Dense Forest Area - East Khasi Hills",
    description: "Remote forest area with limited accessibility and wildlife",
    latitude: 25.62,
    longitude: 91.95,
    radius_km: 4.0,
    zone_type: "danger_zone",
    risk_level: "high",
    entry_allowed: false,
    alert_authorities: true,
    auto_alert_tourist: true,
    emergency_contact: {
      name: "Forest Department Emergency",
      phone: "+91-364-2500000",
    },
  },
  {
    name: "Unmarked Border Area - Bangladesh",
    description: "International border area with restricted access",
    latitude: 25.1,
    longitude: 91.85,
    radius_km: 2.0,
    zone_type: "restricted_zone",
    risk_level: "critical",
    entry_allowed: false,
    alert_authorities: true,
    auto_alert_tourist: true,
    emergency_contact: {
      name: "BSF Border Control",
      phone: "+91-364-2600000",
    },
  },

  // ASSAM - Safe Zones
  {
    name: "Guwahati City Center",
    description: "Main urban center of Assam with good infrastructure",
    latitude: 26.1445,
    longitude: 91.7362,
    radius_km: 3.0,
    zone_type: "safe_zone",
    risk_level: "very_low",
    entry_allowed: true,
    auto_alert_tourist: false,
    emergency_contact: {
      name: "Guwahati Police",
      phone: "+91-361-2132320",
    },
  },
  {
    name: "Kamakhya Temple Complex",
    description: "Famous temple complex with tourist facilities",
    latitude: 26.1665,
    longitude: 91.7037,
    radius_km: 1.0,
    zone_type: "safe_zone",
    risk_level: "low",
    entry_allowed: true,
    time_restrictions: {
      allowed_hours: "05:00-22:00",
      timezone: "Asia/Kolkata",
    },
  },

  // ASSAM - Tourist Attractions (moderate risk areas)
  {
    name: "Kaziranga National Park Buffer Zone",
    description: "Wildlife area requiring permits and guides",
    latitude: 26.5775,
    longitude: 93.1713,
    radius_km: 5.0,
    zone_type: "tourist_attraction",
    risk_level: "medium",
    entry_allowed: true,
    time_restrictions: {
      allowed_hours: "06:00-17:00",
      timezone: "Asia/Kolkata",
    },
    emergency_contact: {
      name: "Kaziranga Park Authority",
      phone: "+91-3776-268095",
    },
  },

  // ASSAM - Danger Zones
  {
    name: "Remote Brahmaputra Flood Plains",
    description: "Flood-prone area with seasonal risks",
    latitude: 26.7,
    longitude: 92.5,
    radius_km: 6.0,
    zone_type: "danger_zone",
    risk_level: "high",
    entry_allowed: false,
    alert_authorities: true,
    auto_alert_tourist: true,
  },

  // ARUNACHAL PRADESH - Safe Zones
  {
    name: "Itanagar Capital Complex",
    description: "State capital with administrative facilities",
    latitude: 27.0844,
    longitude: 93.6053,
    radius_km: 2.0,
    zone_type: "safe_zone",
    risk_level: "low",
    entry_allowed: true,
    emergency_contact: {
      name: "Itanagar Police",
      phone: "+91-360-2212233",
    },
  },
  {
    name: "Tawang Monastery Area",
    description: "Buddhist monastery and tourist destination",
    latitude: 27.5816,
    longitude: 91.8733,
    radius_km: 1.5,
    zone_type: "safe_zone",
    risk_level: "medium",
    entry_allowed: true,
    time_restrictions: {
      allowed_hours: "06:00-18:00",
      timezone: "Asia/Kolkata",
    },
  },

  // ARUNACHAL PRADESH - Restricted Zones
  {
    name: "China Border - Tawang Sector",
    description: "International border area requiring special permits",
    latitude: 27.7,
    longitude: 91.9,
    radius_km: 3.0,
    zone_type: "restricted_zone",
    risk_level: "critical",
    entry_allowed: false,
    alert_authorities: true,
    auto_alert_tourist: true,
    emergency_contact: {
      name: "Army Border Control",
      phone: "+91-360-2400000",
    },
  },

  // NAGALAND - Safe Zones
  {
    name: "Kohima War Cemetery Area",
    description: "Historical site with tourist facilities",
    latitude: 25.6751,
    longitude: 94.1086,
    radius_km: 1.0,
    zone_type: "safe_zone",
    risk_level: "low",
    entry_allowed: true,
    time_restrictions: {
      allowed_hours: "09:00-17:00",
      timezone: "Asia/Kolkata",
    },
  },

  // NAGALAND - Tourist Attractions
  {
    name: "Remote Naga Villages",
    description: "Traditional villages requiring cultural sensitivity",
    latitude: 25.8,
    longitude: 94.5,
    radius_km: 2.5,
    zone_type: "tourist_attraction",
    risk_level: "medium",
    entry_allowed: true,
    emergency_contact: {
      name: "Nagaland Tourism",
      phone: "+91-370-2244173",
    },
  },

  // MANIPUR - Safe Zones
  {
    name: "Imphal City Center",
    description: "State capital with urban amenities",
    latitude: 24.817,
    longitude: 93.9368,
    radius_km: 2.0,
    zone_type: "safe_zone",
    risk_level: "low",
    entry_allowed: true,
    emergency_contact: {
      name: "Imphal Police",
      phone: "+91-385-2414066",
    },
  },
  {
    name: "Loktak Lake Tourist Area",
    description: "Largest freshwater lake in Northeast India",
    latitude: 24.55,
    longitude: 93.7833,
    radius_km: 2.0,
    zone_type: "safe_zone",
    risk_level: "low",
    entry_allowed: true,
    time_restrictions: {
      allowed_hours: "07:00-18:00",
      timezone: "Asia/Kolkata",
    },
  },

  // MANIPUR - Danger Zones
  {
    name: "Myanmar Border Hills",
    description: "International border area with security concerns",
    latitude: 24.3,
    longitude: 94.2,
    radius_km: 4.0,
    zone_type: "danger_zone",
    risk_level: "critical",
    entry_allowed: false,
    alert_authorities: true,
    auto_alert_tourist: true,
    emergency_contact: {
      name: "Assam Rifles Border Control",
      phone: "+91-385-2500000",
    },
  },

  // MIZORAM - Safe Zones
  {
    name: "Aizawl City Center",
    description: "State capital built on ridges",
    latitude: 23.7271,
    longitude: 92.7176,
    radius_km: 2.5,
    zone_type: "safe_zone",
    risk_level: "low",
    entry_allowed: true,
    emergency_contact: {
      name: "Aizawl Police",
      phone: "+91-389-2322270",
    },
  },

  // MIZORAM - Restricted Zones
  {
    name: "Myanmar-Bangladesh Border Triangle",
    description: "Tri-border area with restricted access",
    latitude: 23.0,
    longitude: 92.9,
    radius_km: 3.0,
    zone_type: "restricted_zone",
    risk_level: "critical",
    entry_allowed: false,
    alert_authorities: true,
    auto_alert_tourist: true,
  },

  // TRIPURA - Safe Zones
  {
    name: "Agartala City Center",
    description: "State capital near Bangladesh border",
    latitude: 23.8315,
    longitude: 91.2868,
    radius_km: 2.0,
    zone_type: "safe_zone",
    risk_level: "low",
    entry_allowed: true,
    emergency_contact: {
      name: "Agartala Police",
      phone: "+91-381-2325016",
    },
  },
  {
    name: "Ujjayanta Palace Complex",
    description: "Former royal palace, now museum",
    latitude: 23.8359,
    longitude: 91.2791,
    radius_km: 0.5,
    zone_type: "safe_zone",
    risk_level: "very_low",
    entry_allowed: true,
    time_restrictions: {
      allowed_hours: "10:00-17:00",
      timezone: "Asia/Kolkata",
    },
  },

  // SIKKIM - Safe Zones
  {
    name: "Gangtok MG Road Tourist Area",
    description: "Main tourist street with shops and restaurants",
    latitude: 27.3314,
    longitude: 88.6138,
    radius_km: 1.0,
    zone_type: "safe_zone",
    risk_level: "very_low",
    entry_allowed: true,
    emergency_contact: {
      name: "Gangtok Police",
      phone: "+91-3592-202033",
    },
  },

  // SIKKIM - Tourist Attractions
  {
    name: "Nathula Pass Area",
    description: "High altitude border pass requiring permits",
    latitude: 27.3906,
    longitude: 88.84,
    radius_km: 1.0,
    zone_type: "tourist_attraction",
    risk_level: "high",
    entry_allowed: true,
    time_restrictions: {
      allowed_hours: "09:00-15:00",
      timezone: "Asia/Kolkata",
    },
    emergency_contact: {
      name: "Army Border Post",
      phone: "+91-3592-250000",
    },
  },

  // SIKKIM - Restricted Zones
  {
    name: "China Border - Dokala Area",
    description: "Sensitive border area with military restrictions",
    latitude: 27.45,
    longitude: 88.9,
    radius_km: 2.0,
    zone_type: "restricted_zone",
    risk_level: "critical",
    entry_allowed: false,
    alert_authorities: true,
    auto_alert_tourist: true,
  },
];

// Function to populate geo-fences
const populateGeoFences = async () => {
  try {
    console.log("🔗 Connecting to database...");
    await connectDB();

    console.log("🗑️ Clearing existing geo-fences...");
    await GeoFence.deleteMany({});

    console.log("📍 Processing and inserting Northeast India geo-fences...");

    // Convert emergency_contact objects to strings
    const processedGeofences = northeastGeofences.map((fence) => {
      if (
        fence.emergency_contact &&
        typeof fence.emergency_contact === "object"
      ) {
        fence.emergency_contact = `${fence.emergency_contact.name}: ${
          fence.emergency_contact.phone
        }${
          fence.emergency_contact.email
            ? `, ${fence.emergency_contact.email}`
            : ""
        }`;
      }
      return fence;
    });

    const inserted = await GeoFence.insertMany(processedGeofences);

    console.log(`✅ Successfully inserted ${inserted.length} geo-fences!`);

    // Display summary
    const summary = inserted.reduce((acc, fence) => {
      acc[fence.zone_type] = (acc[fence.zone_type] || 0) + 1;
      return acc;
    }, {});

    console.log("\n📊 Geo-fence Summary:");
    Object.entries(summary).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} zones`);
    });

    console.log("\n🎯 Key locations covered:");
    console.log("   • Meghalaya: Shillong, Cherrapunji, Dawki");
    console.log("   • Assam: Guwahati, Kaziranga");
    console.log("   • Arunachal Pradesh: Itanagar, Tawang");
    console.log("   • Nagaland: Kohima");
    console.log("   • Manipur: Imphal, Loktak Lake");
    console.log("   • Mizoram: Aizawl");
    console.log("   • Tripura: Agartala");
    console.log("   • Sikkim: Gangtok, Nathula Pass");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error populating geo-fences:", error);
    process.exit(1);
  }
};

// Run the population script
populateGeoFences();
