export type ChatConnection = { apiUrl: string; accessToken: string };

let currentConnection: ChatConnection | undefined;
const listeners = new Set<(connection: ChatConnection) => void>();

export function readChatConnection() {
  return currentConnection;
}

export function setChatConnection(connection: ChatConnection) {
  currentConnection = connection;
  listeners.forEach((listener) => listener(connection));
}

export function clearChatConnection() {
  currentConnection = undefined;
}

export function subscribeToChatConnection(listener: (connection: ChatConnection) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
