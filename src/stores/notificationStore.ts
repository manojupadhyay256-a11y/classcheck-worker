import { create } from 'zustand';
import { notificationService, type Notification } from '../lib/notifications';

interface NotificationState {
    unreadCount: number;
    notifications: Notification[];
    loading: boolean;
    setNotifications: (notifications: Notification[]) => void;
    fetchUnreadCount: (userId: string) => Promise<void>;
    fetchNotifications: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    unreadCount: 0,
    notifications: [],
    loading: false,

    setNotifications: (notifications) => set({ notifications }),

    fetchUnreadCount: async (userId) => {
        try {
            const count = await notificationService.getUnreadCount(userId);
            set({ unreadCount: count });
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    },

    fetchNotifications: async (userId) => {
        set({ loading: true });
        try {
            const data = await notificationService.fetchByRecipient(userId);
            const alerts = data as Notification[];

            set({
                notifications: alerts,
                unreadCount: alerts.filter(n => !n.is_read).length,
                loading: false
            });
        } catch (error) {
            console.error('Error fetching notifications:', error);
            set({ loading: false });
        }
    },
}));
