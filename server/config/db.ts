import mongoose from "mongoose";
import console from "console";

const connectDB = async () => {
    mongoose.connection.on("connected", async () => {
        console.log("MongoDB connected successfully");
    });

    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not defined in the environment variables");
    }

    await mongoose.connect(process.env.MONGODB_URI);
}

export default connectDB;