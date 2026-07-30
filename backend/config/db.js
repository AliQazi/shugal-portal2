import mongoose from "mongoose";
import colors from "colors";

const dbConnection = async () => {
    try {
        let conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`.bgCyan.white);
    } catch (error) {
        console.error(`Error: ${error.message}`.bgRed.white);
    }
}

export default dbConnection;