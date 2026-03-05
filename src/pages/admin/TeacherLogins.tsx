import { useState, useEffect } from 'react';
import {
    Fingerprint,
    Search,
    UserPlus,
    ShieldCheck,
    ShieldAlert,
    Loader2,
    RefreshCw,
    MoreVertical,
    Mail,
    Key,
    Eye,
    EyeOff
} from 'lucide-react';
import Button from '../../components/common/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { sql } from '../../lib/db';
import { authClient } from '../../lib/auth-client';
import { toast } from 'sonner';

const TeacherLogins = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customPassword, setCustomPassword] = useState('dps@12345');
    const [showPassword, setShowPassword] = useState(false);

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const result = await sql`
                SELECT 
                    t.id as teacher_id,
                    t.name,
                    t.email,
                    p.id as profile_id,
                    p.role
                FROM teachers t
                LEFT JOIN profiles p ON LOWER(t.email) = LOWER(p.email)
                ORDER BY t.name ASC
            `;
            setData(result);
        } catch (err) {
            console.error('Error fetching teacher login data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredData = data.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleOpenCreateModal = (teacher: any) => {
        setSelectedTeacher(teacher);
        setError(null);
        setCustomPassword('dps@12345');
        setShowPassword(false);
        setIsCreateModalOpen(true);
    };

    const handleCreateLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeacher?.email) {
            toast.error('Teacher must have an email address to create a login.');
            return;
        }

        if (customPassword.length < 8) {
            toast.error('Password must be at least 8 characters long.');
            return;
        }

        setIsCreating(true);
        setError(null);

        const promise = (async () => {
            // 1. Create auth account
            const { data: authData, error: authError } = await authClient.signUp.email({
                email: selectedTeacher.email,
                password: customPassword,
                name: selectedTeacher.name,
            });

            let userId = authData?.user?.id;

            if (authError) {
                // Handle case where user already exists in neon_auth but missing profile
                if (authError.message?.toLowerCase().includes('already exists')) {
                    const existingUsers = await sql`SELECT id FROM neon_auth."user" WHERE email = ${selectedTeacher.email}`;
                    if (existingUsers.length > 0) {
                        userId = existingUsers[0].id;
                    } else {
                        throw new Error(authError.message);
                    }
                } else {
                    throw new Error(authError.message || 'Failed to create authentication account.');
                }
            }

            if (!userId) {
                throw new Error('Could not determine authentication user ID.');
            }

            // 2. Create or sync profile
            await sql`
                INSERT INTO public.profiles (id, full_name, email, role)
                VALUES (${userId}, ${selectedTeacher.name}, ${selectedTeacher.email}, 'teacher')
                ON CONFLICT (email) DO UPDATE SET 
                    id = EXCLUDED.id,
                    role = 'teacher'
            `;

            await fetchData(true);
            setIsCreateModalOpen(false);
        })();

        toast.promise(promise, {
            loading: 'Creating teacher access...',
            success: `Login created successfully for ${selectedTeacher.name}!`,
            error: (err: any) => err.message || 'Failed to create teacher login.'
        });

        try {
            await promise;
        } catch (err: any) {
            console.error('Error creating teacher login:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-inter">
            {/* SaaS Header */}
            <div className="bg-saas-dark text-white">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-saas-accent/10 rounded-2xl border border-saas-accent/20">
                                <Key className="w-8 h-8 text-saas-accent" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight mb-1">Teacher Logins</h1>
                                <p className="text-slate-400 text-sm">Manage system access and authentication for teaching staff.</p>
                            </div>
                        </div>

                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search teacher by name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-saas-accent/40 transition-all search-inset"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Stats Placeholder */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-6">
                <div className="bg-white rounded-2xl saas-shadow border border-saas-border p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                            <Fingerprint className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500">Access Overview</p>
                            <h2 className="text-2xl font-bold text-saas-dark leading-tight">
                                {data.filter(t => t.profile_id).length} / {data.length} Logins
                            </h2>
                        </div>
                    </div>
                    {refreshing && (
                        <div className="flex items-center gap-2 text-saas-accent text-xs font-semibold animate-pulse">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Refreshing...
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10">
                <div className="bg-white rounded-2xl saas-shadow border border-saas-border overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <Loader2 className="w-10 h-10 text-saas-accent animate-spin" strokeWidth={3} />
                            <p className="text-slate-400 font-semibold tracking-wide uppercase text-[11px]">Loading accounts...</p>
                        </div>
                    ) : filteredData.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-saas-border">
                                        <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Teacher Name</th>
                                        <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Email Identity</th>
                                        <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">System Status</th>
                                        <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-saas-border">
                                    <AnimatePresence>
                                        {filteredData.map((item, index) => (
                                            <motion.tr
                                                key={item.teacher_id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.02 }}
                                                className="group hover:bg-slate-50/50 transition-colors"
                                            >
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${item.profile_id ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                                            {item.name.charAt(0)}
                                                        </div>
                                                        <span className="font-semibold text-saas-dark text-[15px]">{item.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
                                                        <Mail className="w-3.5 h-3.5 opacity-40" />
                                                        {item.email || '—'}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    {item.profile_id ? (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100/50">
                                                            <ShieldCheck className="w-4 h-4" />
                                                            <span className="text-[11px] font-bold uppercase tracking-wide">Account Active</span>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-lg border border-slate-100">
                                                            <ShieldAlert className="w-4 h-4" />
                                                            <span className="text-[11px] font-bold uppercase tracking-wide">No Login Found</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    {!item.profile_id ? (
                                                        <button
                                                            onClick={() => handleOpenCreateModal(item)}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md"
                                                        >
                                                            <UserPlus className="w-4 h-4" />
                                                            Create Access
                                                        </button>
                                                    ) : (
                                                        <button className="p-2 text-slate-300 hover:text-slate-400 cursor-not-allowed">
                                                            <MoreVertical className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-32 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Fingerprint className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-saas-dark">No teachers found</h3>
                            <p className="text-slate-400 mt-2 text-sm">Check your teacher directory or try another search.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Login Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isCreating && setIsCreateModalOpen(false)}
                            className="absolute inset-0 bg-saas-dark/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-[32px] p-8 md:p-10 max-w-md w-full shadow-2xl overflow-hidden text-center"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />

                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck className="w-8 h-8 text-indigo-600" />
                            </div>

                            <h3 className="text-2xl font-black text-saas-dark mb-2">Create Teacher Login</h3>
                            <p className="text-slate-400 text-sm font-medium mb-8">
                                You are creating a login for <span className="text-indigo-600 font-bold">{selectedTeacher?.name}</span>.
                            </p>

                            <div className="space-y-4 mb-8">
                                <div className="text-left space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Identity</label>
                                    <div className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 font-medium text-sm">
                                        {selectedTeacher?.email || 'N/A'}
                                    </div>
                                </div>
                                <div className="text-left space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Default Password</label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={customPassword}
                                            onChange={(e) => setCustomPassword(e.target.value)}
                                            className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-indigo-600 font-bold text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="Set password (min. 8 chars)..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 pl-1 italic">* You can customize this or use the default.</p>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl mb-6 flex items-center gap-2 text-left">
                                    <div className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-pulse shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-4">
                                <Button
                                    variant="secondary"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    disabled={isCreating}
                                    className="flex-1 rounded-2xl"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateLogin}
                                    isLoading={isCreating}
                                    className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Proceed
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherLogins;
