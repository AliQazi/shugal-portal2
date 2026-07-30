import dotenv from "dotenv";
import mongoose from "mongoose";
import dbConnection from "../config/db.js";
import Booking from "../models/Booking.js";

dotenv.config(); // loads MONGO_URI

const runMigration = async () => {
    try {
        await dbConnection(); // uses your existing connection logic

        const result = await Booking.updateMany(
            { expiresAt: { $exists: false } },
            { $set: { expiresAt: null } }
        );

        console.log(`✅ Migration complete. Updated ${result.modifiedCount} users.`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
};

runMigration();
