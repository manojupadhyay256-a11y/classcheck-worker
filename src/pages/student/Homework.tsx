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
        <div className="space-y-8 pb-24">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-amber-600 rounded-2xl md:rounded-3xl p-4 md:p-10 text-white shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-16 -translate-y-16 blur-3xl" />
                <div className="relative z-10">
                    <p className="text-amber-100/80 font-medium text-[11px] md:text-xs uppercase tracking-widest flex items-center gap-1.5 mb-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        Your Tasks
                    </p>
                    <h1 className="text-xl md:text-4xl font-black tracking-tight">Homework</h1>
                </div>
            </div>

            {/* Content */}
            {homework.length > 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
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
                                    <tr key={hw.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
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
                                                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                                        {hw.subject_name}
                                                    </span>
                                                    <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">
                                                        By {hw.teacher_name || 'Teacher'}
                                                    </span>
                                                </div>
                                                <span className="text-base font-black text-gray-800 tracking-tight mt-1">{hw.topic}</span>
                                                <p className="text-xs text-gray-500 font-medium mt-2 max-w-lg leading-relaxed whitespace-pre-wrap">
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
                    className="py-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col items-center justify-center px-4"
                >
                    <div className="w-24 h-24 bg-linear-to-br from-amber-50 to-amber-100 rounded-[32px] flex items-center justify-center mb-8 border border-amber-200 shadow-inner">
                        <FileText className="w-10 h-10 text-amber-600" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">No Homework</h3>
                    <p className="text-gray-400 text-sm font-medium max-w-sm mx-auto">
                        You don't have any homework assigned right now. Great job catching up!
                    </p>
                </motion.div>
            )}
        </div>
    );
};

export default StudentHomework;
