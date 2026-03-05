import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    BarChart3,
    LogOut,
    CalendarCheck,
    Settings as SettingsIcon,
    HelpCircle,
    Fingerprint,
    ListChecks,
    Sparkles,
    X,
    Bell
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useEffect } from 'react';
import { clsx } from 'clsx';

interface SidebarProps {
    onClose?: () => void;
}

const Sidebar = ({ onClose }: SidebarProps) => {
    const { profile, clearAuth } = useAuthStore();
    const { settings, fetchSettings } = useSettingsStore();
    const { unreadCount } = useNotificationStore();
    const isAdmin = profile?.role === 'admin';

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const adminLinks = [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/teachers', icon: Users, label: 'Teachers' },
        { to: '/admin/classes', icon: BookOpen, label: 'Classes' },
        { to: '/admin/subject-assignments', icon: BookOpen, label: 'Class Assignment' },
        { to: '/admin/students', icon: Users, label: 'Students' },
        { to: '/admin/log-book', icon: ListChecks, label: 'Log Book' },
        { to: '/admin/syllabus', icon: BookOpen, label: 'Syllabus Status' },
        { to: '/admin/reports/attendance', icon: BarChart3, label: 'Attendance Report' },
        { to: '/admin/profile', icon: Users, label: 'Profile' },
        { to: '/admin/notifications', icon: ListChecks, label: 'Notifications' },
    ];

    const systemLinks = [
        { to: '/admin/bulk-import', icon: CalendarCheck, label: 'Bulk Import' },
        { to: '/admin/settings', icon: SettingsIcon, label: 'Settings' },
        { to: '/admin/teacher-logins', icon: Fingerprint, label: 'Teacher Logins' },
        { icon: HelpCircle, label: 'Help & Guide', onClick: () => alert('Coming Soon') },
    ];

    const teacherLinks = [
        { to: '/teacher', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/teacher/my-subjects', icon: BookOpen, label: 'My Subjects' },
        { to: '/teacher/attendance', icon: CalendarCheck, label: 'Attendance' },
        { to: '/teacher/students', icon: Users, label: 'Students' },
        { to: '/teacher/log-book', icon: ListChecks, label: 'Log Book' },
        { to: '/teacher/reports', icon: BarChart3, label: 'Reports' },
        { to: '/teacher/profile', icon: Users, label: 'Profile' },
        { to: '/teacher/notifications', icon: Bell, label: 'Notifications' },
    ];

    const studentLinks = [
        { to: '/student', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/student/diary', icon: Sparkles, label: 'Daily Diary' },
        { to: '/student/attendance', icon: CalendarCheck, label: 'Attendance' },
        { to: '/student/subjects', icon: BookOpen, label: 'My Subjects' },
        { to: '/student/profile', icon: Users, label: 'Profile' },
        { to: '/student/notifications', icon: Bell, label: 'Notifications' },
    ];

    const handleLogout = () => {
        clearAuth();
    };

    return (
        <div
            className="w-full h-screen bg-white flex flex-col pt-8 pb-8 border-r border-[#F1F5F9]"
            style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))' }}
        >
            {/* Header */}
            <div className="px-6 md:px-8 mb-6 md:mb-10 flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 border border-[#F1F5F9] p-2 shrink-0">
                        <img src="/dpsicon.jpg" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-lg md:text-xl font-black text-[#1E1B4B] tracking-tight leading-none uppercase truncate">
                            {settings?.school_name?.split(' ').map(w => w[0]).join('').slice(0, 6) || 'DPSMRN'}
                        </span>
                        <span className="text-[9px] md:text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mt-1 md:mt-1.5 self-start opacity-70 whitespace-nowrap">
                            {profile?.role === 'admin' ? 'ADMIN PORTAL' : profile?.role === 'teacher' ? 'TEACHER PORTAL' : 'STUDENT PORTAL'}
                        </span>
                        <span className="text-[7px] md:text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-1.5 opacity-50">
                            Powered by ClassCheck
                        </span>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-100 rounded-xl shrink-0 ml-2">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
                <div>
                    <p className="px-4 text-[10px] uppercase font-black tracking-widest text-[#94A3B8] mb-4">Core Modules</p>
                    <div className="space-y-1">
                        {(profile?.role === 'admin' ? adminLinks : profile?.role === 'student' ? studentLinks : teacherLinks).map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={link.to === '/admin' || link.to === '/teacher' || link.to === '/student'}
                                onClick={onClose}
                                className={({ isActive }) => clsx(
                                    "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group",
                                    isActive
                                        ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200"
                                        : "text-[#64748B] hover:bg-indigo-50 hover:text-indigo-700"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <link.icon className={clsx(
                                            "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                                            isActive ? "text-white" : "text-[#94A3B8] group-hover:text-indigo-600"
                                        )} />
                                        <span className="font-bold text-[15px] tracking-tight">{link.label}</span>
                                        {isActive && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        )}
                                        {!isActive && link.to.endsWith('/notifications') && unreadCount > 0 && (
                                            <div className="ml-auto min-w-[20px] h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white group-hover:border-indigo-50 transition-colors">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </div>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </div>

                {isAdmin && (
                    <div>
                        <p className="px-4 text-[10px] uppercase font-black tracking-widest text-[#94A3B8] mb-4">System Settings</p>
                        <div className="space-y-1">
                            {systemLinks.map((link) => (
                                link.to ? (
                                    <NavLink
                                        key={link.to}
                                        to={link.to}
                                        onClick={onClose}
                                        className={({ isActive }) => clsx(
                                            "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group",
                                            isActive
                                                ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200"
                                                : "text-[#64748B] hover:bg-indigo-50 hover:text-indigo-700"
                                        )}
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <link.icon className={clsx(
                                                    "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                                                    isActive ? "text-white" : "text-[#94A3B8] group-hover:text-indigo-600"
                                                )} />
                                                <span className="font-bold text-[15px] tracking-tight">{link.label}</span>
                                                {isActive && (
                                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                )}
                                            </>
                                        )}
                                    </NavLink>
                                ) : (
                                    <button
                                        key={link.label}
                                        onClick={link.onClick}
                                        className="flex items-center gap-3.5 px-4 py-3.5 w-full text-left text-[#64748B] hover:bg-indigo-50 hover:text-indigo-700 rounded-2xl transition-all duration-300 group"
                                    >
                                        <link.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 text-[#94A3B8] group-hover:text-indigo-600" />
                                        <span className="font-bold text-[15px] tracking-tight">{link.label}</span>
                                    </button>
                                )
                            ))}
                        </div>
                    </div>
                )}
            </nav>

            {/* Profile & Logout */}
            <div className="px-4 mt-auto space-y-3">
                <div className="p-1 bg-indigo-50/50 rounded-[28px] border border-indigo-100/50">
                    <div className="px-4 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <span className="text-white font-black text-lg">{profile?.full_name?.charAt(0) || 'U'}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[15px] font-black text-[#1E1B4B] truncate tracking-tight">{profile?.full_name || 'User'}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600/60 leading-none mt-1">
                                {profile?.role || 'Guest'}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-6 py-4 w-full text-left text-[#94A3B8] hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all duration-300 group font-bold"
                >
                    <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>Sign Out</span>
                </button>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #E2E8F0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #CBD5E1;
                }
            ` }} />
        </div>
    );
};

export default Sidebar;
