import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen,
    Loader2,
    Calendar,
    FileText
} from 'lucide-react';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import type { Homework } from '../../types';

const StudentHomework = () => {
    const { profile } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [homework, setHomework] = useState<Homework[]>([]);

    useEffect(() => {
        if (profile?.id) {
            fetchData();
        }
    }, [profile]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await sql`
                SELECT h.*, c.name as class_name, s.name as subject_name, t.full_name as teacher_name
                FROM homework h
                JOIN classes c ON h.class_id = c.id
                JOIN subjects s ON h.subject_id = s.id
                LEFT JOIN profiles t ON h.teacher_id = t.id
                JOIN students st ON st.class_id = h.class_id
                WHERE st.id = ${profile?.id}
                ORDER BY h.date DESC, h.created_at DESC
            `;

            setHomework(data as Homework[]);
        } catch (error) {
            console.error('Error fetching homework data:', error);
            toast.error('Failed to load homework');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-amber-600" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Checking Homework...</p>
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
                                        Your Tasks
                                    </span>
                                </div>
                                <h1 className="text-lg md:text-4xl font-black text-white tracking-tight leading-tight uppercase">
                                    Homework
                                </h1>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 -mt-10 relative z-20 pb-20">
                {homework.length > 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-amber-600 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-black text-sm uppercase tracking-widest">Assigned Homework</h3>
                            <span className="text-white/80 text-xs font-bold bg-white/10 px-3 py-1 rounded-full">
                                {homework.length} Tasks
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
                                                            {hw.subject_name}
                                                        </span>
                                                        <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">
                                                            By {hw.teacher_name || 'Teacher'}
                                                        </span>
                                                    </div>
                                                    <span className="text-base font-black text-slate-800 tracking-tight mt-1">{hw.topic}</span>
                                                    <p className="text-xs text-slate-500 font-medium mt-2 max-w-lg leading-relaxed whitespace-pre-wrap">
                                                        {hw.description}
                                                    </p>
                                                </div>
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
                        <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">No Homework</h3>
                        <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto">
                            You don't have any homework assigned right now. Great job catching up!
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default StudentHomework;
