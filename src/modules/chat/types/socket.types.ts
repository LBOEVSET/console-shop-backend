export interface JoinRoomPayload {
  sessionId: string;
}

export interface SendMessagePayload {
  sessionId: string;
  sender: string;
  message: string;
}

export interface CloseSessionPayload {
  sessionId: string;
}
