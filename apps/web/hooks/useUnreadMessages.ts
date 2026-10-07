"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface UnreadMessage {
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  count: number;
}

export function useUnreadMessages(workspaceId: string | null) {
  const { data: session } = useSession();
  const [unreadMessages, setUnreadMessages] = useState<Map<string, UnreadMessage>>(new Map());
  const [totalUnread, setTotalUnread] = useState(0);

  const getLastSeenMessageId = useCallback((userId: string): string | null => {
    if (typeof window === 'undefined') return null;
    const key = `lastSeenMessage_${session?.user?.id}_${userId}`;
    return localStorage.getItem(key);
  }, [session?.user?.id]);

  const setLastSeenMessageId = useCallback((userId: string, messageId: string) => {
    if (typeof window === 'undefined') return;
    const key = `lastSeenMessage_${session?.user?.id}_${userId}`;
    localStorage.setItem(key, messageId);
  }, [session?.user?.id]);

  const fetchUnread = useCallback(async () => {
    if (!session?.user?.id || !workspaceId) return;

    try {
      const usersRes = await fetch(`/api/workspace/${workspaceId}/connected-users`, { cache: 'no-store' });
      
      // ✅ Silenciar errores 403 (Forbidden) ya que es esperado si el usuario no es miembro 
      // o es un admin sin membresía explícita en ese workspace específico.
      if (usersRes.status === 403) {
        setUnreadMessages(new Map());
        setTotalUnread(0);
        return;
      }

      if (!usersRes.ok) {
        console.error("Error fetching connected users:", usersRes.statusText);
        return;
      }

      const usersData = await usersRes.json();
      const users = usersData.users || [];
      const unreadMap = new Map<string, UnreadMessage>();
      let total = 0;

      for (const user of users) {
        if (user.id === session.user.id) continue;

        const msgRes = await fetch(`/api/messages?otherUserId=${user.id}&workspaceId=${workspaceId}`, { cache: 'no-store' });
        if (!msgRes.ok) continue;

        const msgData = await msgRes.json();
        const messages = msgData.messages || [];

        const lastSeenId = getLastSeenMessageId(user.id);
        const newMessages = lastSeenId 
          ? messages.filter((msg: any) => {
              const msgIndex = messages.findIndex((m: any) => m.id === lastSeenId);
              const currentIndex = messages.findIndex((m: any) => m.id === msg.id);
              return currentIndex > msgIndex && msg.senderId === user.id;
            })
          : messages.filter((msg: any) => msg.senderId === user.id);

        if (newMessages.length > 0) {
          const lastMsg = newMessages[newMessages.length - 1];
          unreadMap.set(user.id, {
            senderId: user.id,
            senderName: user.name,
            content: lastMsg.content,
            createdAt: lastMsg.createdAt,
            count: newMessages.length
          });
          total += newMessages.length;
        }
      }

      setUnreadMessages(unreadMap);
      setTotalUnread(total);
    } catch (error) {
      // Silenciar errores de red para no spamear la consola
    }
  }, [workspaceId, session?.user?.id, getLastSeenMessageId]);

  useEffect(() => {
    if (!workspaceId || !session?.user?.id) return;
    
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [workspaceId, session?.user?.id, fetchUnread]);

  const markAsRead = useCallback(async (userId: string) => {
    if (!workspaceId) return;

    try {
      const msgRes = await fetch(`/api/messages?otherUserId=${userId}&workspaceId=${workspaceId}`, { cache: 'no-store' });
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        const messages = msgData.messages || [];
        if (messages.length > 0) {
          const lastMessageId = messages[messages.length - 1].id;
          setLastSeenMessageId(userId, lastMessageId);
          
          setUnreadMessages(prev => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
          setTotalUnread(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      // Ignorar errores silenciosamente
    }
  }, [workspaceId, setLastSeenMessageId]);

  const markAllAsRead = useCallback(() => {
    setUnreadMessages(new Map());
    setTotalUnread(0);
  }, []);

  return {
    unreadMessages,
    totalUnread,
    fetchUnread,
    markAsRead,
    markAllAsRead
  };
}