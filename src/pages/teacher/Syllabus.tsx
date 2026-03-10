import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Edit2,
    Loader2,
    BookOpen,
    Save,
    X,
    Copy,
    CheckCircle2,
    Circle,
    CheckSquare,
    ChevronRight
} from 'lucide-react';
import { sql } from '../../lib/db';
import CorrectionWorkModal from '../../components/teacher/CorrectionWorkModal';
import { toast } from 'sonner';

interface Chapter {
    id: string;
    chapter_name: string;
    description: string;
    term: string; // Comma separated terms e.g. "PWT1,Half Yearly"
    status: 'Pending' | 'Started' | 'Completed';
    started_at: string | null;
    completed_at: string | null;
    order_index: number;
}

interface SubjectInfo {
    class_name: string;
    subject_name: string;
    subject_id: string;
    teacher_id: string;
    class_id: string;
}

interface CopySource {
    class_subject_id: string;
    class_name: string;
    subject_name: string;
    chapter_count: number;
}

const Syllabus = () => {
    const { classSubjectId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [subjectInfo, setSubjectInfo] = useState<SubjectInfo | null>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
    const [formData, setFormData] = useState({
        chapter_name: '',
        description: '',
        terms: ['Half Yearly'] as string[]
    });
    const [isTermDropdownOpen, setIsTermDropdownOpen] = useState(false);

    // Copy modal state
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [copySources, setCopySources] = useState<CopySource[]>([]);
    const [loadingCopySources, setLoadingCopySources] = useState(false);
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [isCopying, setIsCopying] = useState(false);

    // Correction modal state
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    const [selectedChapterForCorrection, setSelectedChapterForCorrection] = useState<Chapter | null>(null);

    useEffect(() => {
        if (classSubjectId) {
            fetchData();
        }
    }, [classSubjectId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [infoData, chaptersData] = await Promise.all([
                sql`
                    SELECT c.name as class_name, s.name as subject_name, cs.subject_id, cs.teacher_id, cs.class_id
                    FROM class_subjects cs
                    JOIN classes c ON cs.class_id = c.id
                    JOIN subjects s ON cs.subject_id = s.id
                    WHERE cs.id = ${classSubjectId}
                `,
                sql`
                    SELECT id, chapter_name, description, term, status, started_at, completed_at, order_index
                    FROM syllabus
                    WHERE class_subject_id = ${classSubjectId}
                    ORDER BY term ASC, order_index ASC
                `
            ]);

            if (infoData[0]) setSubjectInfo(infoData[0] as SubjectInfo);
            setChapters(chaptersData as Chapter[]);
        } catch (error) {
            console.error('Error fetching syllabus data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCopySources = async () => {
        if (!subjectInfo) return;
        setLoadingCopySources(true);
        try {
            const data = await sql`
                SELECT 
                    cs.id as class_subject_id,
                    c.name as class_name,
                    s.name as subject_name,
                    (SELECT COUNT(*) FROM syllabus WHERE class_subject_id = cs.id) as chapter_count
                FROM class_subjects cs
                JOIN classes c ON cs.class_id = c.id
                JOIN subjects s ON cs.subject_id = s.id
                WHERE cs.subject_id = ${subjectInfo.subject_id}
                AND cs.teacher_id = ${subjectInfo.teacher_id}
                AND cs.id != ${classSubjectId}
                AND (SELECT COUNT(*) FROM syllabus WHERE class_subject_id = cs.id) > 0
                ORDER BY c.name
            `;
            setCopySources(data as CopySource[]);
        } catch (error) {
            console.error('Error fetching copy sources:', error);
        } finally {
            setLoadingCopySources(false);
        }
    };

    const handleOpenCopyModal = () => {
        setSelectedSource(null);
        setIsCopyModalOpen(true);
        fetchCopySources();
    };

    const handleCopySyllabus = async () => {
        if (!selectedSource) return;
        setIsCopying(true);

        const copyPromise = (async () => {
            await sql`
                INSERT INTO syllabus (class_subject_id, chapter_name, description, term, order_index)
                SELECT ${classSubjectId}, chapter_name, description, term, order_index
                FROM syllabus
                WHERE class_subject_id = ${selectedSource}
                ORDER BY order_index
            `;
            setIsCopyModalOpen(false);
            setSelectedSource(null);
            fetchData();
        })();

        toast.promise(copyPromise, {
            loading: 'Copying syllabus chapters...',
            success: 'Syllabus copied successfully!',
            error: 'Failed to copy syllabus. Please try again.'
        });

        try {
            await copyPromise;
        } catch (error) {
            console.error('Error copying syllabus:', error);
        } finally {
            setIsCopying(false);
        }
    };

    const handleOpenModal = (chapter?: Chapter) => {
        if (chapter) {
            setEditingChapter(chapter);
            setFormData({
                chapter_name: chapter.chapter_name,
                description: chapter.description || '',
                terms: chapter.term ? chapter.term.split(',') : ['Half Yearly']
            });
        } else {
            setEditingChapter(null);
            setFormData({
                chapter_name: '',
                description: '',
                terms: ['Half Yearly']
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.chapter_name.trim()) return;

        setIsSaving(true);

        const savePromise = (async () => {
            const termsString = formData.terms.join(',');
            if (editingChapter) {
                await sql`
                    UPDATE syllabus 
                    SET 
                        chapter_name = ${formData.chapter_name.trim()},
                        description = ${formData.description.trim()},
                        term = ${termsString},
                        updated_at = NOW()
                    WHERE id = ${editingChapter.id}
                `;
            } else {
                const nextOrder = chapters.length > 0 ? Math.max(...chapters.map(c => c.order_index)) + 1 : 1;
                await sql`
                    INSERT INTO syllabus (class_subject_id, chapter_name, description, term, order_index)
                    VALUES (${classSubjectId}, ${formData.chapter_name.trim()}, ${formData.description.trim()}, ${termsString}, ${nextOrder})
                `;
            }
            fetchData();
            setIsModalOpen(false);
        })();

        toast.promise(savePromise, {
            loading: editingChapter ? 'Updating chapter...' : 'Adding chapter...',
            success: editingChapter ? 'Chapter updated successfully!' : 'Chapter added successfully!',
            error: 'Failed to save chapter.'
        });

        try {
            await savePromise;
        } catch (error) {
            console.error('Error saving chapter:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async (chapter: Chapter) => {
        let updates: any = { status: 'Started', started_at: new Date().toISOString(), completed_at: null };

        if (chapter.status === 'Started') {
            updates = { status: 'Completed', started_at: chapter.started_at, completed_at: new Date().toISOString() };
        } else if (chapter.status === 'Completed') {
            updates = { status: 'Pending', started_at: null, completed_at: null };
        }

        const updatePromise = sql`
            UPDATE syllabus 
            SET 
                status = ${updates.status},
                started_at = ${updates.started_at},
                completed_at = ${updates.completed_at},
                updated_at = NOW()
            WHERE id = ${chapter.id}
        `;

        toast.promise(updatePromise, {
            loading: 'Updating status...',
            success: `Chapter marked as ${updates.status}`,
            error: 'Failed to update status'
        });

        try {
            await updatePromise;
            fetchData();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete chapter "${name}"?`)) return;

        const deletePromise = sql`DELETE FROM syllabus WHERE id = ${id}`;

        toast.promise(deletePromise, {
            loading: 'Deleting chapter...',
            success: 'Chapter deleted successfully!',
            error: 'Failed to delete chapter'
        });

        try {
            await deletePromise;
            fetchData();
        } catch (error) {
            console.error('Error deleting chapter:', error);
        }
    };

    const syllabusProgress = {
        total: chapters.length,
        completed: chapters.filter(c => c.status === 'Completed').length
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-amber-600" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Fetching Syllabus...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-inter">
            {/* Premium Header */}
            <div className="bg-slate-900 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full -translate-y-48 translate-x-48 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/5 rounded-full translate-y-32 -translate-x-32 blur-2xl" />

                <div className="max-w-5xl mx-auto px-6 pt-12 pb-20 relative z-10">
                    <button
                        onClick={() => navigate('/teacher/subjects')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-10 group/back"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to My Subjects</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-amber-600 rounded-[28px] flex items-center justify-center shadow-2xl shadow-amber-900/20 border border-amber-500/50">
                                <BookOpen className="w-10 h-10 text-white" strokeWidth={2.5} />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="px-3 py-1 bg-white/5 text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-white/5">
                                        {subjectInfo?.class_name}
                                    </span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Syllabus Planning</span>
                                </div>
                                <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight uppercase">
                                    {subjectInfo?.subject_name}
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {chapters.length > 0 && (
                                <button
                                    onClick={handleOpenCopyModal}
                                    className="px-6 py-4 bg-white/5 text-white font-black uppercase tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-[10px] flex items-center gap-2"
                                >
                                    <Copy className="w-4 h-4" />
                                    Copy Options
                                </button>
                            )}
                            <button
                                onClick={() => handleOpenModal()}
                                className="flex items-center gap-2 px-8 py-4 bg-amber-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-900/10 hover:bg-amber-700 hover:scale-[1.02] active:scale-95 transition-all text-[10px] border border-amber-500/50"
                            >
                                <Plus className="w-4 h-4" strokeWidth={3} />
                                Add Chapter
                            </button>
                        </div>
                    </div>

                    {/* Chapter count indicator */}
                    {chapters.length > 0 && (
                        <div className="mt-6 flex items-center gap-3">
                            <div className="h-6 bg-slate-100/10 rounded-full overflow-hidden relative flex-1">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.round((syllabusProgress.completed / Math.max(1, syllabusProgress.total)) * 100)}%` }}
                                    className="h-full bg-linear-to-r from-amber-500 to-amber-600"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white/60 text-[10px] font-black uppercase tracking-widest whitespace-nowrap drop-shadow-sm">
                                        {Math.round((syllabusProgress.completed / Math.max(1, syllabusProgress.total)) * 100)}% Completed
                                    </span>
                                </div>
                            </div>
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                {chapters.length} Chapter{chapters.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 -mt-10 relative z-20 pb-20">
                {/* Content Grouped by Term */}
                {['PWT1', 'Half Yearly', 'PWT2', 'Final'].map((term) => {
                    const termChapters = chapters.filter(c => c.term?.split(',').includes(term));
                    if (termChapters.length === 0 && chapters.length > 0) return null;
                    if (chapters.length === 0 && term !== 'PWT1') return null;

                    return (
                        <div key={term} className="mb-12">
                            <div className="flex items-center gap-4 mb-6">
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
                                    {term}
                                </h2>
                                <div className="h-px flex-1 bg-slate-200" />
                            </div>

                            {termChapters.length > 0 ? (
                                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="bg-amber-600 px-6 py-4">
                                        <h3 className="text-white font-black text-sm uppercase tracking-widest">Chapters Progress</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <tbody>
                                                {termChapters.map((chapter, idx) => (
                                                    <tr key={chapter.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-6 py-6 text-sm font-black text-slate-400">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black text-slate-800 tracking-tight">{chapter.chapter_name}</span>
                                                                <span className="text-[11px] text-slate-400 font-medium truncate max-w-xs">{chapter.description || 'No description'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className="flex items-center gap-2">
                                                                {chapter.status === 'Completed' ? (
                                                                    <div className="flex items-center gap-2 text-amber-600">
                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Completed</span>
                                                                    </div>
                                                                ) : chapter.status === 'Started' ? (
                                                                    <div className="flex items-center gap-2 text-amber-500">
                                                                        <Loader2 className="w-4 h-4 animate-spin-slow" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Started</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 text-slate-300">
                                                                        <Circle className="w-4 h-4" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Pending</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6 text-sm font-bold text-slate-500">
                                                            {chapter.completed_at ? new Date(chapter.completed_at).toLocaleDateString() : '-'}
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedChapterForCorrection(chapter);
                                                                        setIsCorrectionModalOpen(true);
                                                                    }}
                                                                    className="px-4 py-2 bg-white text-slate-600 font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-[11px] shadow-sm active:scale-95 flex items-center gap-2"
                                                                >
                                                                    <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                                                                    Check Work
                                                                </button>
                                                                <button
                                                                    onClick={() => handleToggleStatus(chapter)}
                                                                    className={`px-6 py-2 rounded-lg font-black text-[11px] tracking-widest uppercase transition-all shadow-sm active:scale-95 ${chapter.status === 'Completed'
                                                                        ? 'bg-slate-100 text-slate-400'
                                                                        : 'bg-amber-600 text-white shadow-amber-900/10'
                                                                        }`}
                                                                >
                                                                    {chapter.status === 'Completed' ? 'Done' : chapter.status === 'Started' ? 'Complete' : 'Start'}
                                                                </button>
                                                                <div className="flex items-center ml-2 border-l border-slate-100 pl-2">
                                                                    <button
                                                                        onClick={() => handleOpenModal(chapter)}
                                                                        className="p-2 text-slate-400 hover:text-amber-600 transition-all"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(chapter.id, chapter.chapter_name)}
                                                                        className="p-2 text-slate-400 hover:text-rose-600 transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : chapters.length === 0 && term === 'PWT1' ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col items-center justify-center px-4"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-amber-500/5 to-transparent rounded-full translate-x-16 -translate-y-16" />
                                    <div className="w-24 h-24 bg-linear-to-br from-amber-50 to-amber-100 rounded-[32px] flex items-center justify-center mb-8 border border-amber-200 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                        <BookOpen className="w-10 h-10 text-amber-600" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Your Syllabus is Empty</h3>
                                    <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto">
                                        Start building your course structure by adding chapters, or copy from another section.
                                    </p>
                                    <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
                                        <button
                                            onClick={handleOpenCopyModal}
                                            className="px-6 py-3.5 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 text-sm shadow-sm active:scale-95"
                                        >
                                            <Copy className="w-4 h-4" />
                                            Copy From Another Section
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal()}
                                            className="px-6 py-3.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all flex items-center gap-2 text-sm shadow-lg shadow-amber-900/10 active:scale-95"
                                        >
                                            <Plus className="w-4 h-4" strokeWidth={3} />
                                            Add Your First Chapter
                                        </button>
                                    </div>
                                </motion.div>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isSaving && setIsModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden"
                        >
                            <div className="px-8 py-6 text-white relative flex items-center justify-between overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full -translate-y-16 translate-x-16" />
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="p-3 bg-amber-600 rounded-xl shadow-lg shadow-amber-900/10">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight">
                                            {editingChapter ? 'Edit Chapter' : 'New Chapter'}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-400 mt-0.5">Define your chapter</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="relative z-10 p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Chapter Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.chapter_name}
                                            onChange={(e) => setFormData({ ...formData, chapter_name: e.target.value })}
                                            placeholder="Enter chapter name..."
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all outline-none text-sm font-bold placeholder:text-slate-300"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Academic Terms
                                        </label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsTermDropdownOpen(!isTermDropdownOpen)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all outline-none text-sm font-bold flex items-center justify-between group"
                                            >
                                                <span className={formData.terms.length > 0 ? 'text-slate-800' : 'text-slate-300'}>
                                                    {formData.terms.length > 0 ? formData.terms.join(', ') : 'Select Terms'}
                                                </span>
                                                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isTermDropdownOpen ? 'rotate-90' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                                {isTermDropdownOpen && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-30"
                                                            onClick={() => setIsTermDropdownOpen(false)}
                                                        />
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                            className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/50 z-40 p-2 overflow-hidden"
                                                        >
                                                            {['PWT1', 'Half Yearly', 'PWT2', 'Final'].map((t) => (
                                                                <button
                                                                    key={t}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const currentTerms = [...formData.terms];
                                                                        if (currentTerms.includes(t)) {
                                                                            if (currentTerms.length > 1) {
                                                                                setFormData({ ...formData, terms: currentTerms.filter(term => term !== t) });
                                                                            } else {
                                                                                toast.error('At least one term must be selected');
                                                                            }
                                                                        } else {
                                                                            setFormData({ ...formData, terms: [...currentTerms, t] });
                                                                        }
                                                                    }}
                                                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${formData.terms.includes(t)
                                                                        ? 'bg-amber-50 text-amber-700'
                                                                        : 'hover:bg-slate-50 text-slate-600'
                                                                        }`}
                                                                >
                                                                    <span className="text-xs font-bold">{t}</span>
                                                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${formData.terms.includes(t)
                                                                        ? 'bg-amber-600 border-amber-600'
                                                                        : 'bg-white border-slate-200'
                                                                        }`}>
                                                                        {formData.terms.includes(t) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        placeholder="What will students learn in this chapter?"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all outline-none text-sm font-bold placeholder:text-slate-300 resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all text-[10px]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-amber-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-900/10 hover:bg-amber-700 transition-all text-[10px] disabled:opacity-50 border border-amber-500/50"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        {editingChapter ? 'Update Chapter' : 'Add Chapter'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Copy Syllabus Modal */}
            <AnimatePresence>
                {isCopyModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isCopying && setIsCopyModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden"
                        >
                            <div className="px-8 py-6 text-white relative flex items-center justify-between overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full -translate-y-16 translate-x-16" />
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="p-3 bg-amber-600 rounded-xl shadow-lg shadow-amber-900/10">
                                        <Copy className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight">Copy Syllabus</h3>
                                        <p className="text-xs font-bold text-slate-400 mt-0.5">Reuse from another section</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsCopyModalOpen(false)}
                                    className="relative z-10 p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8">
                                {loadingCopySources ? (
                                    <div className="py-12 flex flex-col items-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-4" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Finding sources...</p>
                                    </div>
                                ) : copySources.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <BookOpen className="w-8 h-8 text-slate-200" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-400">No other sections found with syllabus content.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Source Section</p>
                                        <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                            {copySources.map((source) => (
                                                <button
                                                    key={source.class_subject_id}
                                                    onClick={() => setSelectedSource(source.class_subject_id)}
                                                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between group ${selectedSource === source.class_subject_id
                                                        ? 'border-amber-600 bg-amber-50 shadow-inner'
                                                        : 'border-slate-100 hover:border-amber-200 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selectedSource === source.class_subject_id ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-600'}`}>
                                                            <BookOpen className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-800 text-sm tracking-tight">{source.class_name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{source.subject_name}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${selectedSource === source.class_subject_id ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-500'}`}>
                                                        {source.chapter_count} Chapters
                                                    </span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex gap-3 pt-6">
                                            <button
                                                onClick={() => setIsCopyModalOpen(false)}
                                                className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all text-[10px]"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleCopySyllabus}
                                                disabled={!selectedSource || isCopying}
                                                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-amber-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-900/10 hover:bg-amber-700 transition-all text-[10px] disabled:opacity-50 border border-amber-500/50"
                                            >
                                                {isCopying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                                Copy Chapters
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Correction Progress Modal */}
            {selectedChapterForCorrection && (
                <CorrectionWorkModal
                    isOpen={isCorrectionModalOpen}
                    onClose={() => {
                        setIsCorrectionModalOpen(false);
                        setSelectedChapterForCorrection(null);
                    }}
                    chapterId={selectedChapterForCorrection.id}
                    chapterName={selectedChapterForCorrection.chapter_name}
                    classId={subjectInfo?.class_id || ''}
                />
            )}
        </div>
    );
};

export default Syllabus;
