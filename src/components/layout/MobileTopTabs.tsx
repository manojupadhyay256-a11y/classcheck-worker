import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const MobileTopTabs = () => {
    const { profile } = useAuthStore();
    const role = profile?.role;

    const getNavItems = () => {
        switch (role) {
            case 'admin':
                return [
                    { to: '/admin', label: 'Explore' },
                    { to: '/admin/teachers', label: 'Teachers' },
                    { to: '/admin/students', label: 'Students' },
                    { to: '/admin/log-book', label: 'Logs' },
                    { to: '/admin/settings', label: 'Settings' },
                ];
            case 'teacher':
                return [
                    { to: '/teacher', label: 'Explore' },
                    { to: '/teacher/attendance', label: 'Attend' },
                    { to: '/teacher/my-subjects', label: 'Subjects' },
                    { to: '/teacher/homework', label: 'Homework' },
                    { to: '/teacher/notifications', label: 'Inbox' },
                ];
            case 'student':
                return [
                    { to: '/student', label: 'Explore' },
                    { to: '/student/classwork', label: 'Tasks' },
                    { to: '/student/subjects', label: 'Subjects' },
                    { to: '/student/homework', label: 'HW' },
                    { to: '/student/notifications', label: 'Inbox' },
                ];
            default:
                return [];
        }
    };

    const navItems = getNavItems();

    if (navItems.length === 0) return null;

    return (
        <div className="md:hidden bg-white/80 backdrop-blur-md sticky top-[calc(3.5rem + env(safe-area-inset-top, 0px))] z-50 border-b border-slate-100 overflow-x-auto custom-scrollbar">
            <nav className="flex items-center px-4 min-w-max">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={['/admin', '/teacher', '/student'].includes(item.to)}
                        className={({ isActive }) => clsx(
                            "relative px-4 py-3 text-sm font-bold transition-all duration-300",
                            isActive ? "text-slate-900" : "text-slate-400"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <span className="relative z-10">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="top-tab-indicator"
                                        className="absolute bottom-0 left-2 right-2 h-1 bg-primary rounded-t-full shadow-[0_0_8px_rgba(217,119,6,0.2)]"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};

export default MobileTopTabs;
