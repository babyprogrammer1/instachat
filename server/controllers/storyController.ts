import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import Story from "../models/Story.js";

//Create a new story
export const createStory = async (req: AuthRequest, res: Response) => {
    const userId = req.userId!.id;
    const file = req.file;

    if (!file) {
        res.status(400).json({ success: false, message: "No file uploaded" });
        return;
    }

    try {
        const resourceType = file.mimetype.startsWith("video") ? "video" : "image"; 
        const uploadPromise = new Promise<{secure_url: string}>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({ folder: "insta_chat_stories", resource_type: resourceType }, (error, result) => {
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

        const story = await Story.create({
            userId,
            mediaUrl: result.secure_url,
            mediaType: resourceType,
        });

        await story.populate("userId", "name avatar handle");
        res.status(201).json({ success: true, story });
    } catch (err) {
        console.error("Story upload error:", err);
        res.status(500).json({ success: false, message: "Unable to upload media right now" });
        return;
    }
}



// Get all stories for the current user
export const getStories = async (req: AuthRequest, res: Response) => {
    const stories = await Story.find().sort({ createdAt: -1 }).populate("userId", "name avatar handle");
    // Group stories by userId
    const grouped: any = {};
    stories.forEach((s: any) => {
        const uid = String(s.userId._id);
        if (!grouped[uid]) {
            grouped[uid] = {
                user: s.userId,
                stories: []
            };
        }
        grouped[uid].stories.push(s);
    });
    res.status(200).json({ success: true, stories: Object.values(grouped) });
}
