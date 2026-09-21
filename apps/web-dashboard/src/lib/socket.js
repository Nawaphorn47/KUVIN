import { io } from "socket.io-client";
import { getToken } from "./auth";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || `http://${window.location.hostname}:4000`;

export const socket = io(SOCKET_URL, { autoConnect: false });

export function connectWithAuth() {
  const token = getToken();
  if (!token) return false;
  if (socket.connected) return true;
  socket.auth = { token };
  socket.connect();
  return true;
}
