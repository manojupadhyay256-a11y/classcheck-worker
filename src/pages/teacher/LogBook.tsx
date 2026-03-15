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
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-amber-600" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Loading Log Book...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-24">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-amber-600 rounded-2xl md:rounded-3xl p-4 md:p-10 text-white shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-16 -translate-y-16 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                    <div>
                        <p className="text-amber-100/80 font-medium text-[11px] md:text-xs uppercase tracking-widest flex items-center gap-1.5 mb-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            Daily Records
                        </p>
                        <h1 className="text-xl md:text-4xl font-black tracking-tight">Class Log Book</h1>
                        <p className="text-amber-100/60 text-sm font-medium mt-1">Record and track your daily classroom teachings</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-amber-700 font-bold rounded-2xl shadow-lg hover:bg-amber-50 active:scale-95 transition-all text-sm self-start"
                    >
                        <Plus className="w-4 h-4" strokeWidth={3} />
                        Create Entry
                    </button>
                </div>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by class, subject, or topic..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30 outline-none font-bold text-gray-600 shadow-sm"
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
                                    <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest mt-1">{log.period}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-lg uppercase tracking-widest border border-amber-100">
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
                                    <div className="hidden md:flex p-3 text-slate-300 group-hover:text-amber-600 transition-colors duration-300">
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
