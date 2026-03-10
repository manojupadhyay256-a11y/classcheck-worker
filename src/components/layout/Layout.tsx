import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileTopTabs from './MobileTopTabs';
import MobileHeader from './MobileHeader';
import { useAuthStore } from '../../stores/authStore';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotificationStore } from '../../stores/notificationStore';
import { useEffect } from 'react';
import { FcmListener } from '../common/FcmListener';

import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';

const Layout = ({ children }: { children: React.ReactNode }) => {
    const { profile } = useAuthStore();
    const { fetchNotifications } = useNotificationStore();
    const { onTouchStart, onTouchEnd } = useSwipeNavigation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        if (profile?.id) {
            fetchNotifications(profile.id);
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
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
            <FcmListener />
            {/* Desktop Sidebar */}
            <div className="hidden md:flex shrink-0 border-r border-slate-100 shadow-sm z-30">
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
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-70 md:hidden"
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
                {/* Mobile Header & Top Tabs */}
                <div className="sticky top-0 z-50">
                    <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
                    <MobileTopTabs />
                </div>

                <div
                    className="flex-1 overflow-hidden relative"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{
                                type: "tween",
                                ease: "easeInOut",
                                duration: 0.2
                            }}
                            className="h-full overflow-y-auto pb-8 p-4 sm:p-5 md:p-8"
                        >
                            <div className="max-w-7xl mx-auto w-full">
                                {children}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Layout;
