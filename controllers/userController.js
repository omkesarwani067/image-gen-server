
import userModel from "../models/userModels.js";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import razorpay from 'razorpay'
import transactionModel from "../models/transactionModel.js";
import { SchemaTypeOptions } from "mongoose";

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.json({ success: false, message: 'Missing Details' })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const userData = {
            name,
            email,
            password: hashedPassword
        }

        const newUser = new userModel(userData)
        const user = await newUser.save()

        const token = jwt.sign({ id: user._id}, process.env.JWT_SECRET)

        res.json({ success: true, token, user: { name: user.name, creditBalance: user.creditBalance } });

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: 'User does not exist' })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)

            res.json({ success: true, token, user: { name: user.name, creditBalance: user.creditBalance } });

        } else {
            return res.json({ success: false, message: 'Invalid credentials' })
        }


    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}


const userCredits = async (req, res) => {
    try {
        const token = req.headers.token;
        if (!token) return res.json({ success: false, message: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id);
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

const paymentRazorpay = async (req, res) => {
    try { 
        const { userId, planId } = req.body

        const userData = await userModel.findById(userId)

        if (!userId || !planId) {
            return res.json({ success: false,
                 message: 'Missing details' });
        }

        let credits, plan, amount, date;

        switch (planId) {
            case 'Basic':
                credits = 100;
                plan = 'Basic';
                amount = 10;
                date = new Date();
                break;
            case 'Advanced':
                credits = 500;
                plan = 'Advanced';
                amount = 50;
                date = new Date();
                break;
            case 'Business':
                credits = 5000;
                plan = 'Business';
                amount = 250;
                date = new Date();
                break;
            default:
                return res.json({ success: false, message: 'Invalid plan' });
        }

        const transaction = {
            userId,
            plan,
            credits,
            amount,
            date
        };
        const newTransaction = await transactionModel.create(transaction);

        const options = {
            amount: amount * 100, // Amount in paise
            currency: process.env.CURRENCY,
            receipt: newTransaction._id.toString(),
            
        };

        await razorpayInstance.orders.create(options,(error,order)=>{
           if (error) {
                console.log(error);
                return res.json({ success: false, message: 'Error creating order' });
            }
            res.json({success: true, order})
        })


     }
    catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}




export  {registerUser, loginUser, userCredits, paymentRazorpay};

