import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Settings as SettingsIcon,
    Lock,
    CheckCircle2,
    AlertCircle,
    Building2,
    Calendar,
    ToggleLeft as Toggle
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { authClient } from '../../lib/auth-client';
import { clsx } from 'clsx';

const Settings = () => {
    const { profile } = useAuthStore();
    const { settings, fetchSettings, updateSettings } = useSettingsStore();

    const [activeTab, setActiveTab] = useState<'profile' | 'system'>('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Profile Form State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // System Form State
    const [systemData, setSystemData] = useState({
        school_name: '',
        academic_year: '',
        five_day_week: false
    });

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    useEffect(() => {
        if (settings) {
            setSystemData({
                school_name: settings.school_name,
                academic_year: settings.academic_year,
                five_day_week: settings.five_day_week
            });
        }
    }, [settings]);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        setIsSaving(true);
        setMessage(null);

        try {
            const { error } = await authClient.changePassword({
                newPassword: passwordData.newPassword,
                currentPassword: passwordData.currentPassword,
                revokeOtherSessions: true
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Password updated successfully' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update password' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSystemSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        try {
            await updateSettings(systemData);
            setMessage({ type: 'success', text: 'System settings updated successfully' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update settings' });
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'system', label: 'System', icon: SettingsIcon },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-[#1E1B4B] mb-2">Settings</h1>
                <p className="text-gray-500">Manage your account and school configuration.</p>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200",
                            activeTab === tab.id
                                ? "bg-white text-primary shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Notification Message */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={clsx(
                            "p-4 rounded-2xl flex items-center gap-3 border shadow-sm",
                            message.type === 'success'
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                : "bg-rose-50 border-rose-100 text-rose-700"
                        )}
                    >
                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <p className="font-semibold text-sm">{message.text}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-8">
                {activeTab === 'profile' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-8"
                    >
                        {/* Personal Info - Read Only */}
                        <section className="bg-white p-8 rounded-[32px] border border-gray-100 soft-shadow">
                            <h2 className="text-xl font-bold text-[#1E1B4B] mb-6 flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                Personal Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl font-semibold text-[#1E1B4B]">
                                        {profile?.full_name}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl font-semibold text-[#1E1B4B]">
                                        {profile?.email}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Change Password */}
                        <section className="bg-white p-8 rounded-[32px] border border-gray-100 soft-shadow">
                            <h2 className="text-xl font-bold text-[#1E1B4B] mb-6 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-primary" />
                                Change Password
                            </h2>
                            <form onSubmit={handlePasswordChange} className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Current Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">New Password</label>
                                        <input
                                            type="password"
                                            required
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Confirm New Password</label>
                                        <input
                                            type="password"
                                            required
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        </section>
                    </motion.div>
                )}

                {activeTab === 'system' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <section className="bg-white p-8 rounded-[32px] border border-gray-100 soft-shadow">
                            <h2 className="text-xl font-bold text-[#1E1B4B] mb-6 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-primary" />
                                School Information
                            </h2>
                            <form onSubmit={handleSystemSave} className="space-y-8">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">School Name</label>
                                    <div className="relative group">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            required
                                            value={systemData.school_name}
                                            onChange={(e) => setSystemData({ ...systemData, school_name: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-semibold text-[#1E1B4B]"
                                            placeholder="Enter school name"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Academic Year</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                            <input
                                                type="text"
                                                required
                                                value={systemData.academic_year}
                                                onChange={(e) => setSystemData({ ...systemData, academic_year: e.target.value })}
                                                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-semibold text-[#1E1B4B]"
                                                placeholder="e.g. 2026-27"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 flex flex-col justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setSystemData({ ...systemData, five_day_week: !systemData.five_day_week })}
                                            className={clsx(
                                                "flex items-center justify-between p-4 rounded-2xl border transition-all h-[58px]",
                                                systemData.five_day_week
                                                    ? "bg-primary/5 border-primary text-primary"
                                                    : "bg-gray-50 border-gray-100 text-gray-400"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Toggle className={clsx("w-6 h-6", systemData.five_day_week && "rotate-180")} />
                                                <span className="text-sm font-bold uppercase tracking-wider">5-Day Week</span>
                                            </div>
                                            {systemData.five_day_week && <span className="text-[10px] font-bold">ACTIVE</span>}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving Changes...' : 'Save System Settings'}
                                </button>
                            </form>
                        </section>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Settings;
