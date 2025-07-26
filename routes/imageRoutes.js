import express from 'express';
import { generateImage, getImageHistory } from '../controllers/imageController.js';
import userAuth from '../middleware/auth.js';

const imageRouter = express.Router();

// All image routes require authentication
imageRouter.post('/generate-image', userAuth, generateImage);
imageRouter.get('/history', userAuth, getImageHistory); // NEW - Get user's generation history

export default imageRouter;