import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Users as UsersIcon,
    Loader2,
    LayoutGrid,
    RefreshCw
} from 'lucide-react';
import Button from '../../components/common/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { sql } from '../../lib/db';

const Teachers = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // CRUD States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '' });

    const fetchTeachers = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const data = await sql`
                SELECT 
                    t.id, 
                    t.name,
                    t.email,
                    t.created_at,
                    COALESCE(
                        ARRAY_AGG(DISTINCT ct_class.name) FILTER (WHERE ct_class.name IS NOT NULL),
                        ARRAY[]::text[]
                    ) as homeroom_classes,
                    COALESCE(
                        ARRAY_AGG(DISTINCT cs_class.name) FILTER (WHERE cs_class.name IS NOT NULL),
                        ARRAY[]::text[]
                    ) as teaching_classes,
                    COALESCE(
                        ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL),
                        ARRAY[]::text[]
                    ) as subjects
                FROM teachers t
                LEFT JOIN classes ct_class ON t.id = ct_class.class_teacher_id
                LEFT JOIN class_subjects cs ON t.id = cs.teacher_id
                LEFT JOIN classes cs_class ON cs.class_id = cs_class.id
                LEFT JOIN subjects s ON cs.subject_id = s.id
                GROUP BY t.id, t.name, t.email, t.created_at
                ORDER BY t.name ASC
            `;
            setTeachers(data);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTeachers();
    }, []);

    const filteredTeachers = teachers.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleOpenModal = (teacher?: any) => {
        if (teacher) {
            setEditingTeacher(teacher);
            setFormData({ name: teacher.name, email: teacher.email || '' });
        } else {
            setEditingTeacher(null);
            setFormData({ name: '', email: '' });
        }
        setError(null);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsSaving(true);
        setError(null);

        const savePromise = (async () => {
            if (editingTeacher) {
                await sql`
                    UPDATE teachers 
                    SET name = ${formData.name.trim()}, 
                        email = ${formData.email.trim() || null} 
                    WHERE id = ${editingTeacher.id}
                `;
            } else {
                await sql`
                    INSERT INTO teachers (name, email)
                    VALUES (${formData.name}, ${formData.email || null})
                `;
            }
            await fetchTeachers(true);
            setIsModalOpen(false);
        })();

        toast.promise(savePromise, {
            loading: editingTeacher ? 'Updating teacher record...' : 'Creating teacher record...',
            success: editingTeacher ? 'Teacher record updated successfully!' : 'New teacher record created successfully!',
            error: (err: any) => err?.message || 'Failed to save teacher. A teacher with this name might already exist.'
        });

        try {
            await savePromise;
        } catch (err: any) {
            console.error('Error saving teacher:', err);
            setError(err.message || 'Failed to save teacher');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This will also remove all subject assignments for this teacher.`)) return;

        try {
            // Nullify class teacher assignments first (to avoid FK issues)
            await sql`UPDATE classes SET class_teacher_id = NULL WHERE class_teacher_id = ${id}`;
            // Delete from teachers table (class_subjects has ON DELETE CASCADE)
            await sql`DELETE FROM teachers WHERE id = ${id}`;
            await fetchTeachers(true);
            toast.success(`${name} has been removed from the directory.`);
        } catch (error) {
            console.error('Error deleting teacher:', error);
            toast.error('Failed to delete teacher. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-inter">
            {/* SaaS Header */}
            <div className="bg-saas-dark text-white">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 sm:py-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-10">
                        <div className="flex items-center gap-4 sm:gap-5">
                            <div className="p-3.5 sm:p-4 bg-saas-accent/10 rounded-2xl border border-saas-accent/20 shrink-0">
                                <UsersIcon className="w-7 h-7 sm:w-8 sm:h-8 text-saas-accent" strokeWidth={2.5} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-1 truncate">Teacher Directory</h1>
                                <p className="text-slate-400 text-[13px] sm:text-sm font-medium">Manage staff profiles and teaching assignments.</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full md:w-auto">
                            <div className="relative flex-1 sm:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-white/5 border border-white/10 rounded-xl text-[13px] sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-saas-accent/40 transition-all search-inset"
                                />
                            </div>
                            <Button
                                onClick={() => handleOpenModal()}
                                className="bg-saas-accent hover:bg-saas-accent-hover text-white shadow-xl shadow-saas-accent/20 px-6 py-3 sm:py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
                            >
                                <Plus className="w-5 h-5" strokeWidth={3} />
                                <span className="font-bold">Add Teacher</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 -mt-6">
                <div className="bg-white rounded-2xl saas-shadow border border-saas-border p-4 sm:p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                            <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                        </div>
                        <div>
                            <p className="text-[11px] sm:text-sm font-semibold text-slate-500 uppercase tracking-tight">Total Educators</p>
                            <h2 className="text-xl sm:text-2xl font-bold text-saas-dark leading-tight">{teachers.length}</h2>
                        </div>
                    </div>
                    {refreshing && (
                        <div className="flex items-center gap-2 text-saas-accent text-[10px] sm:text-xs font-semibold animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                            Updating...
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 mt-6 sm:mt-10">
                {loading ? (
                    <div className="bg-white rounded-2xl saas-shadow border border-saas-border flex flex-col items-center justify-center py-20 sm:py-32 gap-4">
                        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-saas-accent animate-spin" strokeWidth={3} />
                        <p className="text-slate-400 font-semibold tracking-wide uppercase text-[10px] sm:text-[11px]">Syncing Directory...</p>
                    </div>
                ) : filteredTeachers.length > 0 ? (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-white rounded-2xl saas-shadow border border-saas-border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-saas-border">
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-16">#</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Educator Info</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Academic Focus</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-saas-border">
                                        <AnimatePresence mode="popLayout">
                                            {filteredTeachers.map((teacher, index) => (
                                                <motion.tr
                                                    key={teacher.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ delay: index * 0.03 }}
                                                    className="group hover:bg-slate-50/50 transition-colors duration-200"
                                                >
                                                    <td className="px-8 py-6">
                                                        <span className="text-slate-300 font-mono text-sm">{index + 1}</span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-saas-accent/5 border border-saas-accent/10 flex items-center justify-center text-saas-accent font-bold text-lg">
                                                                {teacher.name.charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-saas-dark text-[15px]">{teacher.name}</span>
                                                                <span className="text-xs text-slate-400 font-mono mt-0.5">{teacher.email || 'No email set'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col gap-2">
                                                            {teacher.homeroom_classes?.length > 0 && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded leading-none">CT</span>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {teacher.homeroom_classes.map((cls: string) => (
                                                                            <span key={cls} className="text-[11px] font-semibold text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded-lg border border-amber-200/50">{cls}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {teacher.subjects?.length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {teacher.subjects.map((subj: string) => (
                                                                        <span key={subj} className="text-[11px] font-semibold text-saas-accent bg-saas-accent/5 px-2 py-0.5 rounded-lg border border-saas-accent/10 uppercase tracking-tight">{subj}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {teacher.teaching_classes?.length > 0 && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">In:</span>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {teacher.teaching_classes.map((cls: string) => (
                                                                            <span key={cls} className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{cls}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {(!teacher.homeroom_classes?.length && !teacher.subjects?.length) && (
                                                                <span className="text-slate-300 italic text-[13px] font-medium">Unassigned Profile</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleOpenModal(teacher)}
                                                                className="p-2.5 text-slate-400 hover:text-saas-accent hover:bg-saas-accent/5 rounded-xl transition-all duration-200 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center border border-transparent hover:border-saas-accent/10"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(teacher.id, teacher.name)}
                                                                className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-200 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center border border-transparent hover:border-rose-100"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                            <AnimatePresence mode="popLayout">
                                {filteredTeachers.map((teacher, index) => (
                                    <motion.div
                                        key={teacher.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-white rounded-2xl p-5 saas-shadow border border-saas-border"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-saas-accent/10 flex items-center justify-center text-saas-accent font-bold">
                                                    {teacher.name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-saas-dark text-[15px] leading-tight truncate">{teacher.name}</span>
                                                    <span className="text-[11px] text-slate-400 font-medium truncate">{teacher.email || 'No email set'}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleOpenModal(teacher)}
                                                    className="p-2 text-slate-400 hover:text-saas-accent hover:bg-saas-accent/5 rounded-lg active:scale-95 transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(teacher.id, teacher.name)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg active:scale-95 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-3 border-t border-slate-50">
                                            {teacher.homeroom_classes?.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">CLASS TEACHER</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {teacher.homeroom_classes.map((cls: string) => (
                                                            <span key={cls} className="text-[10px] font-bold text-amber-700">{cls}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {teacher.subjects?.length > 0 && (
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Assigned Subjects</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {teacher.subjects.map((subj: string) => (
                                                            <span key={subj} className="text-[10px] font-bold text-saas-accent bg-saas-accent/5 px-2.5 py-1 rounded-lg border border-saas-accent/10">{subj}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {(!teacher.homeroom_classes?.length && !teacher.subjects?.length) && (
                                                <p className="text-[11px] text-slate-400 italic font-medium">No assignments yet</p>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-2xl saas-shadow border border-saas-border flex flex-col items-center justify-center py-20 text-center p-6">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                            <UsersIcon className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-saas-dark">No Educators Found</h3>
                        <p className="text-slate-400 mt-2 max-w-xs text-[13px] font-medium leading-relaxed">Adjust your search or add a new educator to your academic roster.</p>
                        <Button onClick={() => handleOpenModal()} className="mt-8 bg-saas-accent shadow-none px-6 py-3 rounded-xl">
                            <Plus className="w-5 h-5 mr-2" />
                            Add Teacher
                        </Button>
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-saas-dark/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-[32px] p-8 md:p-10 max-w-md w-full shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-saas-accent" />
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="w-16 h-16 bg-saas-accent/10 rounded-2xl flex items-center justify-center">
                                    <UsersIcon className="w-8 h-8 text-saas-accent" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-saas-dark">
                                        {editingTeacher ? 'Edit Educator' : 'Add Educator'}
                                    </h3>
                                    <p className="text-slate-400 text-sm font-medium">
                                        {editingTeacher ? `Update details for ${editingTeacher.name}` : 'Create a new teacher record'}
                                    </p>
                                </div>

                                <form onSubmit={handleSave} className="w-full space-y-4">
                                    <div className="text-left space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-saas-dark focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all outline-none"
                                            placeholder="e.g. Dr. Bhanu Prakash Sharma"
                                        />
                                    </div>
                                    <div className="text-left space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Email (Optional)</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-saas-dark focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all outline-none"
                                            placeholder="bhanu@class.com"
                                        />
                                    </div>

                                    {error && (
                                        <p className="text-rose-500 text-xs font-semibold bg-rose-50 p-3 rounded-xl border border-rose-100 italic">
                                            {error}
                                        </p>
                                    )}

                                    <div className="pt-4 flex gap-4">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="flex-1 rounded-2xl"
                                            onClick={() => setIsModalOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isSaving}
                                            className="flex-1 rounded-2xl bg-saas-accent hover:bg-saas-accent-hover"
                                        >
                                            {isSaving ? (
                                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                            ) : (
                                                editingTeacher ? 'Update Record' : 'Create Record'
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Teachers;
