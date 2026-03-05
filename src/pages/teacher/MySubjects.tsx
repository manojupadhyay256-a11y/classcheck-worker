import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';

interface AssignedSubject {
    id: string; // class_subject id
    class_id: string;
    subject_id: string;
    class_name: string;
    subject_name: string;
    student_count: number;
}

const MySubjects = () => {
    const { profile } = useAuthStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<AssignedSubject[]>([]);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        if (profile?.email) {
            fetchMySubjects();
        }
    }, [profile?.email]);

    const fetchMySubjects = async () => {
        setLoading(true);
        try {
            const data = await sql`
                SELECT 
                    cs.id,
                    cs.class_id,
                    cs.subject_id,
                    c.name as class_name,
                    s.name as subject_name,
                    (SELECT COUNT(*) FROM students WHERE class_id = c.id) as student_count
                FROM class_subjects cs
                JOIN classes c ON cs.class_id = c.id
                JOIN subjects s ON cs.subject_id = s.id
                JOIN teachers t ON cs.teacher_id = t.id
                WHERE t.email = ${profile?.email}
                ORDER BY c.name, s.name
            `;
            setSubjects(data as AssignedSubject[]);
        } catch (error) {
            console.error('Error fetching my subjects:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-[#008B74]" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Loading Your Subjects...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-inter">
            {/* Header Card - Using hardcoded background color for absolute visibility */}
            <div
                className="rounded-[32px] p-8 md:p-10 mb-10 shadow-2xl relative overflow-hidden group border border-slate-700/50"
                style={{ backgroundColor: '#1E293B' }} // Force dark background
            >
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-32 -translate-y-32 group-hover:scale-110 transition-transform duration-700" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner group-hover:bg-white/20 transition-colors duration-300">
                            <BookOpen className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-md">
                                My Subjects
                            </h1>
                            <p className="text-slate-300 text-sm font-medium">
                                Manage your assigned subjects and track student progress
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-3xl border border-white/10 backdrop-blur-md self-start md:self-center">
                        <div className="flex items-center gap-4">
                            <div
                                onClick={() => setShowAll(!showAll)}
                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-500 hide-tap-highlight ${showAll ? 'bg-[#008B74]' : 'bg-slate-500'}`}
                            >
                                <motion.div
                                    animate={{ x: showAll ? 24 : 0 }}
                                    className="w-4 h-4 bg-white rounded-full shadow-lg"
                                />
                            </div>
                            <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] whitespace-nowrap">
                                Show All Class Subjects
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subject Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
                {subjects.map((subj, index) => (
                    <motion.div
                        key={subj.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
                        className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-slate-200/80 transition-all duration-500 group flex flex-col overflow-hidden"
                    >
                        <div className="p-8 pb-10 flex-1">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight group-hover:text-[#008B74] transition-colors duration-300">
                                        {subj.subject_name}
                                    </h3>
                                    <p className="text-sm font-bold text-slate-400 mt-1">
                                        Class {subj.class_name}
                                    </p>
                                </div>
                                <div className="px-3 py-1 bg-slate-50 text-[#008B74] text-[10px] font-black rounded-xl uppercase tracking-widest border border-slate-100 shadow-sm">
                                    {subj.class_name.split('-')[0].trim()}{subj.class_name.includes('-') ? subj.class_name.split('-')[1].trim() : ''}
                                </div>
                            </div>

                            <div className="space-y-4 mt-8 mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-[#E2F2F0] flex items-center justify-center border border-[#CCECE7]">
                                        <BookOpen className="w-4 h-4 text-[#008B74]" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-500">Manage Syllabus Chapters</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-[#E2F2F0] flex items-center justify-center border border-[#CCECE7]">
                                        <CheckCircle2 className="w-4 h-4 text-[#008B74]" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-500">Track Student Work</span>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <button
                                    onClick={() => navigate(`/teacher/syllabus/${subj.id}`)}
                                    className="w-full flex items-center justify-center py-4 bg-slate-50 text-slate-800 font-black uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-[#008B74] hover:text-white hover:border-[#008B74] transition-all duration-300 active:scale-95 text-[11px] shadow-sm"
                                >
                                    Syllabus
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}

                {subjects.length === 0 && (
                    <div className="col-span-full py-32 text-center bg-white rounded-[32px] border-4 border-dashed border-slate-100">
                        <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                            <BookOpen className="w-12 h-12 text-slate-200" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-400 uppercase tracking-widest">No subjects assigned</h3>
                        <p className="text-slate-300 text-sm font-bold mt-2">Please contact administration for assistance</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MySubjects;
