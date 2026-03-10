import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen,
    Loader2,
    CheckCircle2,
    Users
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
    }, [profile?.email, showAll]);

    const fetchMySubjects = async () => {
        setLoading(true);
        try {
            let data;

            if (showAll) {
                // If "All Subjects of My Class" is checked, find the class where this teacher is the class teacher
                // and fetch all subjects for THAT class.
                data = await sql`
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
                    WHERE cs.class_id IN (
                        SELECT id
                        FROM classes
                        WHERE class_teacher_id = (SELECT id FROM teachers WHERE email = ${profile?.email})
                    )
                    ORDER BY c.name, s.name
                `;

                // If they are not a class teacher (data is empty), fallback to their own subjects
                if (data.length === 0) {
                    data = await sql`
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
                }
            } else {
                data = await sql`
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
            }

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
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-amber-600" />
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
                            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-md">
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
                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-500 hide-tap-highlight ${showAll ? 'bg-amber-600' : 'bg-slate-500'}`}
                            >
                                <motion.div
                                    animate={{ x: showAll ? 24 : 0 }}
                                    className="w-4 h-4 bg-white rounded-full shadow-lg"
                                />
                            </div>
                            <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] whitespace-nowrap">
                                All Subjects of My Class
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subject Grid - Professional v2 Modern Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-2">
                {subjects.map((subj, index) => (
                    <motion.div
                        key={subj.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -8 }}
                        transition={{ delay: index * 0.05, type: "spring", stiffness: 260, damping: 20 }}
                        className="group relative bg-white border border-slate-100/80 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(245,158,11,0.15)] transition-all duration-500 flex flex-col overflow-hidden"
                    >
                        {/* Premium Top Accent Bar */}
                        <div className="h-1.5 w-full bg-linear-to-r from-amber-400 via-orange-400 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-6">
                                {/* Glass-styled Icon Container */}
                                <div className="w-11 h-11 bg-linear-to-br from-amber-50 to-orange-50 rounded-2xl flex items-center justify-center border border-white shadow-sm group-hover:rotate-6 transition-transform duration-500">
                                    <BookOpen className="w-5 h-5 text-amber-600" />
                                </div>

                                {/* Student Count Badge */}
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50/80 backdrop-blur-sm border border-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-tight">
                                    <Users className="w-3 h-3 text-slate-400" />
                                    {subj.student_count || 0} Students
                                </div>
                            </div>

                            {/* Typography: Professional Hierarchy */}
                            <div className="mb-6">
                                <h3 className="text-base font-black text-slate-900 leading-tight tracking-tight group-hover:text-amber-600 transition-colors line-clamp-2">
                                    {subj.subject_name}
                                </h3>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                                        Class {subj.class_name}
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                                    <span className="text-[11px] font-black text-amber-600/70 uppercase">
                                        Active
                                    </span>
                                </div>
                            </div>

                            {/* Professional Action Group */}
                            <div className="flex items-center gap-2 mb-8">
                                <button
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 hover:text-amber-600 hover:bg-white hover:border-amber-200 transition-all text-[10px] font-bold uppercase tracking-wider group/action"
                                    title="Manage Syllabus"
                                >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    Syllabus
                                </button>
                                <button
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-500 hover:text-emerald-500 hover:bg-white hover:border-emerald-200 transition-all"
                                    title="Track Work"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Elevated Pill Button */}
                            <div className="mt-auto">
                                <button
                                    onClick={() => navigate(`/teacher/syllabus/${subj.id}`)}
                                    className="w-full py-3.5 bg-slate-900 border border-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-slate-900/10 hover:bg-amber-600 hover:border-amber-600 hover:shadow-amber-600/20 transition-all duration-300 active:scale-[0.98]"
                                >
                                    Manage Course
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
