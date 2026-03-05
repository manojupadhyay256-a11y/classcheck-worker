import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    School,
    Users as UsersIcon,
    Loader2,
    ArrowRight,
    RefreshCw,
    LayoutGrid
} from 'lucide-react';
import Button from '../../components/common/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { sql } from '../../lib/db';
import { toast } from 'sonner';

const Classes = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [classes, setClasses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        class_teacher_id: ''
    });

    const fetchClasses = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const [classesData, teachersData] = await Promise.all([
                sql`
                    SELECT 
                        c.id,
                        c.name,
                        c.class_teacher_id,
                        t.name as class_teacher_name,
                        COUNT(DISTINCT cs.subject_id) as subject_count,
                        COUNT(DISTINCT s.id) as student_count
                    FROM classes c
                    LEFT JOIN teachers t ON c.class_teacher_id = t.id
                    LEFT JOIN class_subjects cs ON c.id = cs.class_id
                    LEFT JOIN students s ON s.class_id = c.id
                    GROUP BY c.id, c.name, t.name, c.class_teacher_id
                    ORDER BY c.name ASC
                `,
                sql`SELECT id, name FROM teachers ORDER BY name ASC`
            ]);
            setClasses(classesData);
            setTeachers(teachersData);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to fetch data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    const filteredClasses = classes.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.class_teacher_name && c.class_teacher_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleOpenModal = (cl: any = null) => {
        if (cl) {
            setEditingClass(cl);
            setFormData({
                name: cl.name,
                class_teacher_id: cl.class_teacher_id || ''
            });
        } else {
            setEditingClass(null);
            setFormData({
                name: '',
                class_teacher_id: ''
            });
        }
        setError(null);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('Class name is required');
            return;
        }

        setIsSaving(true);
        setError(null);

        const savePromise = (async () => {
            if (editingClass) {
                // Update
                await sql`
                    UPDATE classes 
                    SET 
                        name = ${formData.name.toUpperCase().trim()}, 
                        class_teacher_id = ${formData.class_teacher_id || null} 
                    WHERE id = ${editingClass.id}
                `;
            } else {
                // Create
                await sql`
                    INSERT INTO classes (name, class_teacher_id) 
                    VALUES (${formData.name.toUpperCase().trim()}, ${formData.class_teacher_id || null})
                `;
            }
            await fetchClasses(true);
            setIsModalOpen(false);
        })();

        toast.promise(savePromise, {
            loading: editingClass ? 'Updating class...' : 'Creating class...',
            success: editingClass ? 'Class updated successfully!' : 'Class created successfully!',
            error: (err: any) => err?.message || 'Failed to save class. Name might already exist.'
        });

        try {
            await savePromise;
        } catch (err: any) {
            console.error('Error saving class:', err);
            setError(err.message || 'Failed to save class');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete class "${name}"? This will also remove student attachments.`)) {
            setIsSaving(true);
            try {
                // Students and class_subjects should handle cascade if configured, 
                // but let's be safe or check schema for ON DELETE CASCADE.
                // Assuming standard relational cleanup.
                await sql`DELETE FROM classes WHERE id = ${id}`;
                await fetchClasses(true);
                toast.success(`Class "${name}" deleted successfully.`);
            } catch (err: any) {
                console.error('Error deleting class:', err);
                toast.error('Failed to delete class. Please ensure it has no dependencies.');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleViewDetails = (id: string) => {
        // This could navigate to a dedicated class page
        alert(`Viewing details for class ${id}`);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-inter">
            {/* SaaS Header */}
            <div className="bg-saas-dark text-white">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 sm:py-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-10">
                        <div className="flex items-center gap-4 sm:gap-5">
                            <div className="p-3.5 sm:p-4 bg-saas-accent/10 rounded-2xl border border-saas-accent/20 shrink-0">
                                <School className="w-7 h-7 sm:w-8 sm:h-8 text-saas-accent" strokeWidth={2.5} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-1 truncate">Class Management</h1>
                                <p className="text-slate-400 text-[13px] sm:text-sm font-medium">Configure class structures and homeroom assignments.</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full md:w-auto">
                            <div className="relative flex-1 sm:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search by class or teacher..."
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
                                <span className="font-bold">Add Class</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 -mt-6">
                <div className="bg-white rounded-2xl saas-shadow border border-saas-border p-4 sm:p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                            <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                        </div>
                        <div>
                            <p className="text-[11px] sm:text-sm font-semibold text-slate-500 uppercase tracking-tight">Active Classes</p>
                            <h2 className="text-xl sm:text-2xl font-bold text-saas-dark leading-tight">{classes.length}</h2>
                        </div>
                    </div>
                    {refreshing && (
                        <div className="flex items-center gap-2 text-saas-accent text-[10px] sm:text-xs font-semibold animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                            Refining...
                        </div>
                    )}
                </div>
            </div>

            {/* List Table */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 mt-6 sm:mt-10">
                {loading ? (
                    <div className="bg-white rounded-2xl saas-shadow border border-saas-border flex flex-col items-center justify-center py-20 sm:py-32 gap-4">
                        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-saas-accent animate-spin" strokeWidth={3} />
                        <p className="text-slate-400 font-semibold tracking-wide uppercase text-[10px] sm:text-[11px]">Loading Academic Units...</p>
                    </div>
                ) : filteredClasses.length > 0 ? (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-white rounded-2xl saas-shadow border border-saas-border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-saas-border">
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-16">#</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Academic Name</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Homeroom Lead</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Curriculum</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Population</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-saas-border">
                                        <AnimatePresence mode="popLayout">
                                            {filteredClasses.map((cl, index) => (
                                                <motion.tr
                                                    key={cl.id}
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
                                                            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100/50 flex items-center justify-center text-teal-600 font-bold text-sm uppercase">
                                                                {cl.name.split(' ')[0]?.slice(0, 3)}
                                                            </div>
                                                            <span className="font-semibold text-saas-dark text-[15px] uppercase tracking-tight">{cl.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        {cl.class_teacher_name ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-saas-accent/5 flex items-center justify-center border border-saas-accent/10">
                                                                    <UsersIcon className="w-4 h-4 text-saas-accent" />
                                                                </div>
                                                                <span className="text-[14px] font-medium text-slate-700">{cl.class_teacher_name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 italic text-xs font-medium">Unassigned</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className="inline-flex items-center px-2.5 py-1 bg-purple-50 text-purple-600 text-[10px] font-bold uppercase rounded-lg border border-purple-100 tracking-wide">
                                                            {cl.subject_count} Subjects
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-lg border border-emerald-100 tracking-wide">
                                                            {cl.student_count} Students
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleOpenModal(cl)}
                                                                className="p-2.5 text-slate-400 hover:text-saas-accent hover:bg-saas-accent/5 rounded-xl transition-all duration-200 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center border border-transparent hover:border-saas-accent/10"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(cl.id, cl.name)}
                                                                className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-200 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center border border-transparent hover:border-rose-100"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleViewDetails(cl.id)}
                                                                className="p-2.5 bg-slate-50 text-slate-600 hover:bg-saas-accent hover:text-white rounded-xl transition-all duration-200 border border-slate-200/50 hover:border-saas-accent shadow-sm ml-1 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                                                            >
                                                                <ArrowRight className="w-4 h-4" />
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
                                {filteredClasses.map((cl, index) => (
                                    <motion.div
                                        key={cl.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-white rounded-2xl p-5 saas-shadow border border-saas-border"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-[13px]">
                                                    {cl.name.split(' ')[0]?.slice(0, 3)}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-saas-dark text-[15px] leading-tight uppercase tracking-tight truncate">{cl.name}</span>
                                                    <span className="text-[11px] text-slate-400 font-medium truncate">
                                                        {cl.class_teacher_name || 'No CT assigned'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 shrink-0 ml-2">
                                                <button
                                                    onClick={() => handleOpenModal(cl)}
                                                    className="p-2 text-slate-400 hover:text-saas-accent hover:bg-saas-accent/5 rounded-lg active:scale-95 transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cl.id, cl.name)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg active:scale-95 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                                            <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold uppercase rounded-md border border-purple-100 font-mono">
                                                {cl.subject_count} Subj
                                            </span>
                                            <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-md border border-emerald-100 font-mono">
                                                {cl.student_count} Stud
                                            </span>
                                            <button
                                                onClick={() => handleViewDetails(cl.id)}
                                                className="ml-auto flex items-center gap-1.5 text-indigo-600 text-[11px] font-bold uppercase tracking-wider hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                                            >
                                                Details
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-2xl saas-shadow border border-saas-border flex flex-col items-center justify-center py-20 text-center p-6">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                            <School className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-saas-dark">No Academic Units</h3>
                        <p className="text-slate-400 mt-2 max-w-xs text-[13px] font-medium leading-relaxed">Refine your search or create a new class registry.</p>
                        <Button onClick={() => handleOpenModal()} className="mt-8 bg-saas-accent shadow-none px-6 py-3 rounded-xl font-bold">
                            <Plus className="w-5 h-5 mr-2" />
                            Add Class
                        </Button>
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isSaving && setIsModalOpen(false)}
                            className="absolute inset-0 bg-saas-dark/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-saas-border"
                        >
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-2xl font-bold text-saas-dark">
                                            {editingClass ? 'Refine Academic Unit' : 'New Academic Unit'}
                                        </h2>
                                        <p className="text-slate-400 text-sm mt-1">
                                            {editingClass ? 'Update class identification and homeroom lead.' : 'Initialize a new class for the current academic session.'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-saas-accent/10 rounded-2xl">
                                        <School className="w-6 h-6 text-saas-accent" />
                                    </div>
                                </div>

                                <form onSubmit={handleSave} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                            Class Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. 10-A, 11-B"
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all placeholder:text-slate-400"
                                            disabled={isSaving}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                            Homeroom Lead
                                        </label>
                                        <select
                                            value={formData.class_teacher_id}
                                            onChange={(e) => setFormData({ ...formData, class_teacher_id: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all appearance-none cursor-pointer"
                                            disabled={isSaving}
                                        >
                                            <option value="">Select a Teacher (Optional)</option>
                                            {teachers.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-medium flex items-center gap-3"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                            {error}
                                        </motion.div>
                                    )}

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                                            disabled={isSaving}
                                        >
                                            Dismiss
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-6 py-4 bg-saas-accent text-white font-bold rounded-2xl hover:bg-saas-accent-hover shadow-lg shadow-saas-accent/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    <span>Propagating...</span>
                                                </>
                                            ) : (
                                                <span>{editingClass ? 'Sync Updates' : 'Initiate Class'}</span>
                                            )}
                                        </button>
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

export default Classes;
