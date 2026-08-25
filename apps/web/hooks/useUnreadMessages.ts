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

  const fetchUnread = useCallback(async () => {
    if (!session?.user?.id || !workspaceId) return;

    try {
      // Obtener todos los usuarios del workspace
      const usersRes = await fetch(`/api/workspace/${workspaceId}/connected-users`, { cache: 'no-store' });
      if (!usersRes.ok) return;
      const usersData = await usersRes.json();
      const users = usersData.users || [];

      const unreadMap = new Map<string, UnreadMessage>();
      let total = 0;

      // Para cada usuario, verificar si hay mensajes no leídos
      for (const user of users) {
        if (user.id === session.user.id) continue;

        const msgRes = await fetch(`/api/messages?otherUserId=${user.id}&workspaceId=${workspaceId}`, { cache: 'no-store' });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          const messages = msgData.messages || [];
          
          // Filtrar mensajes no leídos (últimos 30 minutos)
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          const recentUnread = messages.filter((msg: any) => 
            msg.senderId === user.id && 
            new Date(msg.createdAt) > thirtyMinutesAgo
          );

          if (recentUnread.length > 0) {
            const lastMsg = recentUnread[recentUnread.length - 1];
            unreadMap.set(user.id, {
              senderId: user.id,
              senderName: user.name,
              content: lastMsg.content,
              createdAt: lastMsg.createdAt,
              count: recentUnread.length
            });
            total += recentUnread.length;
          }
        }
      }

      setUnreadMessages(unreadMap);
      setTotalUnread(total);
    } catch (error) {
      console.error("Error fetching unread messages:", error);
    }
  }, [workspaceId, session?.user?.id]);

  useEffect(() => {
    if (!workspaceId || !session?.user?.id) return;
    
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000); // Polling cada 5 segundos
    return () => clearInterval(interval);
  }, [workspaceId, session?.user?.id, fetchUnread]);

  const markAsRead = useCallback((userId: string) => {
    setUnreadMessages(prev => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
    setTotalUnread(prev => Math.max(0, prev - 1));
  }, []);

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