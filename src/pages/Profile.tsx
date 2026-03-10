import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Mail, Shield, LogOut, ChevronRight, Bell, RefreshCw, Key, X, Loader2 } from 'lucide-react';
import { notificationService } from '../lib/notifications';
import { toast } from 'sonner';
import { sql } from '../lib/db';
import { authClient } from '../lib/auth-client';
import { motion, AnimatePresence } from 'framer-motion';

const Profile = () => {
    const { profile, clearAuth } = useAuthStore();

    if (!profile) return null;

    const handleLogout = () => {
        clearAuth();
    };

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            toast.error("Password must be at least 8 characters long");
            return;
        }

        setIsChangingPassword(true);
        try {
            if (profile.role === 'student') {
                // Verify current password for student
                const res = await sql`SELECT id FROM students WHERE id = ${profile.id} AND password = ${passwordForm.currentPassword}`;
                if (res.length === 0) {
                    toast.error("Incorrect current password");
                    setIsChangingPassword(false);
                    return;
                }

                // Update password
                await sql`UPDATE students SET password = ${passwordForm.newPassword} WHERE id = ${profile.id}`;
                toast.success("Password changed successfully");
                setIsPasswordModalOpen(false);
            } else {
                // Better Auth password change for other roles
                const { error } = await authClient.changePassword({
                    newPassword: passwordForm.newPassword,
                    currentPassword: passwordForm.currentPassword,
                    revokeOtherSessions: true
                });

                if (error) {
                    toast.error(error.message || "Failed to change password");
                } else {
                    toast.success("Password changed successfully");
                    setIsPasswordModalOpen(false);
                }
            }
        } catch (err: any) {
            console.error('Password change error:', err);
            toast.error("An unexpected error occurred");
        } finally {
            setIsChangingPassword(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }
    };

    return (
        <div className="space-y-6 pb-8">
            <div className="flex flex-col items-center py-8 px-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-white shadow-xl mb-4 text-3xl font-bold text-primary">
                    {profile.full_name?.charAt(0) || 'U'}
                </div>
                <h1 className="text-2xl md:text-4xl font-black text-[#1E1B4B] tracking-tight">{profile.full_name}</h1>
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
                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                            <Key className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">Change Password</p>
                            <p className="text-[10px] text-gray-400 font-medium">Update your account security</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                    </button>
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

            {/* Change Password Modal */}
            <AnimatePresence>
                {isPasswordModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isChangingPassword && setIsPasswordModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
                        >
                            <div className="px-8 py-6 relative flex items-center justify-between overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full -translate-y-16 translate-x-16" />
                                <div className="relative z-10 flex items-center gap-4 text-white">
                                    <div className="p-3 bg-orange-500 rounded-xl shadow-lg shadow-orange-900/10">
                                        <Key className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight">Change Password</h3>
                                        <p className="text-xs font-bold text-slate-400 mt-0.5">Secure your account</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsPasswordModalOpen(false)}
                                    className="relative z-10 p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleChangePassword} className="p-8 space-y-5">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                        placeholder="Enter current password"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all outline-none text-sm font-bold placeholder:text-slate-300"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        placeholder="Minimum 8 characters"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all outline-none text-sm font-bold placeholder:text-slate-300"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        placeholder="Type new password again"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all outline-none text-sm font-bold placeholder:text-slate-300"
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-900/10 hover:bg-orange-700 transition-all text-[11px] disabled:opacity-50"
                                    >
                                        {isChangingPassword ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Key className="w-5 h-5" />
                                        )}
                                        Update Password
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default Profile;
