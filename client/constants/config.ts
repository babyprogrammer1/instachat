import { Platform } from "react-native";

const HOST = Platform.select({
  ios: "192.168.1.34",
  android: "192.168.1.34",
  default: "localhost",
});

const localApiBaseUrl = `http://${HOST}:3000`;

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || localApiBaseUrl;

export const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL?.replace(/\/$/, "") ||
  API_BASE_URL.replace(/^http/, "ws");