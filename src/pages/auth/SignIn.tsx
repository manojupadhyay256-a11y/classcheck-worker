import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck,
    GraduationCap,
    UserCheck,
    Users,
    ArrowLeft
} from 'lucide-react';
import { authClient } from '../../lib/auth-client';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { notificationService } from '../../lib/notifications';

const roles = [
    {
        id: 'admin',
        label: 'Admin',
        icon: ShieldCheck,
        color: 'bg-rose-50',
        iconColor: 'text-rose-500',
        borderColor: 'hover:border-rose-200'
    },
    {
        id: 'principal',
        label: 'Principal',
        icon: UserCheck,
        color: 'bg-amber-50',
        iconColor: 'text-amber-500',
        borderColor: 'hover:border-amber-200'
    },
    {
        id: 'teacher',
        label: 'Teacher',
        icon: Users,
        color: 'bg-emerald-50',
        iconColor: 'text-emerald-500',
        borderColor: 'hover:border-emerald-200'
    },
    {
        id: 'student',
        label: 'Student',
        icon: GraduationCap,
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-500',
        borderColor: 'hover:border-indigo-200'
    },
];

const SignIn = () => {
    const navigate = useNavigate();
    const { profile, loading, fetchProfile } = useAuthStore();

    // Auto-login redirect
    useEffect(() => {
        if (!loading && profile) {
            if (profile.role === 'admin' || profile.role === 'principal') {
                navigate('/admin', { replace: true });
            } else if (profile.role === 'teacher') {
                navigate('/teacher', { replace: true });
            } else if (profile.role === 'student') {
                navigate('/student', { replace: true });
            } else {
                navigate('/teacher', { replace: true });
            }
        }
    }, [profile, loading, navigate]);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        console.log('[SignIn] Login attempt started', { selectedRole, email });

        try {
            if (selectedRole === 'student') {
                // Custom logic for student login using admission number
                const admissionNo = email.trim(); // "Email" field is treated as Admission Number
                console.log('[SignIn] Student login with admission number:', admissionNo);

                const results = await sql`
                    SELECT s.*
                    FROM students s
                    WHERE s.admission_no = ${admissionNo} 
                    AND s.password = ${password} 
                    AND s.is_login_enabled = true
                    LIMIT 1
                `;
                console.log('[SignIn] Student query returned', results.length, 'results');

                if (results.length === 0) {
                    setError('Invalid admission number or password. Or login not enabled by class teacher.');
                    setIsLoading(false);
                    return;
                }

                const student = results[0];

                // Create a profile object for the student
                const studentProfile = {
                    id: student.id, // Use the actual student UUID for system-wide consistency
                    full_name: student.student_name,
                    email: `${student.admission_no}@classcheck.com`,
                    role: 'student' as const,
                };

                // Manually update the auth store
                useAuthStore.getState().setStudentProfile(studentProfile);

                // Register FCM Token
                notificationService.registerPushToken(studentProfile.id, 'student');

                toast.success(`Welcome back, ${studentProfile.full_name}!`);

                console.log('[SignIn] Student profile set, navigating to /student');
                navigate('/student');
                return;
            }

            // Normal Better Auth login for other roles
            console.log('[SignIn] Better Auth signIn.email starting...');
            const { error: authError } = await authClient.signIn.email({
                email,
                password,
            });

            if (authError) {
                console.error('[SignIn] Auth error:', authError);
                setError(authError.message || 'Failed to sign in. Please check your credentials.');
                setIsLoading(false);
                return;
            }
            console.log('[SignIn] Better Auth signIn.email success, fetching profile...');

            // Fetch real profile from the database
            await fetchProfile();

            const profile = useAuthStore.getState().profile;
            console.log('[SignIn] Profile after fetchProfile:', { found: !!profile, role: profile?.role });
            if (profile) {
                // Register FCM Token
                notificationService.registerPushToken(profile.id, profile.role as any);

                toast.success(`Welcome back, ${profile.full_name}!`);

                if (profile.role === 'admin' || profile.role === 'principal') {
                    console.log('[SignIn] Navigating to /admin');
                    navigate('/admin');
                } else if (profile.role === 'teacher') {
                    console.log('[SignIn] Navigating to /teacher');
                    navigate('/teacher');
                } else if (profile.role === 'student') {
                    console.log('[SignIn] Navigating to /student');
                    navigate('/student');
                } else {
                    console.log('[SignIn] Unknown role, navigating to /teacher as fallback');
                    navigate('/teacher');
                }
            } else {
                console.warn('[SignIn] Profile not found after fetchProfile — showing error');
                const errorMessage = 'Profile not found. Please contact administrator.';
                setError(errorMessage);
                toast.error(errorMessage);
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error('[SignIn] Unexpected error during login:', err);
            const errorMessage = err.message || 'An unexpected error occurred.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-white font-outfit">
            {/* Left Side - Hero Section */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#121417] p-12 flex-col justify-between relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
                </div>

                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2 shadow-xl shadow-black/20">
                        <img src="/dpsicon.jpg" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold text-white tracking-tight leading-none uppercase">DPSMRN</span>
                        <span className="text-[8px] font-bold text-primary tracking-wider uppercase mt-1.5">Powered by ClassCheck</span>
                    </div>
                </div>

                <div className="relative z-10">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl font-bold text-white leading-tight max-w-lg"
                    >
                        School Management System
                    </motion.h1>
                </div>

                <div className="relative z-10 text-white/40 text-sm">
                    © 2026 ClassCheck. All rights reserved.
                </div>
            </div>

            {/* Right Side - Auth Section */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
                {/* Mobile Header (Only visible on mobile) */}
                <div className="lg:hidden absolute top-0 left-0 right-0 p-4 border-b border-gray-50 bg-white z-20">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-sm border border-gray-100">
                            <img src="/icon.png" alt="ClassCheck" className="w-full h-full object-contain" />
                        </div>
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-sm border border-gray-100">
                            <img src="/dpsicon.jpg" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    <div className="flex flex-col items-center px-2">
                        <div className="flex flex-col items-center mb-1">
                            <span className="text-[16px] font-black text-[#1E1B4B] tracking-tight uppercase text-center leading-none">
                                Delhi Public School
                            </span>
                            <span className="text-[11px] font-bold text-[#1E1B4B]/70 uppercase text-center mt-1.5 leading-tight">
                                Mathura Refinery Nagar Mathura
                            </span>
                        </div>
                        <span className="text-[9px] font-bold text-primary tracking-[0.25em] uppercase opacity-80 mt-2.5 text-center">
                            Powered by ClassCheck
                        </span>
                    </div>
                </div>

                <div className="w-full max-w-md relative z-10 pt-20 lg:-mt-12 lg:pt-0">
                    <AnimatePresence mode="wait">
                        {!selectedRole ? (
                            <motion.div
                                key="role-selection"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="text-center"
                            >
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome</h2>
                                <p className="text-gray-500 mb-6 sm:mb-8">Please select your role to continue</p>

                                <div className="grid grid-cols-2 gap-4">
                                    {roles.map((role) => (
                                        <motion.button
                                            key={role.id}
                                            whileHover={{ y: -4 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setSelectedRole(role.id)}
                                            className={`p-8 flex flex-col items-center justify-center bg-white border border-gray-100 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md ${role.borderColor}`}
                                        >
                                            <div className={`w-16 h-16 ${role.color} rounded-2xl flex items-center justify-center mb-4`}>
                                                <role.icon className={`w-10 h-10 ${role.iconColor}`} />
                                            </div>
                                            <span className="font-bold text-gray-950 text-lg">{role.label}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="login-form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <button
                                    onClick={() => setSelectedRole(null)}
                                    className="flex items-center gap-2 text-gray-500 hover:text-primary mb-8 transition-colors group"
                                >
                                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                    <span>Back to roles</span>
                                </button>

                                <div className="mb-8">
                                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                        Login as {roles.find(r => r.id === selectedRole)?.label}
                                    </h2>
                                    <p className="text-gray-500">Enter your credentials to access your dashboard</p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-6">
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium"
                                        >
                                            {error}
                                        </motion.div>
                                    )}
                                    <Input
                                        label={selectedRole === 'student' ? "Admission Number" : "Email Address"}
                                        type={selectedRole === 'student' ? "text" : "email"}
                                        placeholder={selectedRole === 'student' ? "Enter Admission No" : "name@school.com"}
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        icon={<ShieldCheck className="w-5 h-5" />}
                                    />
                                    <div className="space-y-1">
                                        <Input
                                            label="Password"
                                            type="password"
                                            placeholder="••••••••"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <div className="text-right">
                                            <button type="button" className="text-sm font-medium text-primary hover:underline">
                                                Forgot password?
                                            </button>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full py-4 text-base shadow-lg shadow-primary/20"
                                        isLoading={isLoading}
                                    >
                                        Sign In
                                    </Button>

                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default SignIn;
