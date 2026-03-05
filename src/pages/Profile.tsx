import { useAuthStore } from '../stores/authStore';
import { Mail, Shield, LogOut, ChevronRight, Bell, RefreshCw } from 'lucide-react';
import { notificationService } from '../lib/notifications';
import { toast } from 'sonner';

const Profile = () => {
    const { profile, clearAuth } = useAuthStore();

    if (!profile) return null;

    const handleLogout = () => {
        clearAuth();
    };

    return (
        <div className="space-y-6 pb-8">
            <div className="flex flex-col items-center py-8 px-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-white shadow-xl mb-4 text-3xl font-bold text-primary">
                    {profile.full_name?.charAt(0) || 'U'}
                </div>
                <h1 className="text-2xl font-bold text-[#1E1B4B]">{profile.full_name}</h1>
                <div className="mt-2 px-4 py-1.5 bg-primary/5 text-primary rounded-full text-sm font-bold uppercase tracking-wider border border-primary/10">
                    {profile.role}
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 uppercase text-[10px] font-bold tracking-widest text-gray-400 bg-gray-50/30">
                    Account Details
                </div>
                <div className="divide-y divide-gray-50">
                    <div className="flex items-center gap-4 p-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Email Address</p>
                            <p className="text-sm font-semibold text-[#1E1B4B] truncate">{profile.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Access Level</p>
                            <p className="text-sm font-semibold text-[#1E1B4B] capitalize">{profile.role}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 uppercase text-[10px] font-bold tracking-widest text-gray-400 bg-gray-50/30">
                    Notifications
                </div>
                <button
                    onClick={() => {
                        if (profile?.id) {
                            const promise = notificationService.registerPushToken(profile.id, profile.role as any);
                            toast.promise(promise, {
                                loading: 'Refreshing notification token...',
                                success: 'Notifications synchronized successfully!',
                                error: 'Failed to synchronize notifications.'
                            });
                        }
                    }}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors group"
                >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:rotate-12 transition-transform">
                        <Bell className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">Push Notifications</p>
                        <p className="text-[10px] text-gray-400 font-medium">Update token for this device</p>
                    </div>
                    <RefreshCw className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-red-50 transition-colors group"
                >
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                        <LogOut className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-red-600">Sign Out</p>
                        <p className="text-[10px] text-red-400 font-medium">Log out of your session</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-red-200" />
                </button>
            </div>
        </div >
    );
};

export default Profile;
