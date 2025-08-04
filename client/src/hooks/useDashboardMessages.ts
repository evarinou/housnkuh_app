import { useState, useEffect, useCallback } from 'react';
import { IDashboardMessage } from '../types/booking';

interface UseDashboardMessagesOptions {
  userId: string;
}

export const useDashboardMessages = ({ userId }: UseDashboardMessagesOptions) => {
  const [messages, setMessages] = useState<IDashboardMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard messages from API
  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('vendorToken');
      const response = await fetch(`http://localhost:4000/api/vendor-auth/dashboard/messages/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Nachrichten');
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      console.error('Error fetching dashboard messages:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Dismiss a message
  const dismissMessage = useCallback(async (messageId: string) => {
    try {
      const token = localStorage.getItem('vendorToken');
      const response = await fetch(`http://localhost:4000/api/vendor-auth/dashboard/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove message from local state
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      } else {
        console.error('Failed to dismiss message');
      }
    } catch (error) {
      console.error('Error dismissing message:', error);
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    fetchMessages();

    // TODO: Implement WebSocket subscription for real-time updates
    // For now, we'll use polling as a fallback
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 60000); // Poll every minute

    return () => {
      clearInterval(pollInterval);
    };
  }, [userId, fetchMessages]);

  // Refresh function
  const refresh = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    loading,
    error,
    dismissMessage,
    refresh
  };
};

export default useDashboardMessages;