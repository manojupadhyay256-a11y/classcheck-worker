import React, { useState } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import MobileHeader from './MobileHeader';
import { useAuthStore } from '../../stores/authStore';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotificationStore } from '../../stores/notificationStore';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { FcmListener } from '../common/FcmListener';

const Layout = ({ children }: { children: React.ReactNode }) => {
    const { profile } = useAuthStore();
    const { fetchNotifications } = useNotificationStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (profile?.id) {
            fetchNotifications(profile.id);
            // Polling interval removed in favor of Pusher real-time listener
        }
    }, [profile?.id, fetchNotifications]);

    if (!profile) {
        console.warn('[Layout] No profile found, rendering fallback');
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 uppercase tracking-widest font-bold text-gray-400 animate-pulse">
                Loading...
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#F8FAFC]">
            <Toaster position="top-right" richColors closeButton />
            <FcmListener />
            {/* Desktop Sidebar */}
            <div className="hidden md:flex shrink-0">
                <Sidebar />
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 bg-saas-dark/40 backdrop-blur-sm z-70 md:hidden"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-72 bg-white z-80 md:hidden shadow-2xl"
                        >
                            <Sidebar onClose={() => setIsSidebarOpen(false)} />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Mobile Header */}
                <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />

                <main className="flex-1 overflow-y-auto pb-32 md:pb-8 p-3 sm:p-4 md:p-8">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>

                {/* Mobile Bottom Navigation */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
                    <BottomNav />
                </div>
            </div>
        </div>
    );
};

export default Layout;
