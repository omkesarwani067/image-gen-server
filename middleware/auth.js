import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const userAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ success: false, message: "Access denied. Login again." });
    }

    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
    if (!tokenDecode?.id) {
      return res.status(401).json({ success: false, message: "Invalid token. Login again." });
    }

    req.body.userId = tokenDecode.id;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Unauthorized: " + error.message });
  }
};

export default userAuth;
