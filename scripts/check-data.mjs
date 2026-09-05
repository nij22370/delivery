import mongoose from 'mongoose';
import fs from 'fs';

// Read .env.local or .env
let envContent = '';
if (fs.existsSync('.env.local')) {
  envContent = fs.readFileSync('.env.local', 'utf8');
} else if (fs.existsSync('.env')) {
  envContent = fs.readFileSync('.env', 'utf8');
}

const mongoUriMatch = envContent.match(/MONGODB_URI=(.+)/);
const MONGODB_URI = mongoUriMatch ? mongoUriMatch[1].trim().replace(/^["']|["']$/g, '') : '';

async function check() {
  if (!MONGODB_URI) {
    console.error('No MONGODB_URI found!');
    return;
  }
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  const jobs = await mongoose.connection.db.collection('jobs').find({}).toArray();
  console.log(`Found ${jobs.length} jobs in total.`);

  for (const j of jobs) {
    console.log(`\nJob _id: ${j._id}, status: ${j.status}, pickup: ${j.pickupAddress}, dropoff: ${j.dropoffAddress}`);
    console.log(`  posterId: ${j.posterId} (${typeof j.posterId})`);
    console.log(`  driverId: ${j.driverId} (${typeof j.driverId})`);
    console.log(`  pickupContactName: "${j.pickupContactName}", pickupPhone: "${j.pickupPhone}"`);
    console.log(`  dropoffContactName: "${j.dropoffContactName}", dropoffPhone: "${j.dropoffPhone}"`);
    
    // Check if poster exists in users collection
    if (j.posterId) {
      const poster = await mongoose.connection.db.collection('users').findOne({ 
        $or: [
          { _id: j.posterId },
          { _id: new mongoose.Types.ObjectId(j.posterId.toString()) }
        ]
      });
      console.log(`  -> Poster user record:`, poster ? { _id: poster._id, name: poster.name, email: poster.email, role: poster.role } : 'NOT FOUND IN DB');
    }
    
    // Check if driver exists in users collection
    if (j.driverId) {
      const driver = await mongoose.connection.db.collection('users').findOne({
        $or: [
          { _id: j.driverId },
          { _id: new mongoose.Types.ObjectId(j.driverId.toString()) }
        ]
      });
      console.log(`  -> Driver user record:`, driver ? { _id: driver._id, name: driver.name, email: driver.email, role: driver.role } : 'NOT FOUND IN DB');
    }
  }

  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log(`\nTotal Users (${users.length}):`);
  for (const u of users) {
    console.log(`  User: ${u._id} | Name: "${u.name}" | Email: "${u.email}" | Role: "${u.role}" | Phone: "${u.phone}"`);
  }

  const driverProfiles = await mongoose.connection.db.collection('driverprofiles').find({}).toArray();
  console.log(`\nTotal Driver Profiles (${driverProfiles.length}):`);
  for (const dp of driverProfiles) {
    console.log(`  Profile: ${dp._id} | userId: ${dp.userId} | status: ${dp.status} | vehicle: ${dp.vehicleType} | ratingAvg: ${dp.ratingAvg}`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
