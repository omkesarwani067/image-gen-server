import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String, 
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String, 
        required: [true, 'Email is required'], 
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String, 
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters']
    },
    creditBalance: {
        type: Number, 
        default: 5,
        min: [0, 'Credit balance cannot be negative']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { 
        transform: function(doc, ret) {
            delete ret.password; // Don't include password in JSON responses
            return ret;
        }
    }
});

// Create index on email for better performance
userSchema.index({ email: 1 });

// Pre-save middleware to update lastLogin
userSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;