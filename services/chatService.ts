// Chat service for calling backend DeepSeek API
import { ChatMessage } from '../types';

export interface MessageItem {
  role: string;
  content: string;
}

/**
 * Send a chat message to the backend DeepSeek API
 * @param message User's message
 * @param history Chat history (last 10 messages)
 * @returns AI response text
 */
export const sendChatMessage = async (
  message: string,
  history: ChatMessage[]
): Promise<string> => {
  try {
    // Convert frontend ChatMessage format to backend MessageItem format
    const historyItems: MessageItem[] = history
      .slice(-10) // Keep last 10 messages for context
      .map((msg) => ({
        role: msg.role === 'model' ? 'model' : 'user',
        content: msg.text,
      }));

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        history: historyItems,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chat API error:', response.status, errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (result.code === 200 && result.data) {
      return result.data;
    } else {
      throw new Error(result.message || 'Unknown error from backend');
    }
  } catch (error) {
    console.error('Chat service error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to connect to chat service');
  }
};
