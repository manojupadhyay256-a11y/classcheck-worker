import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen,
    Loader2,
    Sparkles,
    CalendarDays
} from 'lucide-react';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';
import { format } from 'date-fns';

interface DiaryEntry {
    id: string;
    date: string;
    period: string;
    subject_name: string;
    teacher_name: string;
    chapter_name: string | null;
    topics_covered: string;
    remarks: string | null;
}

const StudentDailyDiary = () => {
    const { profile } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<DiaryEntry[]>([]);

    useEffect(() => {
        if (profile?.id) {
            fetchDiary();
        }
    }, [profile?.id]);

    const fetchDiary = async () => {
        if (!profile?.email) return;
        setLoading(true);
        try {
            // 1. Get student's class_id using admission_no (extracted from email)
            const admissionNo = profile.email.split('@')[0];
            const studentData = await sql`SELECT class_id FROM students WHERE admission_no = ${admissionNo} LIMIT 1`;
            const classId = studentData[0]?.class_id;

            if (!classId) {
                setLoading(false);
                return;
            }

            // 2. Fetch logs for that class
            const data = await sql`
                SELECT 
                    cl.id,
                    cl.date,
                    cl.period,
                    s.name as subject_name,
                    p.full_name as teacher_name,
                    sy.chapter_name,
                    cl.topics_covered,
                    cl.remarks
                FROM class_logs cl
                JOIN class_subjects cs ON cl.class_subject_id = cs.id
                JOIN subjects s ON cs.subject_id = s.id
                JOIN teachers t ON cl.teacher_id = t.id
                JOIN profiles p ON t.email = p.email
                LEFT JOIN syllabus sy ON cl.chapter_id = sy.id
                WHERE cs.class_id = ${classId}
                ORDER BY cl.date DESC, cl.period ASC
            `;
            setEntries(data as DiaryEntry[]);
        } catch (error) {
            console.error('Error fetching diary:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-[#008B74]" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Reading Your Diary...</p>
            </div>
        );
    }

    // Group entries by date
    const groupedEntries = entries.reduce((acc, entry) => {
        const date = format(new Date(entry.date), 'yyyy-MM-dd');
        if (!acc[date]) acc[date] = [];
        acc[date].push(entry);
        return acc;
    }, {} as Record<string, DiaryEntry[]>);

    const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-inter">
            {/* Header section */}
            <div className="bg-[#008B74] rounded-[32px] p-8 md:p-10 mb-8 shadow-2xl relative overflow-hidden group border border-[#007663]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-32 -translate-y-32 group-hover:scale-110 transition-transform duration-700" />

                <div className="relative z-10 flex items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                            <Sparkles className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-md">
                                Daily Diary
                            </h1>
                            <p className="text-emerald-50 text-sm font-medium">Keep track of what was taught in your class today</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Diary Content */}
            <div className="space-y-12">
                {sortedDates.map((date) => (
                    <div key={date}>
                        <div className="flex items-center gap-4 mb-6 px-4">
                            <div className="h-[2px] flex-1 bg-slate-200" />
                            <div className="flex items-center gap-2 px-6 py-2 bg-white rounded-full border border-slate-200 shadow-sm">
                                <CalendarDays className="w-4 h-4 text-[#008B74]" />
                                <span className="text-sm font-black text-slate-800 uppercase tracking-widest">
                                    {format(new Date(date), 'EEEE, MMMM do')}
                                </span>
                            </div>
                            <div className="h-[2px] flex-1 bg-slate-200" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedEntries[date].map((entry) => (
                                <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 p-8 flex flex-col group"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <span className="px-3 py-1 bg-slate-50 text-[#008B74] text-[10px] font-black rounded-xl uppercase tracking-widest border border-slate-100 shadow-sm">
                                            {entry.period} Period
                                        </span>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-[#008B74] transition-colors duration-300">
                                            <BookOpen className="w-4 h-4 text-slate-300 group-hover:text-white" />
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2 group-hover:text-[#008B74] transition-colors duration-300">
                                        {entry.subject_name}
                                    </h3>

                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                            <span className="text-[8px] font-black text-slate-500">{entry.teacher_name.charAt(0)}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-400">{entry.teacher_name}</span>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        {entry.chapter_name && (
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-[#008B74] block mb-1">Chapter</span>
                                                <span className="text-sm font-bold text-slate-700">{entry.chapter_name}</span>
                                            </div>
                                        )}
                                        <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[#008B74] block mb-1">Today's Topics</span>
                                            <p className="text-sm font-medium text-slate-600 leading-relaxed italic">{entry.topics_covered}</p>
                                        </div>
                                    </div>

                                    {entry.remarks && (
                                        <div className="mt-6 pt-6 border-t border-slate-50">
                                            <p className="text-xs font-bold text-slate-300 italic">"Note: {entry.remarks}"</p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}

                {sortedDates.length === 0 && (
                    <div className="py-32 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-100">
                        <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-slate-100">
                            <Sparkles className="w-12 h-12 text-slate-200" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-400 uppercase tracking-widest">Your diary is empty</h3>
                        <p className="text-slate-300 text-sm font-bold mt-2">Check back after your teachers make an entry!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentDailyDiary;
