import { AuthState, Conversation, Message, User, UserStory, WsEvent } from "@/types";
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL, WS_URL } from "@/constants/config";
import { useAuth, useUser } from "@clerk/expo";

export const api = axios.create({ baseURL: API_BASE_URL });
const _tokenRef = { current: null as string | null };

interface AppContextType {
    auth: AuthState;
    logout: () => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    userStories: UserStory[];
    setUserStories: React.Dispatch<React.SetStateAction<UserStory[]>>;
    conversations: Conversation[];
    setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
    selectedConversation: Conversation | null;
    setSelectedConversation: (c: Conversation | null) => void;
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    fetchStories: () => Promise<void>;
    typingUsers: Record<string, boolean>;
    sendWsEvent: (data: object) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [auth, setAuth] = useState<AuthState>({ token: null, user: null, loading: true });
    const [users, setUsers] = useState<User[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userStories, setUserStories] = useState<UserStory[]>([]);
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
    const wsRef = useRef<WebSocket | null>(null);
    const { getToken, isLoaded: authLoaded, isSignedIn, signOut } = useAuth();
    const { user: clerkUser, isLoaded: userLoaded } = useUser();
    const getTokenRef = useRef(getToken);

    useEffect(() => {
        getTokenRef.current = getToken;
    }, [getToken]);

    useEffect(() => {
        const interceptor = api.interceptors.request.use(async (config) => {
            if (isSignedIn) {
                const token = await getTokenRef.current();
                if (token) {
                    _tokenRef.current = token;
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }
            return config;
        });
        return () => api.interceptors.request.eject(interceptor);
    }, [isSignedIn]);

    useEffect(() => {
        if (!authLoaded || !userLoaded) return;
        if (isSignedIn && clerkUser) {
            setAuth({
                token: _tokenRef.current,
                user: {
                    _id: clerkUser.id,
                    name: clerkUser.fullName || "Anonymous",
                    email: clerkUser.primaryEmailAddress?.emailAddress || "",
                    handle: clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress.split("@")[0] || clerkUser.id,
                    avatar: clerkUser.imageUrl || "",
                    bio: (clerkUser.publicMetadata?.bio as string) || "Hey there! I am using Instachat.",
                    isOnline: true,
                    lastSeen: new Date().toISOString(),
                },
                loading: false,
            });
        } else {
            setAuth({ token: null, user: null, loading: false });
        }
    }, [authLoaded, userLoaded, isSignedIn, clerkUser]);

    const logout = useCallback(async () => {
        _tokenRef.current = null;
        wsRef.current?.close();
        await signOut();
        setAuth({ token: null, user: null, loading: false });
    }, [signOut]);

    const updateUser = useCallback(async (user: User) => {
        setAuth((prev) => ({ ...prev, user }));
        setConversations([]);
        setMessages([]);
        setSelectedConversation(null);
    }, []);

    const fetchStories = useCallback(async () => {
        try {
            const { data } = await api.get("/api/stories");
            if (data.success) setUserStories(data.stories);
        } catch (error) {
            console.error("Unable to fetch stories:", error);
        }
    }, []);

    const fetchConversations = useCallback(async () => {
        try {
            const { data } = await api.get("/api/messages/conversations");
            if (data.success) setConversations(data.conversations);
        } catch (error) {
            console.error("Unable to fetch conversations:", error);
        }
    }, []);

    useEffect(() => {
        if (isSignedIn && authLoaded && userLoaded) {
            fetchConversations();
            fetchStories();
        }
    }, [isSignedIn, authLoaded, userLoaded, fetchConversations, fetchStories]);

    const sendWsEvent = useCallback((data: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    useEffect(() => {
        if (!isSignedIn || !authLoaded || !userLoaded) {
            wsRef.current?.close();
            return;
        }
        let isMounted = true;
        let ws: WebSocket | null = null;

        const connectWebSocket = async () => {
            try {
                const token = await getTokenRef.current();
                if (!token || !isMounted) return;
                ws = new WebSocket(`${WS_URL}/ws?token=${token}`);
                wsRef.current = ws;
                ws.onmessage = (e) => {
                    const event: WsEvent = JSON.parse(e.data);
                    if (event.type === "message" && event.payload) {
                        const incoming = event.payload as Message;
                        setMessages((prev) => {
                            if (prev.some((m) => m._id === incoming._id)) return prev;
                            if (prev.length === 0 || prev[0].conversationId === incoming.conversationId) {
                                return [...prev, incoming];
                            }
                            return prev;
                        });
                        setConversations((prev) => {
                            if (!prev.some((c) => c._id === incoming.conversationId)) {
                                fetchConversations();
                                return prev;
                            }
                            return prev.map((conversation) =>
                                conversation._id === incoming.conversationId
                                    ? { ...conversation, lastMessage: incoming, updatedAt: incoming.createdAt }
                                    : conversation
                            ).sort((a, b) =>
                                new Date(b.lastMessage?.createdAt || b.updatedAt).getTime() -
                                new Date(a.lastMessage?.createdAt || a.updatedAt).getTime());
                        });
                    } else if (event.type === "typing" && event.senderId) {
                        setTypingUsers((prev) => ({ ...prev, [event.senderId!]: Boolean(event.isTyping) }));
                    } else if (event.type === "chat_deleted" && event.conversationId) {
                        setConversations((prev) => prev.filter((c) => c._id !== event.conversationId));
                        setMessages((prev) => prev.filter((m) => m.conversationId !== event.conversationId));
                    }
                };
                ws.onerror = (error) => console.error("WebSocket error:", error);
            } catch (error) {
                console.error("WebSocket connection error:", error);
            }
        };

        connectWebSocket();
        return () => {
            isMounted = false;
            ws?.close();
            if (wsRef.current === ws) wsRef.current = null;
        };
    }, [isSignedIn, authLoaded, userLoaded, fetchConversations]);

    return (
        <AppContext.Provider value={{
            auth, logout, updateUser, users, setUsers, userStories, setUserStories,
            conversations, setConversations, selectedConversation, setSelectedConversation,
            messages, setMessages, fetchStories, typingUsers, sendWsEvent,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error("useApp must be used within an AppProvider");
    return context;
}
