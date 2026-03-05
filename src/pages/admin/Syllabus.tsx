import { useState, useEffect } from 'react';
import {
    Search,
    Loader2,
    User,
    ChevronRight,
    CheckCircle2,
    Circle,
    GraduationCap
} from 'lucide-react';
import { sql } from '../../lib/db';
import { motion, AnimatePresence } from 'framer-motion';

interface SyllabusStatus {
    class_subject_id: string;
    class_name: string;
    subject_name: string;
    teacher_name: string;
    total_chapters: number;
    completed_chapters: number;
}

interface ChapterStatus {
    id: string;
    chapter_name: string;
    term: string;
    status: 'Pending' | 'Started' | 'Completed';
    started_at: string | null;
    completed_at: string | null;
    correction_percentage: number;
}

const AdminSyllabus = () => {
    const [loading, setLoading] = useState(true);
    const [subjectStatuses, setSubjectStatuses] = useState<SyllabusStatus[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [teacherFilter, setTeacherFilter] = useState('');
    const [teachers, setTeachers] = useState<{ id: string, full_name: string }[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<SyllabusStatus | null>(null);
    const [chapterStatuses, setChapterStatuses] = useState<ChapterStatus[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchStatuses();
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        try {
            const data = await sql`SELECT id, full_name FROM profiles WHERE role = 'teacher' ORDER BY full_name`;
            setTeachers(data as { id: string, full_name: string }[]);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        }
    };

    const fetchStatuses = async () => {
        setLoading(true);
        try {
            const data = await sql`
                SELECT 
                    cs.id as class_subject_id,
                    c.name as class_name,
                    s.name as subject_name,
                    p.full_name as teacher_name,
                    (SELECT COUNT(*) FROM syllabus WHERE class_subject_id = cs.id) as total_chapters,
                    (SELECT COUNT(*) FROM syllabus WHERE class_subject_id = cs.id AND status = 'Completed') as completed_chapters
                FROM class_subjects cs
                JOIN classes c ON cs.class_id = c.id
                JOIN subjects s ON cs.subject_id = s.id
                JOIN teachers t ON cs.teacher_id = t.id
                JOIN profiles p ON t.email = p.email
                WHERE (SELECT COUNT(*) FROM syllabus WHERE class_subject_id = cs.id) > 0
                ORDER BY c.name, s.name
            `;
            setSubjectStatuses(data as SyllabusStatus[]);
        } catch (error) {
            console.error('Error fetching syllabus statuses:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChapterDetails = async (status: SyllabusStatus) => {
        setSelectedSubject(status);
        setLoadingDetails(true);
        try {
            const data = await sql`
                SELECT 
                    s.id,
                    s.chapter_name,
                    s.term,
                    s.status,
                    s.started_at,
                    s.completed_at,
                    COALESCE(
                        (SELECT COUNT(*) FROM correction_work cw WHERE cw.chapter_id = s.id AND cw.is_completed = TRUE) * 100.0 / 
                        NULLIF((SELECT COUNT(*) FROM students WHERE class_id = (SELECT class_id FROM class_subjects WHERE id = s.class_subject_id)), 0),
                        0
                    ) as correction_percentage
                FROM syllabus s
                WHERE s.class_subject_id = ${status.class_subject_id}
                ORDER BY s.term, s.order_index
            `;
            setChapterStatuses(data as ChapterStatus[]);
        } catch (error) {
            console.error('Error fetching chapter details:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const filteredStatuses = subjectStatuses.filter(s => {
        const matchesSearch =
            s.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.teacher_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTeacher = !teacherFilter || s.teacher_name === teacherFilter;
        return matchesSearch && matchesTeacher;
    });

    if (loading && subjectStatuses.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-[#008B74]" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Analyzing Syllabus Progress...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-inter">
            {/* Header */}
            <div className="rounded-3xl p-8 md:p-10 mb-10 relative overflow-hidden group shadow-2xl bg-[#1E293B]">
                <div className="absolute top-0 right-0 w-72 h-72 bg-[#008B74]/10 rounded-full translate-x-36 -translate-y-36" />
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-[#008B74] rounded-2xl flex items-center justify-center shadow-lg border border-[#008B74]/50">
                                <GraduationCap className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                                    Syllabus Status
                                </h1>
                                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#008B74]" />
                                    Completion Tracking
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#008B74] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search Subject or Class..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-800 font-bold focus:outline-none focus:border-[#008B74]/40 transition-all shadow-sm"
                        />
                    </div>
                    <div className="relative group">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#008B74] transition-colors" />
                        <select
                            value={teacherFilter}
                            onChange={(e) => setTeacherFilter(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-800 font-bold focus:outline-none focus:border-[#008B74]/40 transition-all shadow-sm appearance-none"
                        >
                            <option value="">All Teachers</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.full_name}>{t.full_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Status List */}
                    <div className="space-y-4">
                        {filteredStatuses.map((status) => {
                            const progress = (status.completed_chapters / status.total_chapters) * 100;
                            return (
                                <motion.div
                                    key={status.class_subject_id}
                                    layoutId={status.class_subject_id}
                                    onClick={() => fetchChapterDetails(status)}
                                    className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${selectedSubject?.class_subject_id === status.class_subject_id
                                        ? 'border-[#008B74] bg-white shadow-xl shadow-[#008B74]/5'
                                        : 'border-white bg-white hover:border-slate-200 hover:shadow-lg shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-md border border-slate-200">
                                                    {status.class_name}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {status.teacher_name}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-black text-slate-800 tracking-tight">
                                                {status.subject_name}
                                            </h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-[#008B74] tracking-tight">{Math.round(progress)}%</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {status.completed_chapters}/{status.total_chapters} Chapters
                                            </p>
                                        </div>
                                    </div>

                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            className="h-full bg-gradient-to-r from-[#008B74] to-[#00C4A0]"
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Detail Panel */}
                    <div className="lg:sticky lg:top-8 h-fit">
                        <AnimatePresence mode="wait">
                            {selectedSubject ? (
                                <motion.div
                                    key={selectedSubject.class_subject_id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
                                >
                                    <div className="p-8 bg-slate-900 text-white relative">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#008B74]/20 rounded-full -translate-y-16 translate-x-16" />
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#008B74] mb-2">Detailed Progress</h4>
                                        <h3 className="text-2xl font-black tracking-tight mb-1">{selectedSubject.subject_name}</h3>
                                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest leading-none">
                                            {selectedSubject.class_name} — {selectedSubject.teacher_name}
                                        </p>
                                    </div>

                                    <div className="p-8">
                                        {loadingDetails ? (
                                            <div className="py-20 text-center">
                                                <Loader2 className="w-8 h-8 animate-spin text-[#008B74] mx-auto mb-4" />
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Fetching Details...</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {['PWT1', 'Half Yearly', 'PWT2', 'Final'].map(term => {
                                                    const termChapters = chapterStatuses.filter(c => c.term === term);
                                                    if (termChapters.length === 0) return null;

                                                    return (
                                                        <div key={term}>
                                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                                                {term}
                                                                <div className="h-px flex-1 bg-slate-100" />
                                                            </h5>
                                                            <div className="space-y-3">
                                                                {termChapters.map(chapter => (
                                                                    <div key={chapter.id} className="group py-2">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <div className="flex items-center gap-3">
                                                                                {chapter.status === 'Completed' ? (
                                                                                    <CheckCircle2 className="w-5 h-5 text-[#008B74]" />
                                                                                ) : chapter.status === 'Started' ? (
                                                                                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                                                                                ) : (
                                                                                    <Circle className="w-5 h-5 text-slate-200" />
                                                                                )}
                                                                                <span className={`text-sm font-bold tracking-tight ${chapter.status !== 'Pending' ? 'text-slate-800' : 'text-slate-400 font-medium'}`}>
                                                                                    {chapter.chapter_name}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                {chapter.status === 'Completed' && chapter.completed_at && (
                                                                                    <span className="text-[10px] font-black text-[#008B74] bg-[#E2F2F0] px-2 py-0.5 rounded-md uppercase tracking-widest whitespace-nowrap">
                                                                                        Done {new Date(chapter.completed_at).toLocaleDateString()}
                                                                                    </span>
                                                                                )}
                                                                                {chapter.status === 'Started' && chapter.started_at && (
                                                                                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-widest whitespace-nowrap border border-amber-100">
                                                                                        Started {new Date(chapter.started_at).toLocaleDateString()}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Correction Work Percentage */}
                                                                        <div className="ml-8 flex flex-col gap-1">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Correction Work</span>
                                                                                <span className="text-[9px] font-black text-[#008B74] leading-none">{Math.round(chapter.correction_percentage)}%</span>
                                                                            </div>
                                                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className="h-full bg-linear-to-r from-[#008B74] to-[#00C4A0] rounded-full"
                                                                                    style={{ width: `${chapter.correction_percentage}%` }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                                        <ChevronRight className="w-8 h-8 text-slate-200" />
                                    </div>
                                    <h4 className="text-lg font-black text-slate-800 mb-2">Select a Subject</h4>
                                    <p className="text-slate-400 text-sm font-medium">Click on any subject to view detailed chapter completion status.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSyllabus;
