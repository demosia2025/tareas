// apps/web/hooks/useUnreadMessages.ts
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

  // ✅ Obtener el último mensaje visto por cada usuario (desde localStorage)
  const getLastSeenMessageId = useCallback((userId: string): string | null => {
    if (typeof window === 'undefined') return null;
    const key = `lastSeenMessage_${session?.user?.id}_${userId}`;
    return localStorage.getItem(key);
  }, [session?.user?.id]);

  // ✅ Guardar el último mensaje visto
  const setLastSeenMessageId = useCallback((userId: string, messageId: string) => {
    if (typeof window === 'undefined') return;
    const key = `lastSeenMessage_${session?.user?.id}_${userId}`;
    localStorage.setItem(key, messageId);
  }, [session?.user?.id]);

  const fetchUnread = useCallback(async () => {
    if (!session?.user?.id || !workspaceId) return;

    try {
      const usersRes = await fetch(`/api/workspace/${workspaceId}/connected-users`, { cache: 'no-store' });
      if (!usersRes.ok) return;
      const usersData = await usersRes.json();
      const users = usersData.users || [];

      const unreadMap = new Map<string, UnreadMessage>();
      let total = 0;

      for (const user of users) {
        if (user.id === session.user.id) continue;

        const msgRes = await fetch(`/api/messages?otherUserId=${user.id}&workspaceId=${workspaceId}`, { cache: 'no-store' });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          const messages = msgData.messages || [];
          
          // ✅ Obtener el último mensaje visto
          const lastSeenId = getLastSeenMessageId(user.id);
          
          // ✅ Filtrar solo mensajes NUEVOS (después del último visto)
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
      }

      setUnreadMessages(unreadMap);
      setTotalUnread(total);
    } catch (error) {
      console.error("Error fetching unread messages:", error);
    }
  }, [workspaceId, session?.user?.id, getLastSeenMessageId]);

  useEffect(() => {
    if (!workspaceId || !session?.user?.id) return;
    
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [workspaceId, session?.user?.id, fetchUnread]);

  // ✅ Marcar mensajes como leídos cuando se abre el chat
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
          
          // Actualizar estado inmediatamente
          setUnreadMessages(prev => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
          setTotalUnread(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error("Error marking as read:", error);
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