import { create } from 'zustand';
import { notificationService, type Notification } from '../lib/notifications';

interface Toast {
    id: string;
    notification: Notification;
}

interface NotificationState {
    unreadCount: number;
    notifications: Notification[];
    toasts: Toast[];
    loading: boolean;
    setNotifications: (notifications: Notification[]) => void;
    addToast: (notification: Notification) => void;
    removeToast: (id: string) => void;
    fetchUnreadCount: (userId: string) => Promise<void>;
    fetchNotifications: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    unreadCount: 0,
    notifications: [],
    toasts: [],
    loading: false,

    setNotifications: (notifications) => set({ notifications }),

    addToast: (notification) => {
        const id = Math.random().toString(36).substring(7);
        set((state) => ({
            toasts: [...state.toasts, { id, notification }]
        }));

        // System notification if permission granted
        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/dpsicon.jpg'
            });
        }
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id)
        }));
    },

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

            // Check for new notifications to trigger toasts
            const currentNotifications = get().notifications;
            if (currentNotifications.length > 0) {
                const newItems = alerts.filter(
                    (newItem) => !currentNotifications.some((oldItem) => oldItem.id === newItem.id)
                );

                newItems.forEach(item => {
                    get().addToast(item);
                });
            }

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
