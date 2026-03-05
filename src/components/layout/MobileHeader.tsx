import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Menu, Bell } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';

interface MobileHeaderProps {
    onMenuClick: () => void;
}

const MobileHeader = ({ onMenuClick }: MobileHeaderProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { profile } = useAuthStore();
    const { unreadCount } = useNotificationStore();

    // Hide back button on main dashboard pages
    const isDashboard = ['/admin', '/teacher', '/student'].includes(location.pathname);

    return (
        <header
            className="md:hidden bg-[#1E1B4B] text-white px-4 flex items-center justify-between sticky top-0 z-60 shadow-lg"
            style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.75rem' }}
        >
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>

                {!isDashboard && (
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-bold"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate(`/${profile?.role || 'student'}/notifications`)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors relative"
                >
                    <Bell className="w-5 h-5 text-white" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-[#1E1B4B] animate-in zoom-in duration-300">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => navigate(`/${profile?.role || 'student'}/profile`)}
                    className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-inner hover:scale-105 active:scale-95 transition-transform"
                >
                    {profile?.full_name?.charAt(0) || 'U'}
                </button>
            </div>
        </header>
    );
};

export default MobileHeader;
