import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Menu, Bell } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface MobileHeaderProps {
    onMenuClick: () => void;
}

const MobileHeader = ({ onMenuClick }: MobileHeaderProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { profile } = useAuthStore();
    const { unreadCount } = useNotificationStore();
    const { settings } = useSettingsStore();

    const isDashboard = ['/admin', '/teacher', '/student'].includes(location.pathname);

    return (
        <header
            className="md:hidden bg-white text-slate-900 px-3 flex items-center justify-between sticky top-0 z-60"
            style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.5rem' }}
        >
            <div className="flex items-center gap-2">
                <button
                    onClick={onMenuClick}
                    className="p-2 active:bg-slate-100 rounded-xl transition-colors"
                >
                    <Menu className="w-5 h-5 text-slate-500" />
                </button>

                {!isDashboard && (
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1 px-2.5 py-1.5 active:bg-slate-100 rounded-lg transition-colors text-xs font-bold text-slate-500"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                    </button>
                )}
            </div>

            {/* Center branding */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                <img src="/dpsicon.jpg" alt="" className="w-6 h-6 rounded-lg object-contain" />
                <span className="text-sm font-black text-slate-800 tracking-tight uppercase">
                    {settings?.school_name?.split(' ').map((w: string) => w[0]).join('').slice(0, 6) || 'DPSMRN'}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => navigate(`/${profile?.role || 'student'}/notifications`)}
                    className="p-2 active:bg-slate-100 rounded-xl transition-colors relative"
                >
                    <Bell className="w-5 h-5 text-slate-500" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => navigate(`/${profile?.role || 'student'}/profile`)}
                    className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm active:scale-95 transition-transform"
                >
                    {profile?.full_name?.charAt(0) || 'U'}
                </button>
            </div>
        </header>
    );
};

export default MobileHeader;
