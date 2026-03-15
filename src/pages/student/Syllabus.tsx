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
    term: string;
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
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-amber-600" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Loading Syllabus...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-24">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-amber-600 rounded-2xl md:rounded-3xl p-4 md:p-10 text-white shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-16 -translate-y-16 blur-3xl" />
                <div className="relative z-10">
                    <button
                        onClick={() => navigate('/student/subjects')}
                        className="flex items-center gap-2 text-amber-100/70 hover:text-white transition-colors mb-4 group/back"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider">Back to Subjects</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                        <div>
                            <p className="text-amber-100/80 font-medium text-[11px] md:text-xs uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                <BookOpen className="w-3.5 h-3.5" />
                                {subjectInfo?.class_name} • Syllabus
                            </p>
                            <h1 className="text-xl md:text-4xl font-black tracking-tight">{subjectInfo?.subject_name}</h1>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 px-5 py-3 rounded-2xl border border-white/20 self-start">
                            <User className="w-5 h-5 text-amber-100" />
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 block">Teacher</span>
                                <span className="text-sm font-bold text-white">{subjectInfo?.teacher_name}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content grouped by term */}
            <div className="max-w-5xl mx-auto space-y-12">
                {['PWT1', 'Half Yearly', 'PWT2', 'Final'].map((term) => {
                    const termChapters = chapters.filter(c => c.term?.split(',').includes(term));
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
                                                <h3 className="text-lg font-black text-slate-900 font-sans tracking-normal group-hover:text-amber-600 transition-colors uppercase leading-tight">
                                                    {chapter.chapter_name}
                                                </h3>
                                                <p className="text-xs font-medium text-slate-400 mt-1 line-clamp-2 font-sans tracking-normal">
                                                    {chapter.description || 'No detailed description available.'}
                                                </p>
                                            </div>
                                            {chapter.status === 'Completed' ? (
                                                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100 shrink-0">
                                                    <CheckCircle2 className="w-5 h-5 text-amber-600" />
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
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${chapter.status === 'Completed' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
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
