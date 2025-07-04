import userModel from "../models/userModels.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import razorpay from 'razorpay';
import transactionModel from "../models/transactionModel.js";


dotenv.config();

export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.json({ success: false, message: 'Missing Details' });
        }

        const existingUser = await userModel.findOne({ email });
        if (existingUser) return res.json({ success: false, message: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({ name, email, password: hashedPassword });
        const user = await newUser.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        res.json({ success: true, token, user: { name: user.name, creditBalance: user.creditBalance } });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) return res.json({ success: false, message: 'User does not exist' });

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
            res.json({ success: true, token, user: { name: user.name, creditBalance: user.creditBalance } });
        } else {
            return res.json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const userCredits = async (req, res) => {
    try {
        const { userId} = req.body;
        const user = await userModel.findById(req.userId);
        if (!user) return res.json({ success: false, message: 'User not found' });

        res.json({
            success: true,
            credits: user.creditBalance,
            user: { name: user.name, creditBalance: user.creditBalance }
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const paymentRazorpay = async (req, res) => {
    try {
        const { userId, planId } = req.body;
        

        if (!userId || !planId) return res.json({ success: false, message: 'Missing details' });
const userData = await userModel.findById(userId)
        let credits, plan, amount;
        switch (planId) {
            case 'Basic': credits = 100; plan = 'Basic'; amount = 10; break;
            case 'Advanced': credits = 500; plan = 'Advanced'; amount = 50; break;
            case 'Business': credits = 5000; plan = 'Business'; amount = 250; break;
            default: return res.json({ success: false, message: 'Invalid plan' });
        }
        date = Date.now();
 const transactionData = {
            userId, plan, amount, credits, date
        }

        const newtransaction = await transactionModel.create({ transactionData });

        const options = {
            amount: amount * 100,
            currency: process.env.CURRENCY,
            receipt: newtransaction._id.toString(),
        };

        await razorpayInstance.orders.create(options, (error, order) => {
            if (error) {
                console.log(error)
                return res.json({ success: false, message: error })
            }
            return res.json({ success: true, order })
        })


    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}
export const verifyRazorPay = async (req, res) => {
    try {
        const { razorpay_order_id } = req.body;
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)
        if (orderInfo.status === 'paid') {
            const transactionData = await transactionModel.findById(orderInfo.receipt)
            if (transactionData.payment) {
                return res.json({ success: false, message: 'Payment Failed' })
            }
            const userData = await userModel.findById(transactionData.userId)

            const creditBalance = userData.creditBalance + transactionData.credits
            await userModel.findByIdAndUpdate(userData._id, { creditBalance })

            await transactionModel.findByIdAndUpdate(transactionData._id, { payment: true })
            res.json({ success: true, message: 'Credits Added' })
        }else{
            res.json({ success: false, message: 'Payment failed' })
            
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}