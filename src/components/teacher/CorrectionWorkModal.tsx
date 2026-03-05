import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Search,
    User,
    Loader2,
    Save,
    CheckSquare,
    Square
} from 'lucide-react';
import { sql } from '../../lib/db';

interface Student {
    id: string;
    student_name: string;
    admission_no: string;
    is_completed?: boolean;
}

interface CorrectionWorkModalProps {
    isOpen: boolean;
    onClose: () => void;
    chapterId: string;
    chapterName: string;
    classId: string;
}

const CorrectionWorkModal = ({ isOpen, onClose, chapterId, chapterName, classId }: CorrectionWorkModalProps) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen && chapterId && classId) {
            fetchData();
        }
    }, [isOpen, chapterId, classId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all students in class and their completion status for this chapter
            const [studentsData, statusData] = await Promise.all([
                sql`SELECT id, student_name, admission_no FROM students WHERE class_id = ${classId} ORDER BY student_name`,
                sql`SELECT student_id, is_completed FROM correction_work WHERE chapter_id = ${chapterId}`
            ]);

            const completionMap = new Map((statusData as any[]).map(s => [s.student_id, s.is_completed]));

            const updatedStudents = (studentsData as Student[]).map(student => ({
                ...student,
                is_completed: completionMap.get(student.id) || false
            }));

            setStudents(updatedStudents);
        } catch (error) {
            console.error('Error fetching students and correction status:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStudent = (id: string) => {
        setStudents(prev => prev.map(s =>
            s.id === id ? { ...s, is_completed: !s.is_completed } : s
        ));
    };

    const toggleAll = () => {
        const allCompleted = students.every(s => s.is_completed);
        setStudents(prev => prev.map(s => ({ ...s, is_completed: !allCompleted })));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // We use a transaction or multiple upserts
            // For simplicity and since students in a class are usually < 50, we can do it in one go or multiple
            // But let's use a cleaner approach: Delete all existing for this chapter and insert the completed ones
            // Actually, an upsert for each is better to avoid data loss if something fails

            // Delete all and re-insert is simple but destructive to updated_at if it's not changing
            // Let's use ON CONFLICT

            const promises = students.map(s =>
                sql`
                    INSERT INTO correction_work (chapter_id, student_id, is_completed, updated_at)
                    VALUES (${chapterId}, ${s.id}, ${s.is_completed || false}, NOW())
                    ON CONFLICT (chapter_id, student_id) 
                    DO UPDATE SET is_completed = EXCLUDED.is_completed, updated_at = NOW()
                `
            );

            await Promise.all(promises);
            onClose();
        } catch (error) {
            console.error('Error saving correction work:', error);
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const completedCount = students.filter(s => s.is_completed).length;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-[#1E293B] px-8 py-6 text-white">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight mb-1">Correction Work</h3>
                                    <p className="text-[#008B74] text-xs font-black uppercase tracking-widest">{chapterName}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Search and Summary */}
                            <div className="flex flex-col md:flex-row gap-4 mt-6">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search student..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-[#008B74] transition-all"
                                    />
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 flex items-center justify-between gap-8">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</p>
                                        <p className="text-lg font-black text-[#008B74]">{completedCount}/{students.length}</p>
                                    </div>
                                    <button
                                        onClick={toggleAll}
                                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-[#008B74] text-white rounded-lg hover:bg-[#00705E] transition-all"
                                    >
                                        {students.every(s => s.is_completed) ? 'Uncheck All' : 'Check All'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[50vh] overflow-y-auto p-2 bg-slate-50">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="w-8 h-8 text-[#008B74] animate-spin mb-4" />
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Students...</p>
                                </div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="text-center py-20">
                                    <User className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 font-medium">No students found.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {filteredStudents.map((student) => (
                                        <div
                                            key={student.id}
                                            onClick={() => toggleStudent(student.id)}
                                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${student.is_completed
                                                ? 'border-[#008B74] bg-white shadow-md shadow-[#008B74]/5'
                                                : 'border-white bg-white hover:border-slate-100 shadow-sm'
                                                }`}
                                        >
                                            <div className="flex-1">
                                                <p className="text-sm font-black text-slate-800 tracking-tight leading-tight mb-1">
                                                    {student.student_name}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    Adm: {student.admission_no}
                                                </p>
                                            </div>
                                            {student.is_completed ? (
                                                <CheckSquare className="w-6 h-6 text-[#008B74]" />
                                            ) : (
                                                <Square className="w-6 h-6 text-slate-200" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-slate-100 bg-white flex justify-end gap-4">
                            <button
                                onClick={onClose}
                                className="px-8 py-3.5 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || loading}
                                className="px-10 py-3.5 bg-[#008B74] text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-[#008B74]/30 hover:bg-[#00705E] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CorrectionWorkModal;
