import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    Plus,
    Search,
    Loader2,
    ChevronRight,
    Trash2
} from 'lucide-react';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';
import { LogEntryModal } from '../../components/teacher/LogEntryModal';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface LogEntry {
    id: string;
    date: string;
    period: string;
    class_name: string;
    subject_name: string;
    chapter_name: string | null;
    topics_covered: string;
    remarks: string | null;
    created_at: string;
}

const TeacherLogBook = () => {
    const { profile } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (profile?.email) {
            fetchLogs();
        }
    }, [profile?.email]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await sql`
                SELECT 
                    cl.id,
                    cl.date,
                    cl.period,
                    c.name as class_name,
                    s.name as subject_name,
                    sy.chapter_name,
                    cl.topics_covered,
                    cl.remarks,
                    cl.created_at
                FROM class_logs cl
                JOIN class_subjects cs ON cl.class_subject_id = cs.id
                JOIN classes c ON cs.class_id = c.id
                JOIN subjects s ON cs.subject_id = s.id
                JOIN teachers t ON cl.teacher_id = t.id
                LEFT JOIN syllabus sy ON cl.chapter_id = sy.id
                WHERE t.email = ${profile?.email}
                ORDER BY cl.date DESC, cl.created_at DESC
            `;
            setLogs(data as LogEntry[]);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLog = async (id: string) => {
        if (!confirm('Are you sure you want to delete this log entry?')) return;

        const deletePromise = (async () => {
            await sql`DELETE FROM class_logs WHERE id = ${id}`;
            setLogs(logs.filter(l => l.id !== id));
        })();

        toast.promise(deletePromise, {
            loading: 'Deleting log entry...',
            success: 'Log entry deleted successfully!',
            error: 'Failed to delete log entry.'
        });

        try {
            await deletePromise;
        } catch (error) {
            console.error('Error deleting log:', error);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.topics_covered.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && logs.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-[#008B74]" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Loading Log Book...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-inter">
            {/* Header section */}
            <div className="bg-[#1E293B] rounded-[32px] p-8 md:p-10 mb-8 shadow-2xl relative overflow-hidden group border border-slate-700/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-32 -translate-y-32 group-hover:scale-110 transition-transform duration-700" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                            <BookOpen className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-md">
                                Class Log Book
                            </h1>
                            <p className="text-slate-300 text-sm font-medium">Record and track your daily classroom teachings</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-[#008B74] text-white font-black uppercase tracking-widest rounded-2xl border border-[#00A388] hover:bg-[#00A388] transition-all duration-300 active:scale-95 text-xs shadow-xl shadow-[#008B74]/20 group"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        Create Entry
                    </button>
                </div>
            </div>

            {/* Filter and Search */}
            <div className="mb-8 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by class, subject, or topic..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl focus:ring-2 focus:ring-[#008B74] focus:border-transparent outline-none font-bold text-slate-600 shadow-sm"
                    />
                </div>
            </div>

            {/* Logs List */}
            <div className="space-y-4">
                <AnimatePresence>
                    {filteredLogs.map((log, index) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group"
                        >
                            <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
                                {/* Date Badge */}
                                <div className="flex flex-col items-center justify-center min-w-[80px] p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{format(new Date(log.date), 'MMM')}</span>
                                    <span className="text-2xl font-black text-slate-800">{format(new Date(log.date), 'dd')}</span>
                                    <span className="text-[10px] font-black uppercase text-[#008B74] tracking-widest mt-1">{log.period}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <span className="px-3 py-1 bg-[#EEF2FF] text-saas-accent-hover text-[10px] font-black rounded-lg uppercase tracking-widest border border-[#E0E7FF]">
                                            Class {log.class_name}
                                        </span>
                                        <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-black rounded-lg uppercase tracking-widest border border-slate-100">
                                            {log.subject_name}
                                        </span>
                                        {log.chapter_name && (
                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg uppercase tracking-widest border border-emerald-100">
                                                {log.chapter_name}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 line-clamp-2 leading-tight">
                                        {log.topics_covered}
                                    </h3>
                                    {log.remarks && (
                                        <p className="text-sm font-medium text-slate-400 mt-2 italic">"{log.remarks}"</p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 md:border-l md:border-slate-100 md:pl-6">
                                    <button
                                        onClick={() => handleDeleteLog(log.id)}
                                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-300"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <div className="hidden md:flex p-3 text-slate-300 group-hover:text-[#008B74] transition-colors duration-300">
                                        <ChevronRight className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredLogs.length === 0 && (
                    <div className="py-32 text-center bg-white rounded-[32px] border-4 border-dashed border-slate-100">
                        <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                            <BookOpen className="w-10 h-10 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No entries found</h3>
                        <p className="text-slate-300 text-sm font-bold mt-2">Start recording your classroom sessions</p>
                    </div>
                )}
            </div>

            <LogEntryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchLogs}
            />
        </div>
    );
};

export default TeacherLogBook;
