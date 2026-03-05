import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Megaphone, Bell } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';
import type { Notification } from '../../lib/notifications';

export const ToastContainer = () => {
    const { toasts, removeToast } = useNotificationStore();

    return (
        <div
            className="fixed top-4 right-4 z-100 flex flex-col gap-3 w-full max-w-sm pointer-events-none"
            style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        >
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <ToastItem
                        key={toast.id}
                        notification={toast.notification}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

const ToastItem = ({
    notification,
    onClose
}: {
    notification: Notification;
    onClose: () => void
}) => {
    const getIcon = (type: string) => {
        switch (type) {
            case 'announcement': return Megaphone;
            case 'private_message': return MessageSquare;
            default: return Bell;
        }
    };

    const Icon = getIcon(notification.type);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-indigo-100 p-4 flex gap-4 ring-1 ring-black/5"
        >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="flex-1 min-w-0">
                <h4 className="font-black text-[#1E1B4B] text-sm truncate">
                    {notification.title}
                </h4>
                <p className="text-slate-500 text-xs font-medium line-clamp-2 mt-0.5">
                    {notification.message}
                </p>
            </div>

            <button
                onClick={onClose}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors h-fit"
            >
                <X className="w-4 h-4 text-slate-400" />
            </button>
        </motion.div>
    );
};
