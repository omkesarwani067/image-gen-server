import { registerUser, loginUser, userCredits, paymentRazorpay } from "../controllers/userController.js"
import express from "express"
import userAuth from "../middleware/auth.js"


const userRouter = express.Router()

userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)
userRouter.get("/credits", userAuth, userCredits)
userRouter.post("/pay-razor", userAuth, paymentRazorpay)
userRouter.post("/verify-razor", verifyRazorPay)

export default userRouter