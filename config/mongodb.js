import mongoose from "mongoose";

const connectDB = async () => {
    try {
        // Validate environment variable
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI environment variable is not defined');
        }

        // Enhanced connection event handlers
        mongoose.connection.on('connected', () => {
            console.log("✅ Database Connected Successfully");
        });

        mongoose.connection.on('error', (err) => {
            console.error("❌ Database Connection Error:", err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log("⚠️  Database Disconnected");
        });

        // Handle application termination
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('📴 Database connection closed through app termination');
            process.exit(0);
        });

        // Enhanced connection options for production
        const connectionOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            family: 4, // Use IPv4, skip trying IPv6
            bufferCommands: false, // Disable mongoose buffering
            bufferMaxEntries: 0, // Disable mongoose buffering
        };

        await mongoose.connect(`${process.env.MONGODB_URI}/imagify`, connectionOptions);

        // Log successful connection with database name
        console.log(`🚀 Connected to MongoDB database: imagify`);
        
    } catch (error) {
        console.error("💥 Failed to connect to MongoDB:", error.message);
        
        // Exit process with failure
        process.exit(1);
    }
};

export default connectDB;