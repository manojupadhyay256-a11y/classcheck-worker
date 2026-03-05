import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    BookOpen,
    Loader2,
    ArrowRight,
    Users,
    GraduationCap,
    BookMarked
} from 'lucide-react';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';

interface Subject {
    id: string;
    name: string;
    teacher_name: string;
    total_chapters: number;
    completed_chapters: number;
}

const StudentSubjects = () => {
    const navigate = useNavigate();
    const { profile } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    useEffect(() => {
        if (profile?.id) {
            fetchSubjects();
        }
    }, [profile?.id]);

    const fetchSubjects = async () => {
        if (!profile?.email) return;
        setLoading(true);
        try {
            // 1. Get student's class_id from admission_no (extracted from email)
            const admissionNo = profile.email.split('@')[0];
            const studentData = await sql`SELECT class_id FROM students WHERE admission_no = ${admissionNo} LIMIT 1`;
            const classId = studentData[0]?.class_id;

            if (!classId) {
                setLoading(false);
                return;
            }

            // 2. Fetch subjects for that class
            const data = await sql`
                SELECT 
                    cs.id,
                    s.name,
                    p.full_name as teacher_name,
                    (SELECT COUNT(*) FROM syllabus WHERE class_subject_id = cs.id) as total_chapters,
                    (SELECT COUNT(*) FROM syllabus WHERE class_subject_id = cs.id AND status = 'Completed') as completed_chapters
                FROM class_subjects cs
                JOIN subjects s ON cs.subject_id = s.id
                JOIN teachers t ON cs.teacher_id = t.id
                JOIN profiles p ON t.email = p.email
                WHERE cs.class_id = ${classId}
            `;
            setSubjects(data as Subject[]);
        } catch (error) {
            console.error('Error fetching subjects:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-[#1E1B4B]" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Organizing Your Studies...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-inter text-[#1E1B4B]">
            {/* Header section */}
            <div className="bg-[#1E1B4B] rounded-[32px] p-8 md:p-10 mb-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-32 -translate-y-32 group-hover:scale-110 transition-transform duration-700" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner group-hover:bg-primary/20 transition-colors">
                            <BookOpen className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-md uppercase">
                                My Subjects
                            </h1>
                            <p className="text-indigo-200 text-sm font-medium">Explore your academic journey and track syllabus progress</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-400/30">
                                <GraduationCap className="w-5 h-5 text-indigo-300" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 block">Total Subjects</span>
                                <span className="text-xl font-black text-white">{subjects.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subjects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {subjects.map((subject, i) => {
                    const progress = subject.total_chapters > 0
                        ? (subject.completed_chapters / subject.total_chapters) * 100
                        : 0;

                    return (
                        <motion.div
                            key={subject.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 p-8 flex flex-col group relative overflow-hidden h-full"
                        >
                            {/* Background decoration */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-16 -translate-y-16 group-hover:bg-primary/5 transition-colors duration-500" />

                            <div className="flex items-center justify-between mb-8 relative">
                                <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-primary/10 transition-colors duration-500">
                                    <BookMarked className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-0.5">Progress</span>
                                    <span className="text-lg font-black text-slate-800">{Math.round(progress)}%</span>
                                </div>
                            </div>

                            <h3 className="text-[22px] font-black text-[#1E1B4B] uppercase tracking-tight leading-tight mb-4 group-hover:text-primary transition-colors duration-300">
                                {subject.name}
                            </h3>

                            <div className="flex items-center gap-2 mb-8 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-500 truncate">
                                    <span className="text-[10px] font-black uppercase text-slate-300 block -mb-0.5">Teacher</span>
                                    {subject.teacher_name}
                                </span>
                            </div>

                            <div className="mt-auto space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">Course Completion</span>
                                        <span className="text-primary">{subject.completed_chapters}/{subject.total_chapters} Chapters</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            className="h-full bg-primary"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(`/student/syllabus/${subject.id}`)}
                                    className="w-full py-4 bg-slate-50 group-hover:bg-primary text-slate-400 group-hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 border border-slate-100 group-hover:border-primary group-hover:shadow-lg group-hover:shadow-primary/20"
                                >
                                    Syllabus View
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {subjects.length === 0 && (
                <div className="py-32 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-100">
                    <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-slate-100">
                        <BookOpen className="w-12 h-12 text-slate-200" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-400 uppercase tracking-widest">Assignments Pending</h3>
                    <p className="text-slate-300 text-sm font-bold mt-2">Subjects will appear here once assigned to your class.</p>
                </div>
            )}
        </div>
    );
};

export default StudentSubjects;
