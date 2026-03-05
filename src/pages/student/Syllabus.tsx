import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    BookOpen,
    Loader2,
    CheckCircle2,
    Circle,
    CheckSquare,
    GraduationCap,
    Clock,
    User
} from 'lucide-react';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';

interface Chapter {
    id: string;
    chapter_name: string;
    description: string;
    term: 'PWT1' | 'Half Yearly' | 'PWT2' | 'Final';
    status: 'Pending' | 'Started' | 'Completed';
    completed_at: string | null;
    is_correction_completed: boolean;
}

interface SubjectInfo {
    subject_name: string;
    class_name: string;
    teacher_name: string;
}

const StudentSyllabus = () => {
    const { classSubjectId } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [subjectInfo, setSubjectInfo] = useState<SubjectInfo | null>(null);

    useEffect(() => {
        if (classSubjectId && profile?.id) {
            fetchSyllabusData();
        }
    }, [classSubjectId, profile?.id]);

    const fetchSyllabusData = async () => {
        if (!profile?.email) return;
        setLoading(true);
        try {
            const admissionNo = profile.email.split('@')[0];
            const [infoData, chaptersData, correctionData] = await Promise.all([
                sql`
                    SELECT s.name as subject_name, c.name as class_name, p.full_name as teacher_name
                    FROM class_subjects cs
                    JOIN subjects s ON cs.subject_id = s.id
                    JOIN classes c ON cs.class_id = c.id
                    JOIN teachers t ON cs.teacher_id = t.id
                    JOIN profiles p ON t.email = p.email
                    WHERE cs.id = ${classSubjectId}
                `,
                sql`
                    SELECT id, chapter_name, description, term, status, completed_at
                    FROM syllabus
                    WHERE class_subject_id = ${classSubjectId}
                    ORDER BY term ASC, order_index ASC
                `,
                sql`
                    SELECT chapter_id, is_completed
                    FROM correction_work
                    WHERE student_id = (SELECT id FROM students WHERE admission_no = ${admissionNo} LIMIT 1)
                `
            ]);

            const correctionMap = new Map((correctionData as any[]).map(c => [c.chapter_id, c.is_completed]));

            if (infoData[0]) setSubjectInfo(infoData[0] as SubjectInfo);

            setChapters((chaptersData as any[]).map(chapter => ({
                ...chapter,
                is_correction_completed: correctionMap.get(chapter.id) || false
            })));

        } catch (error) {
            console.error('Error fetching student syllabus:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-[#1E1B4B]" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Loading Syllabus...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-inter text-[#1E1B4B]">
            {/* Premium Header */}
            <div className="bg-[#1E1B4B] rounded-[32px] p-8 md:p-10 mb-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-32 -translate-y-32" />

                <button
                    onClick={() => navigate('/student/subjects')}
                    className="hidden md:flex relative z-10 items-center gap-2 text-indigo-300 hover:text-white transition-colors mb-8 group/back"
                >
                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Subjects</span>
                </button>

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                            <BookOpen className="w-8 h-8 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-lg border border-white/10">
                                    {subjectInfo?.class_name}
                                </span>
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                <span className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.15em]">Syllabus</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight uppercase">
                                {subjectInfo?.subject_name}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                        <User className="w-5 h-5 text-indigo-400" />
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block -mb-0.5">Teacher</span>
                            <span className="text-sm font-bold text-white uppercase tracking-tight">{subjectInfo?.teacher_name}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content grouped by term */}
            <div className="max-w-5xl mx-auto space-y-12">
                {['PWT1', 'Half Yearly', 'PWT2', 'Final'].map((term) => {
                    const termChapters = chapters.filter(c => c.term === term);
                    if (termChapters.length === 0) return null;

                    return (
                        <div key={term}>
                            <div className="flex items-center gap-4 mb-6">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">
                                    {term}
                                </h2>
                                <div className="h-px flex-1 bg-slate-200" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {termChapters.map((chapter) => (
                                    <motion.div
                                        key={chapter.id}
                                        whileHover={{ y: -4 }}
                                        className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-black text-[#1E1B4B] tracking-tight group-hover:text-primary transition-colors uppercase leading-tight">
                                                    {chapter.chapter_name}
                                                </h3>
                                                <p className="text-xs font-medium text-slate-400 mt-1 line-clamp-2">
                                                    {chapter.description || 'No detailed description available.'}
                                                </p>
                                            </div>
                                            {chapter.status === 'Completed' ? (
                                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shrink-0">
                                                    {chapter.status === 'Started' ? (
                                                        <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                                                    ) : (
                                                        <Circle className="w-5 h-5 text-slate-200" />
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${chapter.status === 'Completed' ? 'bg-primary/10 text-primary' :
                                                    chapter.status === 'Started' ? 'bg-amber-500/10 text-amber-600' :
                                                        'bg-slate-100 text-slate-400'
                                                    }`}>
                                                    {chapter.status}
                                                </span>
                                                {chapter.completed_at && (
                                                    <span className="text-[9px] font-bold text-slate-400">
                                                        {new Date(chapter.completed_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>

                                            {chapter.is_correction_completed && (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm">
                                                    <CheckSquare className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Corrections Done</span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {chapters.length === 0 && (
                    <div className="py-32 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-100">
                        <GraduationCap className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Syllabus Not Published</h3>
                        <p className="text-slate-200 text-sm font-bold mt-2">Your teacher hasn't added chapters for this subject yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentSyllabus;
