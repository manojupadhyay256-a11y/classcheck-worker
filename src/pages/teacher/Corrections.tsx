import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckSquare,
    BookOpen,
    Users,
    Search,
    Loader2,
    Save,
    ChevronDown,
    CheckCircle2,
    ArrowLeft,
    X
} from 'lucide-react';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AssignedSubject {
    id: string; // class_subject_id
    class_id: string;
    class_name: string;
    subject_name: string;
    student_count: number;
}

interface Chapter {
    id: string;
    chapter_name: string;
    term: string;
    completed_at: string | null;
    correction_stats?: {
        total: number;
        completed: number;
    };
}

interface Student {
    id: string;
    student_name: string;
    admission_no: string;
    is_completed: boolean;
}

const TeacherCorrections = () => {
    const { profile } = useAuthStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<AssignedSubject[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [selectedExam, setSelectedExam] = useState<string>('All Exams');
    const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (profile?.email) {
            fetchTeacherSubjects();
        }
    }, [profile?.email]);

    useEffect(() => {
        if (selectedSubjectId) {
            fetchChapters();
            setSelectedExam('All Exams');
            setExpandedChapterId(null);
            setStudents([]);
        }
    }, [selectedSubjectId]);

    useEffect(() => {
        if (expandedChapterId) {
            fetchStudents(expandedChapterId);
        }
    }, [expandedChapterId]);

    const fetchTeacherSubjects = async () => {
        setLoading(true);
        try {
            const data = await sql`
                SELECT 
                    cs.id,
                    cs.class_id,
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
            if (data.length > 0) {
                setSelectedSubjectId(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching teacher subjects:', error);
            toast.error('Failed to load classes');
        } finally {
            setLoading(false);
        }
    };

    const fetchChapters = async () => {
        try {
            const chaptersData = await sql`
                SELECT id, chapter_name, term, completed_at
                FROM syllabus
                WHERE class_subject_id = ${selectedSubjectId}
                ORDER BY term ASC, order_index ASC
            `;

            // For each chapter, get correction stats
            const statsData = await sql`
                SELECT 
                    chapter_id,
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE is_completed = true) as completed
                FROM correction_work
                WHERE chapter_id IN (SELECT id FROM syllabus WHERE class_subject_id = ${selectedSubjectId})
                GROUP BY chapter_id
            `;

            const statsMap = new Map((statsData as any[]).map(s => [s.chapter_id, { total: s.total, completed: s.completed }]));

            setChapters((chaptersData as Chapter[]).map(chapter => ({
                ...chapter,
                correction_stats: statsMap.get(chapter.id) || { total: 0, completed: 0 }
            })));
        } catch (error) {
            console.error('Error fetching chapters:', error);
        }
    };

    const fetchStudents = async (chapterId: string) => {
        setLoadingStudents(true);
        try {
            const currentSubject = subjects.find(s => s.id === selectedSubjectId);
            if (!currentSubject) return;

            const [studentsData, correctionData] = await Promise.all([
                sql`SELECT id, student_name, admission_no FROM students WHERE class_id = ${currentSubject.class_id} ORDER BY student_name`,
                sql`SELECT student_id, is_completed FROM correction_work WHERE chapter_id = ${chapterId}`
            ]);

            const correctionMap = new Map((correctionData as any[]).map(c => [c.student_id, c.is_completed]));

            setStudents((studentsData as any[]).map(student => ({
                ...student,
                is_completed: correctionMap.get(student.id) || false
            })));
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoadingStudents(false);
        }
    };

    const toggleStudent = (id: string) => {
        setStudents(prev => prev.map(s =>
            s.id === id ? { ...s, is_completed: !s.is_completed } : s
        ));
    };

    const toggleAll = () => {
        const allDone = students.every(s => s.is_completed);
        setStudents(prev => prev.map(s => ({ ...s, is_completed: !allDone })));
    };

    const handleSave = async () => {
        if (!expandedChapterId) return;
        setSaving(true);
        try {
            const promises = students.map(s =>
                sql`
                    INSERT INTO correction_work (chapter_id, student_id, is_completed, updated_at)
                    VALUES (${expandedChapterId}, ${s.id}, ${s.is_completed || false}, NOW())
                    ON CONFLICT (chapter_id, student_id) 
                    DO UPDATE SET is_completed = EXCLUDED.is_completed, updated_at = NOW()
                `
            );
            await Promise.all(promises);
            toast.success('Corrections updated successfully');
            fetchChapters(); // Refresh stats
            setExpandedChapterId(null);
        } catch (error) {
            console.error('Error saving corrections:', error);
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const uniqueExams = ['All Exams', ...new Set(chapters.map(c => c.term))];
    const filteredChapters = selectedExam === 'All Exams'
        ? chapters
        : chapters.filter(c => c.term === selectedExam);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-amber-600" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Organizing Correction Desk...</p>
            </div>
        );
    }

    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

    return (
        <div className="min-h-screen bg-[#F8F9FB] pb-24 px-4 md:px-8 pt-4 md:pt-8 font-sans">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-amber-600 mb-2">
                            <button onClick={() => navigate('/teacher')} className="p-2 hover:bg-white rounded-xl transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Academic Management</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
                            Notebook <span className="text-amber-600">Corrections</span>
                        </h1>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="relative group">
                            <select
                                value={selectedSubjectId}
                                onChange={(e) => setSelectedSubjectId(e.target.value)}
                                className="w-full md:w-64 pl-12 pr-10 py-4 bg-white border border-slate-100/80 rounded-2xl text-sm font-bold text-slate-700 tracking-tight focus:ring-4 focus:ring-amber-100 focus:border-amber-600 transition-all appearance-none cursor-pointer shadow-sm"
                            >
                                {subjects.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.class_name} - {s.subject_name}
                                    </option>
                                ))}
                            </select>
                            <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600" />
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        </div>

                        <div className="relative group">
                            <select
                                value={selectedExam}
                                onChange={(e) => setSelectedExam(e.target.value)}
                                className="w-full md:w-48 pl-12 pr-10 py-4 bg-white border border-slate-100/80 rounded-2xl text-sm font-bold text-slate-700 tracking-tight focus:ring-4 focus:ring-amber-100 focus:border-amber-600 transition-all appearance-none cursor-pointer shadow-sm"
                            >
                                {uniqueExams.map(exam => (
                                    <option key={exam} value={exam}>{exam}</option>
                                ))}
                            </select>
                            <CheckSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600" />
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        </div>
                    </div>
                </div>

                {/* Chapter List */}
                <div className="space-y-4">
                    <div className="flex items-center gap-4 px-4 mb-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Correction Desk</h3>
                        <div className="h-px flex-1 bg-slate-200/60" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredChapters.map((chapter) => (
                            <motion.div
                                key={chapter.id}
                                layout
                                onClick={() => setExpandedChapterId(chapter.id)}
                                className="p-6 mobile-card cursor-pointer transition-all duration-300 relative overflow-hidden group hover:border-amber-600 hover:shadow-xl hover:shadow-amber-900/5 active:scale-[0.98]"
                            >
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded-md border border-slate-200">
                                            {chapter.term}
                                        </span>
                                        {chapter.correction_stats && chapter.correction_stats.completed === chapter.correction_stats.total && chapter.correction_stats.total > 0 && (
                                            <div className="flex items-center gap-1 text-emerald-600">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span className="text-[8px] font-black uppercase tracking-widest">Done</span>
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="text-[17px] font-bold text-slate-900 tracking-tight leading-tight group-hover:text-amber-600 transition-colors mb-4 line-clamp-2">
                                        {chapter.chapter_name}
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            <span>Progress</span>
                                            <span className="text-amber-600 font-black">{chapter.correction_stats?.completed}/{selectedSubject?.student_count}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(chapter.correction_stats?.completed || 0) / (selectedSubject?.student_count || 1) * 100}%` }}
                                                className="h-full bg-amber-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Mobile/Global Modal for Student List */}
                <AnimatePresence>
                    {expandedChapterId && (
                        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setExpandedChapterId(null)}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            />

                            <motion.div
                                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                                className="relative w-full max-w-2xl bg-[#F8F9FB] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-[85vh] mx-auto border-t sm:border border-white/20"
                            >
                                {/* Modal Header */}
                                <div className="bg-amber-600 p-6 md:p-10 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-8 -translate-y-8 blur-2xl" />
                                    <button
                                        onClick={() => setExpandedChapterId(null)}
                                        className="absolute right-6 top-6 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all border border-white/20 z-20"
                                    >
                                        <X className="w-5 h-5 text-white" />
                                    </button>

                                    <div className="pr-12 relative z-10">
                                        <p className="text-amber-100/90 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                                            {chapters.find(c => c.id === expandedChapterId)?.chapter_name}
                                        </p>
                                        <h3 className="text-xl md:text-3xl font-black tracking-tight leading-tight">Correction Desk</h3>
                                    </div>

                                    <div className="mt-8 flex flex-col md:flex-row gap-4 relative z-10">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Search student..."
                                                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:bg-white/20 transition-all font-medium"
                                            />
                                        </div>
                                        <button
                                            onClick={toggleAll}
                                            className="px-6 py-3 bg-white text-amber-600 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-amber-900/10 hover:bg-amber-50"
                                        >
                                            {students.every(s => s.is_completed) ? 'Unmark All' : 'Mark All Done'}
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Body */}
                                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                    {loadingStudents ? (
                                        <div className="flex flex-col items-center justify-center py-20">
                                            <Loader2 className="w-10 h-10 text-amber-600 animate-spin mb-4" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching Class Data...</p>
                                        </div>
                                    ) : filteredStudents.length === 0 ? (
                                        <div className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-100">
                                            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No student found</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {filteredStudents.map((student) => (
                                                <motion.div
                                                    key={student.id}
                                                    layout
                                                    onClick={() => toggleStudent(student.id)}
                                                    className={`p-4 mobile-card border-2 cursor-pointer flex items-center gap-4 transition-all ${student.is_completed
                                                        ? 'border-emerald-500/20 bg-emerald-50/50'
                                                        : 'hover:border-slate-200'
                                                        }`}
                                                >
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-slate-800 tracking-tight leading-none mb-1">
                                                            {student.student_name}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            ADM: {student.admission_no}
                                                        </p>
                                                    </div>
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${student.is_completed
                                                        ? 'bg-emerald-500 border-emerald-600 shadow-lg shadow-emerald-200'
                                                        : 'bg-white border-slate-100 shadow-sm'
                                                        }`}>
                                                        {student.is_completed ? (
                                                            <CheckSquare className="w-5 h-5 text-white" />
                                                        ) : (
                                                            <div className="w-4 h-4 rounded-md border-2 border-slate-200" />
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="p-6 md:p-8 border-t border-slate-100 bg-white shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-center justify-between gap-6">
                                    <div className="text-center sm:text-left">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Correction Progress</span>
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                                            <span className="text-emerald-500">{students.filter(s => s.is_completed).length}</span>
                                            <span className="text-slate-200 mx-2">/</span>
                                            {students.length} <span className="text-xs font-bold text-slate-400 uppercase">Corrected</span>
                                        </p>
                                    </div>
                                    <div className="flex w-full sm:w-auto">
                                        <button
                                            onClick={handleSave}
                                            disabled={saving || loadingStudents}
                                            className="w-full sm:w-auto px-10 py-4 bg-amber-600 text-white font-bold uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl shadow-amber-900/10 hover:bg-amber-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                        >
                                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            Update Corrections
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {chapters.length === 0 && !loading && (
                    <div className="py-32 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-100">
                        <BookOpen className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">No Chapters Found</h3>
                        <p className="text-slate-200 text-sm font-bold mt-2">Add chapters in the Syllabus section to start tracking corrections.</p>
                        <button
                            onClick={() => navigate(`/teacher/my-subjects`)}
                            className="mt-8 px-8 py-3 bg-amber-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-900/10"
                        >
                            Go to My Subjects
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherCorrections;
