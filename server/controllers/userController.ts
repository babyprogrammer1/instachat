import { AuthRequest } from "../middlewares/auth.js";
import { Response } from "express";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

const userFields = "name email bio handle avatar isOnline lastSeen";

// Get all users
export const getUsers = async (req: AuthRequest, res: Response) => {
    const users = await User.find({ _id: { $ne: req.userId!.id } })
        .select(userFields)
        .lean();
    res.json({ success: true, users });
}

// Search users by name or handle
export const searchUsers = async (req: AuthRequest, res: Response) => {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
        res.json({ success: true, users: [] });
        return;
    }

    const escapedQuery = query.trim().slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escapedQuery) {
        res.json({ success: true, users: [] });
        return;
    }

    const regex = new RegExp(escapedQuery, 'i');
    const users = await User.find({
        _id: { $ne: req.userId!.id },
        $or: [
            { name: regex},
            {email: regex},
            { handle: regex}
        ]
    }).select(userFields).limit(20).lean();

    res.json({ success: true, users });
}

// Get current user profile
export const getProfile = async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.userId?.id);
    if (!user){
        res.status(404).json({ success: false, message: "User not found" });
        return; 
    }
    res.json({ success: true, user });
}

// Update current user profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const { name, bio, handle } = req.body;
        const file = req.file;
        const normalizedHandle = typeof handle === "string" ? handle.trim().toLowerCase() : "";

        if (normalizedHandle) {
            const handleExists = await User.exists({ handle: normalizedHandle, _id: { $ne: req.userId?.id } });
            if (handleExists) {
                res.status(400).json({ success: false, message: "Handle already in use" });
                return;
            }
        }

        let avatarUrl = "";
        if (file) {
            try {
            const uploadPromise = new Promise<{secure_url: string}>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({ folder: "insta_chat_avatars" }, (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result as any);
                    }
                });
                const readableStream = new Readable();
                readableStream.push(file.buffer);
                readableStream.push(null);
                readableStream.pipe(uploadStream);
            });
            const result = await uploadPromise;
            avatarUrl = result.secure_url;
        } catch(err) {
            console.error("Error uploading avatar:", err);
            res.status(500).json({ success: false, message: "Unable to upload avatar right now" });
            return;
        }
        }

        const updatedData : any = {
            ...(typeof name === "string" && name.trim() && { name: name.trim() }),
            ...(bio !== undefined && { bio: typeof bio === "string" ? bio.trim() : bio }),
            ...(normalizedHandle && { handle: normalizedHandle })
        };

        if (avatarUrl) {
            updatedData.avatar = avatarUrl;
        }

        const updated = await User.findByIdAndUpdate(req.userId?.id, updatedData, {
            returnDocument: "after",
            runValidators: true,
        }).lean();

        if (!updated) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        res.json({ success: true, user: updated });
    } catch (error: any) {
        console.error("Error updating profile:", error);
        if (error?.code === 11000) {
            res.status(400).json({ success: false, message: "That handle or email is already in use" });
            return;
        }
        res.status(500).json({ success: false, message: "Unable to save profile right now" });
    }
}