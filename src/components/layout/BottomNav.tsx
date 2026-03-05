import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Settings,
    CalendarCheck,
    BookOpen,
    Bell
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const BottomNav = () => {
    const { profile } = useAuthStore();
    const { unreadCount } = useNotificationStore();
    const role = profile?.role;

    const getNavItems = () => {
        switch (role) {
            case 'admin':
                return [
                    { to: '/admin', icon: LayoutDashboard, label: 'Home' },
                    { to: '/admin/students', icon: Users, label: 'Students' },
                    { to: '/admin/notifications', icon: Bell, label: 'Messages', badge: unreadCount },
                    { to: '/admin/profile', icon: Users, label: 'Profile' },
                    { to: '/admin/settings', icon: Settings, label: 'Settings' },
                ];
            case 'teacher':
                return [
                    { to: '/teacher', icon: LayoutDashboard, label: 'Home' },
                    { to: '/teacher/attendance', icon: CalendarCheck, label: 'Attend' },
                    { to: '/teacher/my-subjects', icon: BookOpen, label: 'Subjects' },
                    { to: '/teacher/notifications', icon: Bell, label: 'Messages', badge: unreadCount },
                    { to: '/teacher/profile', icon: Users, label: 'Profile' },
                ];
            case 'student':
                return [
                    { to: '/student', icon: LayoutDashboard, label: 'Home' },
                    { to: '/student/attendance', icon: CalendarCheck, label: 'Attend' },
                    { to: '/student/subjects', icon: BookOpen, label: 'Subjects' },
                    { to: '/student/notifications', icon: Bell, label: 'Messages', badge: unreadCount },
                    { to: '/student/profile', icon: Users, label: 'Profile' },
                ];
            default:
                return [];
        }
    };

    const navItems = getNavItems();

    if (navItems.length === 0) return null;

    return (
        <nav
            className="bg-[#1E1B4B]/95 backdrop-blur-xl border-t border-white/10 flex justify-around items-center px-4 w-full shadow-[0_-8px_30px_rgb(0,0,0,0.12)]"
            style={{
                paddingTop: '0.75rem',
                paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))'
            }}
        >
            {navItems.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    end={['/admin', '/teacher', '/student'].includes(item.to)}
                    className={({ isActive }) => clsx(
                        "flex flex-col items-center gap-1 transition-all duration-300 relative px-2 py-1",
                        isActive ? "text-white" : "text-white/40 hover:text-white/70"
                    )}
                >
                    {({ isActive }) => (
                        <>
                            <div className="relative">
                                <item.icon className={clsx(
                                    "w-6 h-6 transition-all duration-300",
                                    isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" : "scale-100"
                                )} />
                                {item.badge && item.badge > 0 && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#1E1B4B] animate-in zoom-in duration-300">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </div>
                                )}
                            </div>
                            <span className={clsx(
                                "text-[10px] font-black uppercase tracking-widest transition-all duration-300 mt-1",
                                isActive ? "opacity-100 translate-y-0" : "opacity-60 translate-y-0.5"
                            )}>
                                {item.label}
                            </span>
                            {isActive && (
                                <motion.div
                                    layoutId="bottom-nav-indicator"
                                    className="absolute -top-1 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                                />
                            )}
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
};

export default BottomNav;
