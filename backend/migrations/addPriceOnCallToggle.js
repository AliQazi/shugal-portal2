import dotenv from "dotenv";
import mongoose from "mongoose";
import dbConnection from "../config/db.js";
import Register from "../models/Register.js";

dotenv.config(); // loads MONGO_URI

const runMigration = async () => {
    try {
        await dbConnection(); // uses your existing connection logic

        const result = await Register.updateMany(
            { priceOnCall: { $exists: false } },
            { $set: { priceOnCall: false } }
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
