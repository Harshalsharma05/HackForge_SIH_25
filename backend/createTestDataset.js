import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Trip from "../src/models/trip.js";
import Tourist from "../src/models/tourist.js";
import Location from "../src/models/location.js";
import crypto from "crypto";

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://hackforge:hackforge@hackforge.9xjqy.mongodb.net/TouristID');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Generate test tourists in different locations for good heatmap visualization
const createTestDataset = async () => {
  try {
    console.log('🚀 Creating test dataset for heatmap and clustering...');

    // Delhi area coordinates for realistic clustering
    const delhiLocations = [
      { lat: 28.7041, lng: 77.1025, area: "Red Fort" },
      { lat: 28.6129, lng: 77.2295, area: "India Gate" },
      { lat: 28.5562, lng: 77.1000, area: "Qutub Minar" },
      { lat: 28.6562, lng: 77.2410, area: "Lotus Temple" },
      { lat: 28.6139, lng: 77.2090, area: "Connaught Place" },
      { lat: 28.6517, lng: 77.2219, area: "Jantar Mantar" },
      { lat: 28.6507, lng: 77.2334, area: "Central Park" },
      { lat: 28.5355, lng: 77.2503, area: "Nehru Place" },
      { lat: 28.4595, lng: 77.0266, area: "Gurgaon Sector 29" },
      { lat: 28.4089, lng: 77.3178, area: "Noida Sector 18" },
    ];

    const mumbaiLocations = [
      { lat: 19.0760, lng: 72.8777, area: "Mumbai Central" },
      { lat: 18.9220, lng: 72.8347, area: "Bandra" },
      { lat: 19.0596, lng: 72.8295, area: "Andheri" },
    ];

    // Create test tourists
    const testTourists = [];
    
    for (let i = 0; i < 15; i++) {
      const location = i < 10 ? delhiLocations[i] : mumbaiLocations[i - 10];
      
      const tourist = await Tourist.create({
        name: `Test Tourist ${i + 1}`,
        email: `testtourist${i + 1}@example.com`,
        password: await bcrypt.hash('password123', 10),
        phone: `+91${9000000000 + i}`,
        nationality: 'Indian',
        date_of_birth: new Date('1995-01-01'),
        is_verified: true,
        emergency_contacts: [
          {
            name: `Emergency Contact ${i + 1}`,
            relationship: 'Family',
            phone: `+91${8000000000 + i}`,
          }
        ],
      });

      // Create active trip for each tourist
      const trip = await Trip.create({
        tourist_id: tourist._id,
        trip_name: `${location.area} Tour`,
        destination: location.area,
        start_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Started yesterday
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Ends in 7 days
        purpose: 'tourism',
        digital_id: crypto.randomUUID(),
        status: 'active',
        tracking_enabled: true,
        activated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });

      // Create recent location for each tourist with some clustering
      const baseLocation = location;
      
      // Add some random offset for clustering effect (within ~500m radius)
      const latOffset = (Math.random() - 0.5) * 0.008; // ~500m in degrees
      const lngOffset = (Math.random() - 0.5) * 0.008;

      await Location.create({
        tourist_id: tourist._id,
        trip_id: trip._id,
        latitude: baseLocation.lat + latOffset,
        longitude: baseLocation.lng + lngOffset,
        accuracy: Math.random() * 10 + 5, // 5-15m accuracy
        battery_level: Math.floor(Math.random() * 100) + 1,
        connection_quality: ['excellent', 'good', 'fair'][Math.floor(Math.random() * 3)],
        timestamp: new Date(Date.now() - Math.random() * 60000), // Within last minute
      });

      testTourists.push({ tourist, trip, location: baseLocation });
      console.log(`✅ Created test tourist ${i + 1}: ${tourist.name} at ${location.area}`);
    }

    console.log('🎉 Test dataset created successfully!');
    console.log(`📊 Created ${testTourists.length} tourists with active trips and locations`);
    console.log('🗺️ Locations distributed across Delhi and Mumbai for good heatmap visualization');
    console.log('🔄 You can now test the authority dashboard for heatmaps and clustering');
    
    return testTourists;
  } catch (error) {
    console.error('❌ Error creating test dataset:', error);
    throw error;
  }
};

// Cleanup function to remove test data
const cleanupTestData = async () => {
  try {
    console.log('🧹 Cleaning up test data...');
    
    // Find and remove test tourists and related data
    const testTourists = await Tourist.find({ 
      email: { $regex: /^testtourist\d+@example\.com$/ } 
    });
    
    const testTouristIds = testTourists.map(t => t._id);
    
    // Remove locations
    await Location.deleteMany({ tourist_id: { $in: testTouristIds } });
    console.log('✅ Removed test locations');
    
    // Remove trips
    await Trip.deleteMany({ tourist_id: { $in: testTouristIds } });
    console.log('✅ Removed test trips');
    
    // Remove tourists
    await Tourist.deleteMany({ _id: { $in: testTouristIds } });
    console.log('✅ Removed test tourists');
    
    console.log('🎉 Test data cleanup completed!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  await connectDB();
  
  const command = process.argv[2];
  
  if (command === 'create') {
    await createTestData();
  } else if (command === 'cleanup') {
    await cleanupTestData();
  } else {
    console.log('Usage: node createTestDataset.js [create|cleanup]');
    console.log('  create  - Creates test tourists with trips and locations');
    console.log('  cleanup - Removes all test data');
  }
  
  mongoose.disconnect();
};

main().catch(console.error);