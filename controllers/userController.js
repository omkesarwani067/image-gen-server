import userModel from "../models/userModels.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import razorpay from 'razorpay';
import transactionModel from "../models/transactionModel.js";
import crypto from 'crypto';

dotenv.config();

// Initialize Razorpay instance - CRITICAL FIX
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Input validation helpers
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    return password && password.length >= 8;
};

export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Enhanced validation
        if (!name || !email || !password) {
            return res.json({ success: false, message: 'All fields are required' });
        }

        if (!validateEmail(email)) {
            return res.json({ success: false, message: 'Invalid email format' });
        }

        if (!validatePassword(password)) {
            return res.json({ success: false, message: 'Password must be at least 8 characters long' });
        }

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "User already exists" });
        }

        // Increased salt rounds for better security
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword
        });
        const user = await newUser.save();

        // Added token expiration - CRITICAL FIX
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                creditBalance: user.creditBalance
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.json({ success: false, message: 'Email and password are required' });
        }

        if (!validateEmail(email)) {
            return res.json({ success: false, message: 'Invalid email format' });
        }

        const user = await userModel.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: 'Invalid credentials' });
        }

        // Added token expiration - CRITICAL FIX
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                creditBalance: user.creditBalance
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const userCredits = async (req, res) => {
    try {
        // Use req.userId from middleware instead of req.body.userId
        const user = await userModel.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            credits: user.creditBalance,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                creditBalance: user.creditBalance
            }
        });
    } catch (error) {
        console.error('Get credits error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const paymentRazorpay = async (req, res) => {
    try {
        const { planId } = req.body;
        const userId = req.userId; // Use from middleware

        if (!userId || !planId) {
            return res.json({ success: false, message: 'Missing details' });
        }

        const userData = await userModel.findById(userId);
        if (!userData) {
            return res.json({ success: false, message: 'User not found' });
        }

        let credits, plan, amount;

        // Enhanced plan validation
        switch (planId) {
            case 'Basic':
                credits = 100;
                plan = 'Basic';
                amount = 10;
                break;
            case 'Advanced':
                credits = 500;
                plan = 'Advanced';
                amount = 50;
                break;
            case 'Business':
                credits = 5000;
                plan = 'Business';
                amount = 250;
                break;
            default:
                return res.json({ success: false, message: 'Invalid plan selected' });
        }

        const date = Date.now();

        // Create transaction record first
        const transactionData = {
            userId,
            plan,
            amount,
            credits,
            date,
            payment: false // Will be updated on successful payment
        };

        const newTransaction = await transactionModel.create(transactionData);

        const options = {
            amount: amount * 100, // Convert to paisa
            currency: process.env.CURRENCY || 'INR',
            receipt: newTransaction._id.toString(),
            payment_capture: 1, // Auto capture payment
        };

        // CRITICAL FIX - Proper Razorpay integration
        try {
            const order = await razorpayInstance.orders.create(options);

            // FIXED: Store order ID in transaction for verification
            newTransaction.orderId = order.id;
            await newTransaction.save();

            return res.json({
                success: true,
                order,
                key: process.env.RAZORPAY_KEY_ID // Send key for frontend
            });
        } catch (razorpayError) {
            console.error('Razorpay error:', razorpayError);
            // Delete the transaction if order creation fails
            await transactionModel.findByIdAndDelete(newTransaction._id);
            return res.json({
                success: false,
                message: razorpayError.error ? razorpayError.error.description : razorpayError.message
            });
        }

    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// FIXED: Payment verification function
export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const userId = req.userId;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.json({ success: false, message: 'Payment verification failed - missing parameters' });
        }

        // Verify signature
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.json({ success: false, message: 'Payment verification failed - invalid signature' });
        }

        // FIXED: Find transaction by orderId instead of _id
        const transaction = await transactionModel.findOne({
            userId,
            orderId: razorpay_order_id
        });

        if (!transaction) {
            return res.json({ success: false, message: 'Transaction not found' });
        }

        // Update transaction status
        transaction.payment = true;
        transaction.paymentId = razorpay_payment_id;
        transaction.signature = razorpay_signature;
        transaction.status = 'completed';
        await transaction.save();

        // Update user credits atomically
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { $inc: { creditBalance: transaction.credits } },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Payment verified and credits added',
            creditBalance: updatedUser.creditBalance
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};