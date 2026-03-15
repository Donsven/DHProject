"use client";

import { createContext, useContext, useState } from "react";

const NotificationContext = createContext<{
  unreadCount: number;
  setUnreadCount: (n: number) => void;
}>({ unreadCount: 3, setUnreadCount: () => {} });

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(3);
  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
