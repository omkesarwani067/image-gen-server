import jwt from "jsonwebtoken"
import dotenv from "dotenv";

dotenv.config();

const userAuth = async (req, res, next) => {
    console.log(process.env.JWT_SECRET)
    const token = req.headers.token;
    console.log(token)
    if (!token) {
        return res.status(401).json({ success: false, message: "Access denied. Login Again." })
    }

    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
        console.log(tokenDecode)
        if (tokenDecode.id) {
            req.body.userId = tokenDecode.id;
        } else {
            return res.json({ success: false, message: "Not Authorized .Login Again " })
        }
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: error.message })
    }
};

export default userAuth;