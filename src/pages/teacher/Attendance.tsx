import { useState, useEffect } from 'react';
import { Check, X, Clock, Save, ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react';
import Button from '../../components/common/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

interface StudentAttendance {
    id: string; // student_id
    admission_no: string;
    name: string;
    rollNo: string;
    status: 'Present' | 'Absent' | 'Leave' | 'Holiday';
    attendanceId?: string; // id in attendance table
}

const TeacherAttendance = () => {
    const { profile } = useAuthStore();
    const [students, setStudents] = useState<StudentAttendance[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [classInfo, setClassInfo] = useState<{ id: string; name: string } | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        const fetchAttendanceData = async () => {
            if (!profile?.email) return;
            setIsLoading(true);
            setError(null);
            setSaveSuccess(false);

            try {
                // 1. Find teacher and their assigned class
                const teacherResult = await sql`
                    SELECT t.id as teacher_id, c.id as class_id, c.name as class_name
                    FROM teachers t
                    JOIN classes c ON c.class_teacher_id = t.id
                    WHERE LOWER(t.email) = LOWER(${profile.email})
                    LIMIT 1
                `;

                if (teacherResult.length === 0) {
                    setError('Teacher profile or assigned class not found.');
                    return;
                }

                const { class_id, class_name } = teacherResult[0];
                setClassInfo({ id: class_id, name: class_name });

                // 2. Fetch all students in that class
                const studentsResult = await sql`
                    SELECT id, admission_no, student_name
                    FROM students
                    WHERE class_id = ${class_id}
                    ORDER BY student_name ASC
                `;

                // 3. Fetch existing attendance for the selected date
                const existingAttendance = await sql`
                    SELECT id, student_id, status
                    FROM attendance
                    WHERE class_id = ${class_id} AND date = ${date}
                `;

                // Map results
                const mappedStudents: StudentAttendance[] = studentsResult.map((s, index) => {
                    const existing = existingAttendance.find(a => a.student_id === s.id);
                    return {
                        id: s.id,
                        admission_no: s.admission_no,
                        name: s.student_name,
                        rollNo: (index + 1).toString(), // Fallback roll no if not in DB
                        status: existing ? (existing.status as any) : 'Present',
                        attendanceId: existing?.id,
                    };
                });

                setStudents(mappedStudents);
            } catch (err) {
                console.error('Error fetching attendance:', err);
                setError('Failed to load attendance data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttendanceData();
    }, [profile, date]);

    const updateStatus = (id: string, status: StudentAttendance['status']) => {
        setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
        setSaveSuccess(false);
    };

    const handleSave = async () => {
        if (!classInfo || !profile) return;
        setIsSaving(true);
        setError(null);

        const savePromise = (async () => {
            for (const student of students) {
                await sql`
                    INSERT INTO attendance (student_id, class_id, date, status, marked_by)
                    VALUES (${student.id}, ${classInfo.id}, ${date}, ${student.status}, ${profile.id})
                    ON CONFLICT (student_id, date) 
                    DO UPDATE SET 
                        status = EXCLUDED.status,
                        marked_by = EXCLUDED.marked_by,
                        class_id = EXCLUDED.class_id
                `;
            }
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        })();

        toast.promise(savePromise, {
            loading: 'Saving attendance...',
            success: 'Attendance saved successfully!',
            error: 'Failed to save attendance. Please try again.'
        });

        try {
            await savePromise;
        } catch (err) {
            console.error('Error saving attendance:', err);
            setError('Failed to save attendance.');
        } finally {
            setIsSaving(false);
        }
    };

    const changeDate = (days: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        setDate(d.toISOString().split('T')[0]);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-gray-500 font-medium">Loading class data...</p>
            </div>
        );
    }

    if (error && !students.length) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-white rounded-3xl border border-rose-100">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
                    <X className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Unable to load attendance</h3>
                <p className="text-gray-500 max-w-xs">{error}</p>
                <Button onClick={() => window.location.reload()} className="mt-4" variant="secondary">Try Again</Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-32">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary font-bold mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm uppercase tracking-wider">Daily Attendance</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Mark Attendance</h1>
                    <p className="text-gray-500 mt-1">
                        {classInfo ? `Class ${classInfo.name}` : 'Class Not Found'} • {students.length} Students Total
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm self-start">
                    <button
                        onClick={() => changeDate(-1)}
                        className="p-2 hover:bg-gray-50 rounded-xl text-gray-400"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-transparent border-none outline-none font-bold text-gray-700 cursor-pointer text-sm"
                    />
                    <button
                        onClick={() => changeDate(1)}
                        className="p-2 hover:bg-gray-50 rounded-xl text-gray-400"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 transition-all">
                    <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">Present</p>
                    <p className="text-3xl font-black text-emerald-700">{students.filter(s => s.status === 'Present').length}</p>
                </div>
                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 transition-all">
                    <p className="text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">Absent</p>
                    <p className="text-3xl font-black text-rose-700">{students.filter(s => s.status === 'Absent').length}</p>
                </div>
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 transition-all">
                    <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">Leave / Holiday</p>
                    <p className="text-3xl font-black text-amber-700">
                        {students.filter(s => s.status === 'Leave' || s.status === 'Holiday').length}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest w-24">Roll No</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Student Name</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Mark Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence mode="popLayout">
                                {students.map((student) => (
                                    <motion.tr
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        key={student.id}
                                        className="hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td className="px-6 py-5 font-mono text-sm font-bold text-gray-400">{student.rollNo}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900">{student.name}</span>
                                                <span className="text-[10px] text-gray-400 font-mono uppercase">ADM: {student.admission_no}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => updateStatus(student.id, 'Present')}
                                                    title="Present"
                                                    className={clsx(
                                                        "p-3 rounded-2xl transition-all duration-300",
                                                        student.status === 'Present'
                                                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-110"
                                                            : "bg-gray-50 text-gray-300 hover:text-emerald-400"
                                                    )}
                                                >
                                                    <Check className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(student.id, 'Absent')}
                                                    title="Absent"
                                                    className={clsx(
                                                        "p-3 rounded-2xl transition-all duration-300",
                                                        student.status === 'Absent'
                                                            ? "bg-rose-500 text-white shadow-lg shadow-rose-200 scale-110"
                                                            : "bg-gray-50 text-gray-300 hover:text-rose-400"
                                                    )}
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(student.id, 'Leave')}
                                                    title="Leave"
                                                    className={clsx(
                                                        "p-3 rounded-2xl transition-all duration-300",
                                                        student.status === 'Leave'
                                                            ? "bg-amber-500 text-white shadow-lg shadow-amber-200 scale-110"
                                                            : "bg-gray-50 text-gray-300 hover:text-amber-400"
                                                    )}
                                                >
                                                    <Clock className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="fixed bottom-24 right-8 lg:bottom-12 lg:right-12 z-50">
                <Button
                    onClick={handleSave}
                    isLoading={isSaving}
                    disabled={isSaving || students.length === 0}
                    variant={saveSuccess ? "success" : "primary"}
                    className={clsx(
                        "shadow-2xl h-16 px-10 rounded-3xl text-lg font-bold min-w-[200px] transition-all",
                        saveSuccess && "bg-emerald-500 border-emerald-500"
                    )}
                >
                    {isSaving ? (
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    ) : saveSuccess ? (
                        <Check className="w-6 h-6 mr-2" />
                    ) : (
                        <Save className="w-6 h-6 mr-2" />
                    )}
                    {saveSuccess ? 'Saved' : 'Save Attendance'}
                </Button>
                {error && <p className="text-rose-500 text-sm font-bold mt-2 text-right bg-white/80 backdrop-blur p-2 rounded-lg">{error}</p>}
            </div>
        </div>
    );
};

export default TeacherAttendance;

