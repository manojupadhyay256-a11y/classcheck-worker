import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckSquare,
    BookOpen,
    Clock,
    ArrowLeft,
    CheckCircle2,
    GraduationCap,
    Filter,
    Loader2
} from 'lucide-react';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

interface Chapter {
    id: string;
    chapter_name: string;
    term: string;
    teaching_status: 'Pending' | 'Started' | 'Completed';
    is_correction_done: boolean;
    correction_date: string | null;
}

interface Subject {
    class_subject_id: string;
    subject_name: string;
}

const CorrectionStatus = () => {
    const { profile } = useAuthStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('all');
    const [selectedTerm, setSelectedTerm] = useState<string>('All');
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [studentData, setStudentData] = useState<{ id: string; class_id: string } | null>(null);

    const terms = ['All', 'PWT1', 'Half Yearly', 'PWT2', 'Final'];

    useEffect(() => {
        if (profile?.email) {
            fetchInitialData();
        }
    }, [profile?.email]);

    useEffect(() => {
        if (studentData) {
            fetchChapters();
        }
    }, [selectedSubject, studentData]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const admissionNo = profile!.email.split('@')[0];
            const studentResp = await sql`
                SELECT id, class_id FROM students WHERE admission_no = ${admissionNo} LIMIT 1
            `;

            if (studentResp[0]) {
                const sData = studentResp[0] as { id: string; class_id: string };
                setStudentData(sData);

                const subjectsResp = await sql`
                    SELECT cs.id as class_subject_id, s.name as subject_name 
                    FROM class_subjects cs 
                    JOIN subjects s ON cs.subject_id = s.id 
                    WHERE cs.class_id = ${sData.class_id}
                    ORDER BY s.name ASC
                `;
                setSubjects(subjectsResp as Subject[]);
            }
        } catch (error) {
            console.error('Error fetching student subjects:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChapters = async () => {
        if (!studentData) return;

        try {
            let chaptersResp;
            if (selectedSubject === 'all') {
                // Fetch all chapters for all subjects in the class
                chaptersResp = await sql`
                    SELECT sy.id, sy.chapter_name, sy.term, sy.status as teaching_status, 
                           cw.is_completed as is_correction_done, cw.updated_at as correction_date
                    FROM syllabus sy
                    JOIN class_subjects cs ON sy.class_subject_id = cs.id
                    LEFT JOIN correction_work cw ON sy.id = cw.chapter_id AND cw.student_id = ${studentData.id}
                    WHERE cs.class_id = ${studentData.class_id}
                    ORDER BY sy.term ASC, sy.order_index ASC
                `;
            } else {
                chaptersResp = await sql`
                    SELECT sy.id, sy.chapter_name, sy.term, sy.status as teaching_status, 
                           cw.is_completed as is_correction_done, cw.updated_at as correction_date
                    FROM syllabus sy
                    LEFT JOIN correction_work cw ON sy.id = cw.chapter_id AND cw.student_id = ${studentData.id}
                    WHERE sy.class_subject_id = ${selectedSubject}
                    ORDER BY sy.term ASC, sy.order_index ASC
                `;
            }
            setChapters(chaptersResp as Chapter[]);
        } catch (error) {
            console.error('Error fetching chapters:', error);
        }
    };

    const filteredChapters = chapters.filter(c =>
        selectedTerm === 'All' ? true : c.term?.split(',').includes(selectedTerm)
    );

    const totalChapters = filteredChapters.length;
    const completedCorrections = filteredChapters.filter(c => c.is_correction_done).length;
    const progressPercentage = totalChapters > 0 ? Math.round((completedCorrections / totalChapters) * 100) : 0;

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-amber-600" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Initializing Status...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 px-4 md:px-8 pt-4 md:pt-8 font-inter">
            {/* Header Section */}
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                            <button
                                onClick={() => navigate('/student')}
                                className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Learning Tracker</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none uppercase">
                            Copy <span className="text-amber-600">Corrections</span>
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1">
                            <Filter className="w-4 h-4 ml-2 text-slate-400" />
                            <select
                                value={selectedTerm}
                                onChange={(e) => setSelectedTerm(e.target.value)}
                                className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 cursor-pointer pr-8"
                            >
                                {terms.map(t => <option key={t} value={t}>{t === 'All' ? 'All Exams' : t}</option>)}
                            </select>
                        </div>
                        <div className="p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1">
                            <BookOpen className="w-4 h-4 ml-2 text-slate-400" />
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 cursor-pointer pr-8"
                            >
                                <option value="all">All Subjects</option>
                                {subjects.map(s => (
                                    <option key={s.class_subject_id} value={s.class_subject_id}>
                                        {s.subject_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Progress Overview Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[40px] p-8 md:p-10 border border-slate-100 shadow-2xl shadow-amber-900/5 mb-10 overflow-hidden relative group"
                >
                    <div className="absolute top-0 right-0 w-80 h-80 bg-amber-50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:opacity-80 transition-opacity" />

                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-2">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-amber-600 rounded-[20px] shadow-lg shadow-amber-600/20 flex items-center justify-center">
                                    <CheckSquare className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Overall Completion</p>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Correction Progress</h2>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-end justify-between mb-2">
                                    <span className="text-5xl font-black text-slate-900 tracking-tighter">{progressPercentage}%</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                        {completedCorrections} of {totalChapters} Chapters
                                    </span>
                                </div>
                                <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercentage}%` }}
                                        className="h-full bg-linear-to-r from-amber-500 to-amber-600"
                                    />
                                </div>
                                <p className="text-xs font-medium text-slate-400">
                                    Track your notebook corrections chapter by chapter across your subjects.
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 flex flex-col justify-center gap-2">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="text-2xl font-black text-slate-900">{completedCorrections}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Corrections Received</span>
                        </div>

                        <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 flex flex-col justify-center gap-2">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-2">
                                <Clock className="w-5 h-5 text-amber-600" />
                            </div>
                            <span className="text-2xl font-black text-slate-900">{totalChapters - completedCorrections}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Corrections</span>
                        </div>
                    </div>
                </motion.div>

                {/* Chapter List */}
                <div className="space-y-4">
                    <div className="flex items-center gap-4 px-4 mb-2">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Chapter Details</h3>
                        <div className="h-px flex-1 bg-slate-200/60" />
                    </div>

                    <AnimatePresence mode="popLayout">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredChapters.map((chapter) => (
                                <motion.div
                                    key={chapter.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ y: -4 }}
                                    className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded-md border border-slate-200">
                                                    {chapter.term}
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight group-hover:text-amber-600 transition-colors">
                                                {chapter.chapter_name}
                                            </h4>
                                        </div>
                                        {chapter.is_correction_done ? (
                                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 shadow-inner">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                                                <Clock className="w-5 h-5 text-slate-200" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">Correction</span>
                                            <span className={`text-[10px] font-black uppercase tracking-tight ${chapter.is_correction_done ? 'text-emerald-600' : 'text-amber-500'}`}>
                                                {chapter.is_correction_done ? 'Completed' : 'Pending'}
                                            </span>
                                        </div>
                                        {chapter.correction_date && (
                                            <div className="text-right">
                                                <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">Date</span>
                                                <p className="text-[10px] font-bold text-slate-600">
                                                    {new Date(chapter.correction_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </AnimatePresence>

                    {filteredChapters.length === 0 && (
                        <div className="py-24 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-100">
                            <GraduationCap className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                            <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest leading-none">No Chapters Found</h3>
                            <p className="text-slate-200 text-xs font-bold mt-2 uppercase tracking-wide">Either syllabus is empty or filters are too strict.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CorrectionStatus;
