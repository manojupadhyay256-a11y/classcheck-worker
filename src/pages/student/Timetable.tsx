import { useState, useEffect } from 'react';
import { ImageIcon, Loader2, Calendar, AlertCircle, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

const StudentTimetable = () => {
    const { profile } = useAuthStore();
    const [timetable, setTimetable] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [classInfo, setClassInfo] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        const fetchTimetable = async () => {
            if (!profile?.email) return;
            setIsLoading(true);
            try {
                // Use student's ID (UUID) for reliable lookup
                const studentResult = await sql`
                    SELECT c.id, c.name, c.timetable
                    FROM students s
                    JOIN classes c ON s.class_id = c.id
                    WHERE s.id = ${profile.id}
                    LIMIT 1
                `;
                if (studentResult.length > 0) {
                    setClassInfo({ id: studentResult[0].id, name: studentResult[0].name });
                    setTimetable(studentResult[0].timetable);
                }
            } catch (error) {
                console.error('Error fetching timetable:', error);
                toast.error('Failed to load timetable');
            } finally {
                setIsLoading(false);
            }
        };
        fetchTimetable();
    }, [profile]);

    const handleDownload = () => {
        if (!timetable) return;
        const link = document.createElement('a');
        link.href = timetable;
        link.download = `Timetable_Class_${classInfo?.name || 'Class'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Timetable downloaded!');
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-gray-500 font-medium">Loading your timetable...</p>
            </div>
        );
    }

    if (!classInfo) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-white rounded-3xl border border-rose-100">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Class Not Found</h3>
                <p className="text-gray-500 max-w-xs">We couldn't find your class records. Please contact support.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-32">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-amber-600 rounded-2xl md:rounded-3xl p-4 md:p-10 text-white shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-16 -translate-y-16 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                    <div>
                        <p className="text-amber-100/80 font-medium text-[11px] md:text-xs uppercase tracking-widest flex items-center gap-1.5 mb-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Weekly Schedule
                        </p>
                        <h1 className="text-xl md:text-4xl font-black tracking-tight">My Timetable</h1>
                        <p className="text-amber-100/60 text-sm font-medium mt-1">Class {classInfo.name} • Academic Year 2025-26</p>
                    </div>
                    {timetable && (
                        <button
                            onClick={handleDownload}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-amber-700 font-bold rounded-2xl shadow-lg hover:bg-amber-50 active:scale-95 transition-all text-sm self-start"
                        >
                            <Download className="w-5 h-5" />
                            Save Image
                        </button>
                    )}
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-4 md:p-8 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center justify-center min-h-[400px]"
            >
                {timetable ? (
                    <div className="w-full max-w-4xl relative group">
                        <img
                            src={timetable}
                            alt="Class Timetable"
                            className="w-full h-auto rounded-2xl shadow-2xl border border-gray-50"
                        />
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-12 space-y-4">
                        <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-[28px] flex items-center justify-center">
                            <ImageIcon className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">No Timetable Uploaded</h3>
                            <p className="text-gray-500 max-w-xs mx-auto">Your class teacher hasn't uploaded the timetable yet. Please check back later.</p>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default StudentTimetable;
