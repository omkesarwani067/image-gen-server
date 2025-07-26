import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user',
        required: [true, 'User ID is required'],
        index: true // For faster queries
    },
    plan: { 
        type: String, 
        required: [true, 'Plan is required'],
        enum: ['Basic', 'Advanced', 'Business']
    },
    amount: { 
        type: Number, 
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    credits: { 
        type: Number, 
        required: [true, 'Credits is required'],
        min: [0, 'Credits cannot be negative']
    },
    payment: { 
        type: Boolean, 
        default: false 
    },
    paymentId: {
        type: String, // Razorpay payment ID
        sparse: true // Allows multiple null values
    },
    orderId: {
        type: String, // Razorpay order ID
        sparse: true
    },
    signature: {
        type: String, // Razorpay signature for verification
        sparse: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    failureReason: {
        type: String
    }
}, {
    timestamps: true // This replaces your manual date field
});

// Compound index for efficient queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });

// Instance method to mark transaction as completed
transactionSchema.methods.markCompleted = function(paymentId, signature) {
    this.payment = true;
    this.status = 'completed';
    this.paymentId = paymentId;
    this.signature = signature;
    return this.save();
};

// Instance method to mark transaction as failed
transactionSchema.methods.markFailed = function(reason) {
    this.status = 'failed';
    this.failureReason = reason;
    return this.save();
};

// Static method to get user's transaction history
transactionSchema.statics.getUserTransactions = function(userId, limit = 10, page = 1) {
    const skip = (page - 1) * limit;
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'name email');
};

const transactionModel = mongoose.models.transaction || mongoose.model("transaction", transactionSchema);

export default transactionModel;