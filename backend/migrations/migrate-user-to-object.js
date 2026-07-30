import dotenv from "dotenv";
import mongoose from "mongoose";
import dbConnection from "../config/db.js";

dotenv.config();

async function migrateUserToObject() {
  try {
    await dbConnection();
    console.log("✅ Connected to MongoDB");

    // Find all group ticketing documents where user is a string
    const docsToMigrate = await mongoose.connection.db
      .collection("groupticketing")
      .find({ user: { $type: "string" } })
      .toArray();

    console.log(`📊 Found ${docsToMigrate.length} documents to migrate`);

    // Update each document
    for (const doc of docsToMigrate) {
      await mongoose.connection.db.collection("groupticketing").updateOne(
        { _id: doc._id },
        {
          $set: {
            user: {
              name: doc.user || "Unknown Supplier",
              _id: doc.user || "",
            },
          },
        },
      );
    }

    console.log(
      `✅ Migrated ${docsToMigrate.length} group ticketing documents to new user object format`,
    );

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    await mongoose.disconnect();
  }
}

migrateUserToObject();
