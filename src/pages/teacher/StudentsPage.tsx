import { useState, useEffect } from 'react';
import { Search, Users, Phone, Loader2, Key, X, Shield, Lock } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { sql } from '../../lib/db';

interface Student {
    id: string;
    admission_no: string;
    student_name: string;
    father_name: string;
    mother_name: string;
    phone_number: string;
    category: string;
    is_login_enabled: boolean;
    password?: string;
}

const TeacherStudents = () => {
    const { profile } = useAuthStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [className, setClassName] = useState('');
    const [classId, setClassId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Password Modal State
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // Bulk Password State
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkPassword, setBulkPassword] = useState('dps@123');
    const [isBulkSaving, setIsBulkSaving] = useState(false);

    const fetchStudents = async () => {
        if (!profile?.email) return;
        setIsLoading(true);
        setError(null);
        try {
            // 1. Find teacher ID from email
            const teacherResult = await sql`
                SELECT id FROM teachers WHERE LOWER(email) = LOWER(${profile.email}) LIMIT 1
            `;

            if (teacherResult.length === 0) {
                setError('Teacher profile not found.');
                setIsLoading(false);
                return;
            }

            const teacherId = teacherResult[0].id;

            // 2. Find assigned class
            const classResult = await sql`
                SELECT id, name FROM classes WHERE class_teacher_id = ${teacherId} LIMIT 1
            `;

            if (classResult.length === 0) {
                setError('No class assigned to you yet.');
                setIsLoading(false);
                return;
            }

            setClassName(classResult[0].name);
            setClassId(classResult[0].id);

            // 3. Fetch students in that class
            const studentsResult = await sql`
                SELECT id, admission_no, student_name, father_name, mother_name, phone_number, category, is_login_enabled, password
                FROM students
                WHERE class_id = ${classResult[0].id}
                ORDER BY student_name ASC
            `;

            setStudents(studentsResult as any);
        } catch (err) {
            console.error('Error fetching students:', err);
            setError('Failed to load students.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [profile]);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !newPassword) return;

        setIsSavingPassword(true);
        try {
            await sql`
                UPDATE students 
                SET password = ${newPassword}, is_login_enabled = true 
                WHERE id = ${selectedStudent.id}
            `;

            await fetchStudents();
            setIsPasswordModalOpen(false);
            setNewPassword('');
            setSelectedStudent(null);
        } catch (err) {
            console.error('Error saving password:', err);
            alert('Failed to save password.');
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleBulkSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!classId || !bulkPassword) return;

        if (!confirm(`Are you sure you want to set the password "${bulkPassword}" for all students in this class?`)) return;

        setIsBulkSaving(true);
        try {
            await sql`
                UPDATE students 
                SET password = ${bulkPassword}, is_login_enabled = true 
                WHERE class_id = ${classId}
            `;

            await fetchStudents();
            setIsBulkModalOpen(false);
            setBulkPassword('dps@123');
        } catch (err) {
            console.error('Error saving bulk passwords:', err);
            alert('Failed to save passwords.');
        } finally {
            setIsBulkSaving(false);
        }
    };

    const filtered = students.filter(s =>
        s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admission_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.father_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <Users className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Students</h1>
                    <p className="text-gray-500 mt-1">Class {className} • {students.length} students enrolled</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBulkModalOpen(true)}
                    className="flex items-center gap-2"
                >
                    <Shield className="w-4 h-4" />
                    Setup Class Passwords
                </Button>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Input
                        placeholder="Search by name, admission no, or father's name..."
                        icon={<Search className="w-5 h-5" />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-400">
                    Showing {filtered.length} of {students.length} students
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">No students found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    {filtered.map((student, index) => (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                            key={student.id}
                            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                                    {student.student_name?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors truncate">
                                                {student.student_name}
                                            </h3>
                                            <p className="text-xs font-mono text-gray-400 mt-0.5">ADM: {student.admission_no}</p>
                                        </div>
                                        {student.is_login_enabled && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-100 uppercase">
                                                <Key className="w-2.5 h-2.5" />
                                                Active
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <p className="text-xs text-gray-500 truncate">
                                            <span className="font-medium text-gray-600 block">Father:</span> {student.father_name || '—'}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            <span className="font-medium text-gray-600 block">Mother:</span> {student.mother_name || '—'}
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {student.phone_number && (
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                    <Phone className="w-3 h-3" />
                                                    {student.phone_number}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedStudent(student);
                                                setNewPassword(student.password || '');
                                                setIsPasswordModalOpen(true);
                                            }}
                                            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/10"
                                        >
                                            <Lock className="w-3 h-3" />
                                            {student.password ? 'Change Password' : 'Setup Login'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Password Setup Modal */}
            <AnimatePresence>
                {isPasswordModalOpen && selectedStudent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                            onClick={() => setIsPasswordModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl relative z-10 w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 sm:p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                        <Lock className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <button onClick={() => setIsPasswordModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Student Login Setup</h3>
                                <p className="text-gray-500 mb-8">
                                    Configure login details for <span className="font-bold text-gray-900">{selectedStudent.student_name}</span>.
                                    The login username will be their Admission Number.
                                </p>

                                <form onSubmit={handleSetPassword} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Admission Number (Username)</label>
                                        <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-600 font-mono text-sm">
                                            {selectedStudent.admission_no}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Input
                                            label="Set Password"
                                            placeholder="Enter student password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            type="text"
                                        />
                                        <p className="text-[10px] text-gray-400 ml-1">Recommend a simple but secure password for the student.</p>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full py-4 mt-2"
                                        isLoading={isSavingPassword}
                                    >
                                        Save Credentials
                                    </Button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bulk Setup Modal */}
            <AnimatePresence>
                {isBulkModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                            onClick={() => setIsBulkModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl relative z-10 w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 sm:p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <Shield className="w-6 h-6 text-primary" />
                                    </div>
                                    <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Setup Whole Class</h3>
                                <p className="text-gray-500 mb-8">
                                    Assign a common password to all students in <span className="font-bold text-primary">Class {className}</span>.
                                    Students can still have individual passwords changed later.
                                </p>

                                <form onSubmit={handleBulkSetPassword} className="space-y-6">
                                    <Input
                                        label="Common Password"
                                        placeholder="e.g. dps@123"
                                        value={bulkPassword}
                                        onChange={(e) => setBulkPassword(e.target.value)}
                                        required
                                        type="text"
                                    />

                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                                        <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-800 leading-relaxed font-medium">
                                            This will enable login for ALL students in this class. Any existing custom passwords will be overwritten.
                                        </p>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full py-4 mt-2"
                                        isLoading={isBulkSaving}
                                    >
                                        Save All Passwords
                                    </Button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherStudents;
