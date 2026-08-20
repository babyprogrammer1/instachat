import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from "cors";
import connectDB from "./config/db.js";
import { clerkMiddleware } from '@clerk/express'
import userRouter from "./routes/userRoutes.js";

const app = express();

// Connect to MongoDB
await connectDB()

// Middleware
app.use(cors())
app.use(express.json());
app.use(clerkMiddleware());

const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});
app.use('/api/users', userRouter);

app.use((error: any, _req: Request, res: Response, next: Function) => {
    if (res.headersSent) {
        next(error);
        return;
    }
    if (error?.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ success: false, message: "Avatar must be smaller than 5 MB" });
        return;
    }
    console.error("Request error:", error);
    res.status(500).json({ success: false, message: "Unable to process request" });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});