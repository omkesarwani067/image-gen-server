import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const userAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Access denied. Login again." 
      });
    }

    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
    if (!tokenDecode?.id) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token. Login again." 
      });
    }

    // Set both for compatibility
    req.userId = tokenDecode.id;
    req.body.userId = tokenDecode.id;
    
    next();
  } catch (error) {
    console.log('Auth error:', error);
    return res.status(401).json({ 
      success: false, 
      message: "Unauthorized: " + error.message 
    });
  }
};
export default userAuth;