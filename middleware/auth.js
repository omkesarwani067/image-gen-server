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
        message: "Access denied. Please login to continue.",
        requiresLogin: true
      });
    }

    try {
      const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
      
      if (!tokenDecode?.id) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid token. Please login again.",
          requiresLogin: true
        });
      }

      // SECURITY FIX - Only set req.userId, never req.body.userId
      req.userId = tokenDecode.id;
      
      next();
    } catch (jwtError) {
      // Handle specific JWT errors for better user experience
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: "Session expired. Please login again.",
          requiresLogin: true,
          expired: true
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid token. Please login again.",
          requiresLogin: true
        });
      } else {
        throw jwtError; // Re-throw unexpected errors
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Authentication service temporarily unavailable"
    });
  }
};

export default userAuth;