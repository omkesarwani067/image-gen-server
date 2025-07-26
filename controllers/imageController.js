import axios from "axios";
import userModel from "../models/userModels.js";
import FormData from 'form-data';

export const generateImage = async (req, res) => {
    try {
        const { prompt } = req.body;
        const userId = req.userId; // Use from middleware, not req.body

        // Enhanced validation
        if (!userId || !prompt) {
            return res.json({ success: false, message: 'Missing required details' });
        }

        if (typeof prompt !== 'string' || prompt.trim().length === 0) {
            return res.json({ success: false, message: 'Invalid prompt provided' });
        }

        if (prompt.length > 1000) {
            return res.json({ success: false, message: 'Prompt too long. Maximum 1000 characters allowed.' });
        }

        // CRITICAL FIX - Atomic credit deduction to prevent race conditions
        const user = await userModel.findOneAndUpdate(
            { 
                _id: userId, 
                creditBalance: { $gte: 1 } // Ensure user has at least 1 credit
            },
            { 
                $inc: { creditBalance: -1 } // Deduct credit atomically
            },
            { 
                new: true, // Return updated document
                select: 'creditBalance name' // Only select needed fields
            }
        );

        if (!user) {
            return res.json({ 
                success: false, 
                message: 'Insufficient credit balance', 
                creditBalance: 0 
            });
        }

        // Prepare form data for ClipDrop API
        const formData = new FormData();
        formData.append('prompt', prompt.trim());

        try {
            // Make API call to ClipDrop
            const { data } = await axios.post('https://clipdrop-api.co/text-to-image/v1', formData, {
                headers: {
                    'x-api-key': process.env.CLIPDROP_API,
                    ...formData.getHeaders()
                },
                responseType: 'arraybuffer',
                timeout: 30000, // 30 second timeout
                maxContentLength: 50 * 1024 * 1024, // 50MB max response size
            });

            // Convert image to base64
            const base64Image = Buffer.from(data, 'binary').toString('base64');
            const resultImage = `data:image/png;base64,${base64Image}`;

            // Validate image size (optional)
            if (base64Image.length > 10 * 1024 * 1024) { // 10MB limit
                console.warn('Generated image is very large:', base64Image.length);
            }

            res.json({
                success: true,
                message: "Image generated successfully",
                creditBalance: user.creditBalance,
                resultImage
            });

        } catch (apiError) {
            console.error('ClipDrop API error:', apiError.message);
            
            // CRITICAL - Refund credit if image generation fails
            await userModel.findByIdAndUpdate(
                userId,
                { $inc: { creditBalance: 1 } } // Refund the credit
            );

            // Handle specific API errors
            if (apiError.response?.status === 400) {
                return res.json({ 
                    success: false, 
                    message: 'Invalid prompt. Please try a different description.',
                    creditBalance: user.creditBalance + 1 // Show refunded balance
                });
            } else if (apiError.response?.status === 401) {
                return res.json({ 
                    success: false, 
                    message: 'Service temporarily unavailable. Credit refunded.',
                    creditBalance: user.creditBalance + 1
                });
            } else if (apiError.code === 'ECONNABORTED') {
                return res.json({ 
                    success: false, 
                    message: 'Request timeout. Please try again. Credit refunded.',
                    creditBalance: user.creditBalance + 1
                });
            } else {
                return res.json({ 
                    success: false, 
                    message: 'Image generation failed. Credit refunded.',
                    creditBalance: user.creditBalance + 1
                });
            }
        }

    } catch (error) {
        console.error('Image generation error:', error);
        
        // Try to refund credit if user was found and deducted
        if (req.userId) {
            try {
                await userModel.findByIdAndUpdate(
                    req.userId,
                    { $inc: { creditBalance: 1 } }
                );
            } catch (refundError) {
                console.error('Credit refund error:', refundError);
            }
        }

        res.status(500).json({ 
            success: false, 
            message: 'Internal server error. If credits were deducted, they will be refunded.' 
        });
    }
};

// New function to get user's generation history
export const getImageHistory = async (req, res) => {
    try {
        const userId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // This would require a new model for image history
        // For now, just return user info
        const user = await userModel.findById(userId).select('name creditBalance');
        
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                name: user.name,
                creditBalance: user.creditBalance
            },
            history: [], // Placeholder for future implementation
            pagination: {
                page,
                limit,
                total: 0
            }
        });

    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};