import { Request, Response, NextFunction } from 'express';
import { clerkMiddleware, clerkClient, getAuth } from '@clerk/express'
import User from '../models/User.js';

export interface AuthRequest extends Request {
    userId?: { id: string, name: string, email: string}; };


export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { isAuthenticated, userId } = getAuth(req)
        if(!userId) {
            res.status(401).json({success: false, message: "Unauthenticated" });
            return
        }
        // Check if the user exists in your database
        let localUser = await User.findById(userId).lean();

        if (!localUser) {
            // Lazy sync: If the user doesn't exist in your database, fetch their details from Clerk and create a new user in your database
            const clerkUser = await clerkClient.users.getUser(userId);
            const email = clerkUser.emailAddresses[0]?.emailAddress;
            const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || 'Anonymous';
            // Create fallback handle if username is not available
            const handle = clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress.split('@')[0] || userId;

            //Ensure unique handle by appending a random number if the handle already exists
            let finalHandle = handle.toLowerCase().replace(/[^a-z0-9]/g, '');
            let handleExists = await User.findOne({ handle: finalHandle });
            let counter = 1;
            while (handleExists) {
            const testHandle = `${finalHandle}${counter}`;
            handleExists = await User.findOne({ handle: testHandle });
            if (!handleExists) {
                finalHandle = testHandle;
                break;
            }
            counter++;
            }
            localUser = await User.create({ 
                _id: userId, 
                email: email.toLowerCase(), 
                name, 
                handle: finalHandle, 
                avatar: clerkUser.imageUrl || "",
                bio: "Hello! I am using Instachat.",
                isOnline: true, 
                lastSeen: new Date() 
            });
        }

        //Attach user information to request for compatibility 
        req.userId = {
            id: localUser._id,
            name: localUser.name,
            email: localUser.email
        }
        next();
    } catch (error) {
        console.error("Error in authMiddleware:", error);
        res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
}