import { verifyToken } from "@clerk/express";
import { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";

// Map userId to WebSocket connection
const onlineUsers = new Map<string, WebSocket>();

//Initialize socket server
export const initializeSocketServer = (server: any) => {
    const wss = new WebSocketServer({ server, path: "/ws" });

    wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
        console.log("Client connected")

        // Extract token from query string: /ws?token=YOUR_TOKEN
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const token = url.searchParams.get("token");

        if (!token) {
            ws.close(1008, "Unauthorized: No token provided");
            return;
        }

        let userId: string | null = null;
        try {
            // Verify the token and extract userId
            const decoded = await verifyToken(token, {
                secretKey: process.env.CLERK_SECRET_KEY,
            });
            userId = decoded.sub;
        } catch (error) {
            console.error("Ws verification failed:", error);
            ws.close(1008, "Unauthorized: Invalid token");
            return;
        }

        // Register user online
        onlineUsers.set(userId, ws);
        await User.findByIdAndUpdate(userId, { isOnline: true });
        // broadcast to all users that this user is online
        handleOnlineStatus(userId, true);

        ws.on("message", (data: Buffer) => {
            try {
                const msg = JSON.parse(data.toString());
                // Forward the message to the intended recipient if they are online
                if (msg.type === "message") {
                    const { receiverId, conversationId, payload } = msg;
                    if(conversationId) {
                        // Broadcast to all participants in the conversation
                        handleConversationEvents(userId, conversationId, {
                            type: "message",
                            payload,
                        });
                    } else if (receiverId) {
                        // Legacy direct message
                        const receiverWs = onlineUsers.get(receiverId);
                        if (receiverWs?.readyState === WebSocket.OPEN) {
                            receiverWs.send(JSON.stringify({
                                type: "message",
                                payload,
                            }));
                        }
                    }
                }
                // Forward typing indicators to the intended recipient if they are online
                if (msg.type === "typing") {
                    const { receiverId, conversationId, isTyping } = msg;
                    if(conversationId) {
                        // Update typing status for all participants in the conversation
                        handleConversationEvents(userId, conversationId, {
                            type: "typing",
                            senderId: userId,
                            isTyping,
                        });
                    } else if (receiverId) {
                        // Legacy direct message
                        const receiverWs = onlineUsers.get(receiverId);
                        if (receiverWs?.readyState === WebSocket.OPEN) {
                            receiverWs.send(JSON.stringify({
                                type: "typing",
                                senderId: userId,
                                isTyping,
                            }));
                        }
                    }
                }
            } catch (error: any) {
                console.error("Invalid message format:", error);
            }
        })
        ws.on("close", async () => {
            onlineUsers.delete(userId);
            await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
            handleOnlineStatus(userId, false);
        })
    })
    return wss;
}

function handleOnlineStatus(userId: string, isOnline: boolean) {
    // Broadcast to all connected users that this user is online/offline
    const payload = JSON.stringify({
        type: "online_status",
        userId,
        isOnline,
    });
    onlineUsers.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
    });
}

export async function handleConversationEvents(senderId: string, conversationId: string, event: any) {
    try {
        const conversation = await Conversation.findById(conversationId)
        if (!conversation) return;

        const payload = JSON.stringify(event);
        conversation.participants.forEach((pId) => {
            const participantId = String(pId);
            if (participantId !== senderId) return; // Skip the sender
            const ws = onlineUsers.get(participantId);
            if (ws?.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
        });
    } catch (error) {
        console.error("Error handling conversation event:", error);
    }
}

export function broadcastUserUpdate(user: any) {
    const payload = JSON.stringify({ 
        type: "user_update",
        user
    });
    onlineUsers.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
    });
}

export {onlineUsers}