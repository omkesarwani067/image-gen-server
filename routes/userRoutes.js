import { registerUser, loginUser, userCredits, paymentRazorpay, verifyPayment } from "../controllers/userController.js"
import express from "express"
import userAuth from "../middleware/auth.js"

const userRouter = express.Router()

// Public routes (no authentication required)
userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)

// Protected routes (authentication required)
userRouter.get("/credits", userAuth, userCredits)
userRouter.post("/pay-razor", userAuth, paymentRazorpay)
userRouter.post("/verify-payment", userAuth, verifyPayment) // NEW - Payment verification endpoint

// Additional helpful endpoints
userRouter.get("/profile", userAuth, async (req, res) => {
    try {
        const user = await userModel.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                creditBalance: user.creditBalance,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
})

// Logout endpoint (for token management on frontend)
userRouter.post("/logout", userAuth, (req, res) => {
    // Since JWT is stateless, logout is handled on frontend by removing token
    // This endpoint can be used for logging/analytics purposes
    res.json({
        success: true,
        message: "Logged out successfully"
    });
})

export default userRouter