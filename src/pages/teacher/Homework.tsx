import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    Plus,
    Loader2,
    Calendar,
    Save,
    X,
    Trash2,
    FileText
} from 'lucide-react';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import type { Homework } from '../../types';

interface ClassSubject {
    id: string;
    class_name: string;
    subject_name: string;
    class_id: string;
    subject_id: string;
}

const TeacherHomework = () => {
    const { profile } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [homework, setHomework] = useState<Homework[]>([]);
    const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        class_id: '',
        subject_id: '',
        date: new Date().toISOString().split('T')[0],
        topic: '',
        description: ''
    });

    useEffect(() => {
        if (profile?.id) {
            fetchData();
        }
    }, [profile]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [subjectsData, homeworkData] = await Promise.all([
                sql`
                    SELECT cs.id, c.name as class_name, s.name as subject_name, cs.class_id, cs.subject_id
                    FROM class_subjects cs
                    JOIN classes c ON cs.class_id = c.id
                    JOIN subjects s ON cs.subject_id = s.id
                    JOIN teachers t ON cs.teacher_id = t.id
                    WHERE t.email = ${profile?.email}
                    ORDER BY c.name, s.name
                `,
                sql`
                    SELECT h.*, c.name as class_name, s.name as subject_name
                    FROM homework h
                    JOIN classes c ON h.class_id = c.id
                    JOIN subjects s ON h.subject_id = s.id
                    WHERE h.teacher_id = ${profile?.id}
                    ORDER BY h.date DESC, h.created_at DESC
                `
            ]);

            setClassSubjects(subjectsData as ClassSubject[]);
            setHomework(homeworkData as Homework[]);
        } catch (error) {
            console.error('Error fetching homework data:', error);
            toast.error('Failed to load homework');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        setFormData({
            class_id: '',
            subject_id: '',
            date: new Date().toISOString().split('T')[0],
            topic: '',
            description: ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.class_id || !formData.subject_id || !formData.topic.trim()) {
            toast.error('Please fill all required fields');
            return;
        }

        setIsSaving(true);

        const savePromise = (async () => {
            await sql`
                INSERT INTO homework (class_id, subject_id, teacher_id, date, topic, description)
                VALUES (${formData.class_id}, ${formData.subject_id}, ${profile?.id}, ${formData.date}, ${formData.topic.trim()}, ${formData.description.trim()})
            `;
            fetchData();
            setIsModalOpen(false);
        })();

        toast.promise(savePromise, {
            loading: 'Assigning homework...',
            success: 'Homework assigned successfully!',
            error: 'Failed to assign homework.'
        });

        try {
            await savePromise;
        } catch (error) {
            console.error('Error saving homework:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this homework?')) return;

        const deletePromise = sql`DELETE FROM homework WHERE id = ${id}`;

        toast.promise(deletePromise, {
            loading: 'Deleting homework...',
            success: 'Homework deleted successfully!',
            error: 'Failed to delete homework'
        });

        try {
            await deletePromise;
            fetchData();
        } catch (error) {
            console.error('Error deleting homework:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-amber-600" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Fetching Homework...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-inter">
            {/* Premium Header */}
            <div className="bg-slate-900 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full -translate-y-48 translate-x-48 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/5 rounded-full translate-y-32 -translate-x-32 blur-2xl" />

                <div className="max-w-5xl mx-auto px-6 pt-12 pb-20 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-amber-600 rounded-[28px] flex items-center justify-center shadow-2xl shadow-amber-900/20 border border-amber-500/50">
                                <BookOpen className="w-10 h-10 text-white" strokeWidth={2.5} />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="px-3 py-1 bg-white/5 text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-white/5">
                                        Tasks & Assignments
                                    </span>
                                </div>
                                <h1 className="text-lg md:text-4xl font-black text-white tracking-tight leading-tight uppercase">
                                    Homework
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleOpenModal}
                                className="flex items-center gap-2 px-8 py-4 bg-amber-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-900/10 hover:bg-amber-700 hover:scale-[1.02] active:scale-95 transition-all text-[10px] border border-amber-500/50"
                            >
                                <Plus className="w-4 h-4" strokeWidth={3} />
                                Assign Homework
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 -mt-10 relative z-20 pb-20">
                {homework.length > 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-amber-600 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-black text-sm uppercase tracking-widest">Recent Homework Logs</h3>
                            <span className="text-white/80 text-xs font-bold bg-white/10 px-3 py-1 rounded-full">
                                {homework.length} Records
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <tbody>
                                    {homework.map((hw) => (
                                        <tr key={hw.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-6 w-32">
                                                <div className="flex flex-col items-center justify-center p-3 bg-amber-50 rounded-2xl border border-amber-100/50">
                                                    <Calendar className="w-5 h-5 text-amber-600 mb-1" />
                                                    <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest text-center">
                                                        {new Date(hw.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                                            {hw.class_name}
                                                        </span>
                                                        <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">
                                                            {hw.subject_name}
                                                        </span>
                                                    </div>
                                                    <span className="text-base font-black text-slate-800 tracking-tight mt-1">{hw.topic}</span>
                                                    <p className="text-xs text-slate-500 font-medium mt-2 max-w-lg leading-relaxed whitespace-pre-wrap">
                                                        {hw.description}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <button
                                                    onClick={() => handleDelete(hw.id)}
                                                    className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all inline-flex"
                                                    title="Delete Homework"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col items-center justify-center px-4"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-amber-500/5 to-transparent rounded-full translate-x-16 -translate-y-16" />
                        <div className="w-24 h-24 bg-linear-to-br from-amber-50 to-amber-100 rounded-[32px] flex items-center justify-center mb-8 border border-amber-200 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <FileText className="w-10 h-10 text-amber-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">No Homework Assigned</h3>
                        <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto">
                            Start logging homework tasks for your classes using the button below.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
                            <button
                                onClick={handleOpenModal}
                                className="px-6 py-3.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all flex items-center gap-2 text-sm shadow-lg shadow-amber-900/10 active:scale-95"
                            >
                                <Plus className="w-4 h-4" strokeWidth={3} />
                                Assign Homework
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Add Homework Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isSaving && setIsModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden"
                        >
                            <div className="px-8 py-6 text-white relative flex items-center justify-between overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full -translate-y-16 translate-x-16" />
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="p-3 bg-amber-600 rounded-xl shadow-lg shadow-amber-900/10">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight">Assign Homework</h3>
                                        <p className="text-xs font-bold text-slate-400 mt-0.5">Log a task for students</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="relative z-10 p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4 relative">
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Class
                                            </label>
                                            <select
                                                required
                                                value={formData.class_id}
                                                onChange={(e) => setFormData({ ...formData, class_id: e.target.value, subject_id: '' })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all outline-none text-sm font-bold appearance-none relative z-10"
                                            >
                                                <option value="" disabled>Select Class...</option>
                                                {Array.from(new Set(classSubjects.map(cs => cs.class_id))).map(classId => {
                                                    const cls = classSubjects.find(cs => cs.class_id === classId);
                                                    return (
                                                        <option key={classId} value={classId}>
                                                            {cls?.class_name}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Subject
                                            </label>
                                            <select
                                                required
                                                value={formData.subject_id}
                                                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                                                disabled={!formData.class_id}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all outline-none text-sm font-bold appearance-none relative z-10 disabled:opacity-50"
                                            >
                                                <option value="" disabled>Select Subject...</option>
                                                {classSubjects
                                                    .filter(cs => cs.class_id === formData.class_id)
                                                    .map(cs => (
                                                        <option key={cs.subject_id} value={cs.subject_id}>
                                                            {cs.subject_name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all outline-none text-sm font-bold text-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Topic / Title
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.topic}
                                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                        placeholder="e.g. Chapter 4 Exercise 1"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all outline-none text-sm font-bold placeholder:text-slate-300"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Tasks & Instructions (Optional)
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={4}
                                        placeholder="Detailed instructions for the homework..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all outline-none text-sm font-bold placeholder:text-slate-300 resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all text-[10px]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving || !formData.class_id || !formData.subject_id || !formData.topic}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-amber-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-900/10 hover:bg-amber-700 transition-all text-[10px] disabled:opacity-50 border border-amber-500/50"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        Save Homework
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherHomework;
