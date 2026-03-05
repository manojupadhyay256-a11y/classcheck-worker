import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    MessageSquare,
    Megaphone,
    Check,
    Plus,
    X,
    Send,
    Users,
    School,
    Loader2,
    ChevronDown,
    BookOpen
} from 'lucide-react';
import { notificationService } from '../lib/notifications';
import type { Notification } from '../lib/notifications';
import { useAuthStore } from '../stores/authStore';
import { clsx } from 'clsx';
import { useNotificationStore } from '../stores/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { sql } from '../lib/db';
import { toast } from 'sonner';

interface TeacherClass {
    class_id: string;
    class_name: string;
    type: 'class_teacher' | 'subject_teacher';
}

interface StudentRecipient {
    id: string; // profile_id for sending notifications
    name: string;
    role: string;
    type: 'class_teacher' | 'subject_teacher' | 'admin';
}

const Notifications = () => {
    const { profile } = useAuthStore();
    const { fetchNotifications: syncNotifications } = useNotificationStore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [isComposeOpen, setIsComposeOpen] = useState(false);

    // Compose State
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [target, setTarget] = useState<'all_teachers' | 'all_students' | 'my_class' | 'admin' | 'teacher'>('all_students');
    const [sending, setSending] = useState(false);

    // Teacher class selection state
    const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

    // Student recipient selection state
    const [studentRecipients, setStudentRecipients] = useState<StudentRecipient[]>([]);
    const [classmates, setClassmates] = useState<StudentRecipient[]>([]);
    const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
    const [loadingStudentData, setLoadingStudentData] = useState(false);
    const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);

    // Teacher-Student selection state
    const [classStudents, setClassStudents] = useState<StudentRecipient[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [isMultiSelect, setIsMultiSelect] = useState(false);
    const [loadingClassStudents, setLoadingClassStudents] = useState(false);

    const isAdmin = profile?.role === 'admin';
    const isTeacher = profile?.role === 'teacher';
    const isStudent = profile?.role === 'student';

    useEffect(() => {
        if (isTeacher) setTarget('my_class');
        if (isStudent) setTarget('teacher'); // Default for student
    }, [isTeacher, isStudent]);

    const fetchNotifications = async () => {
        if (!profile?.id) return;
        try {
            const data = await notificationService.fetchByRecipient(profile.id);
            setNotifications(data as Notification[]);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [profile?.id]);

    // Fetch all classes associated with this teacher
    const fetchTeacherClasses = async () => {
        if (!profile?.email) return;
        setLoadingClasses(true);
        try {
            const teacherRes = await sql`SELECT id FROM teachers WHERE LOWER(email) = LOWER(${profile.email}) LIMIT 1`;
            if (teacherRes.length === 0) {
                setLoadingClasses(false);
                return;
            }
            const teacherId = teacherRes[0].id;

            // Get class where teacher is the class teacher
            const ownClassRes = await sql`
                SELECT id as class_id, name as class_name FROM classes WHERE class_teacher_id = ${teacherId}
            `;

            // Get classes where teacher teaches subjects
            const taughtClassesRes = await sql`
                SELECT DISTINCT c.id as class_id, c.name as class_name
                FROM class_subjects cs
                JOIN classes c ON cs.class_id = c.id
                WHERE cs.teacher_id = ${teacherId}
            `;

            const classMap = new Map<string, TeacherClass>();

            // Add own class first
            for (const row of ownClassRes) {
                classMap.set(row.class_id, {
                    class_id: row.class_id,
                    class_name: row.class_name,
                    type: 'class_teacher'
                });
            }

            // Add taught classes (don't overwrite if already class teacher)
            for (const row of taughtClassesRes) {
                if (!classMap.has(row.class_id)) {
                    classMap.set(row.class_id, {
                        class_id: row.class_id,
                        class_name: row.class_name,
                        type: 'subject_teacher'
                    });
                }
            }

            const allClasses = Array.from(classMap.values());
            setTeacherClasses(allClasses);

            // Auto-select first class
            if (allClasses.length > 0) {
                setSelectedClassId(allClasses[0].class_id);
            }
        } catch (error) {
            console.error('Error fetching teacher classes:', error);
        } finally {
            setLoadingClasses(false);
        }
    };

    // Fetch students for a specific class (for teacher messaging)
    const fetchClassStudents = async (classId: string) => {
        setLoadingClassStudents(true);
        setSelectedStudentIds([]); // Reset selection when class changes
        try {
            const results = await sql`
                SELECT id as profile_id, student_name, admission_no
                FROM public.students
                WHERE class_id = ${classId}
                ORDER BY student_name ASC
            `;
            const students = results.map(row => ({
                id: row.profile_id,
                name: row.student_name,
                role: 'Student',
                type: 'admin' as const
            }));
            setClassStudents(students as StudentRecipient[]);
        } catch (error) {
            console.error('Error fetching class students:', error);
        } finally {
            setLoadingClassStudents(false);
        }
    };

    // Refetch students when selected class changes
    useEffect(() => {
        if (isTeacher && selectedClassId && target === 'my_class') {
            fetchClassStudents(selectedClassId);
        }
    }, [selectedClassId, target, isTeacher]);

    // Fetch data for student targets
    const fetchStudentData = async () => {
        if (!profile?.email) return;
        setLoadingStudentData(true);
        try {
            // Extract admission_no from email (e.g., 9239@classcheck.com -> 9239)
            const admissionNo = profile.email.split('@')[0];
            console.log('[DEBUG] Student Admission No:', admissionNo);

            // 1. Get student's class using admission_no
            const studentRes = await sql`
                SELECT class_id FROM public.students WHERE admission_no = ${admissionNo} LIMIT 1
            `;

            if (studentRes.length === 0) {
                console.error('[DEBUG] Student record not found for admission_no:', admissionNo);
                return;
            }
            const classId = studentRes[0].class_id;
            console.log('[DEBUG] Student Class ID:', classId);

            // 2. Get Class Teacher
            const classTeacherRes = await sql`
                SELECT t.name, t.email, p.id as profile_id
                FROM public.classes c
                JOIN public.teachers t ON c.class_teacher_id = t.id
                JOIN public.profiles p ON LOWER(t.email) = LOWER(p.email)
                WHERE c.id = ${classId}
            `;

            // 3. Get Subject Teachers
            const subjectTeachersRes = await sql`
                SELECT DISTINCT t.name, t.email, p.id as profile_id
                FROM public.class_subjects cs
                JOIN public.teachers t ON cs.teacher_id = t.id
                JOIN public.profiles p ON LOWER(t.email) = LOWER(p.email)
                WHERE cs.class_id = ${classId}
            `;

            // 4. Get Classmates (Include all students in class, even if no profile yet)
            const classmatesRes = await sql`
                SELECT id as profile_id, student_name, admission_no
                FROM public.students
                WHERE class_id = ${classId} AND admission_no != ${admissionNo}
            `;

            const teacherRecipientsMap = new Map<string, StudentRecipient>();

            // Add Class Teacher
            for (const row of classTeacherRes) {
                teacherRecipientsMap.set(row.profile_id, {
                    id: row.profile_id,
                    name: row.name,
                    role: 'Class Teacher',
                    type: 'class_teacher'
                });
            }

            // Add Subject Teachers
            for (const row of subjectTeachersRes) {
                if (!teacherRecipientsMap.has(row.profile_id)) {
                    teacherRecipientsMap.set(row.profile_id, {
                        id: row.profile_id,
                        name: row.name,
                        role: 'Subject Teacher',
                        type: 'subject_teacher'
                    });
                }
            }

            const allTeacherRecipients = Array.from(teacherRecipientsMap.values());
            setStudentRecipients(allTeacherRecipients);

            const classmateRecipients = classmatesRes.map(row => ({
                id: row.profile_id,
                name: row.student_name,
                role: 'Classmate',
                type: 'admin' as const // re-using same structure, type doesn't matter much for display here
            }));
            setClassmates(classmateRecipients as StudentRecipient[]);

            // Set default recipient based on target
            if (target === 'teacher' && allTeacherRecipients.length > 0) {
                setSelectedRecipientId(allTeacherRecipients[0].id);
            } else if (target === 'all_students' && classmateRecipients.length > 0) {
                setSelectedRecipientId(classmateRecipients[0].id);
            }
        } catch (error) {
            console.error('Error fetching student connections:', error);
        } finally {
            setLoadingStudentData(false);
        }
    };

    // Fetch relevant data based on role when modal opens
    useEffect(() => {
        if (isComposeOpen) {
            if (isTeacher) fetchTeacherClasses();
            if (isStudent) fetchStudentData();
        }
    }, [isComposeOpen, isTeacher, isStudent]);

    // Reset selections when target changes
    useEffect(() => {
        if (isStudent) {
            if (target === 'teacher' && studentRecipients.length > 0) {
                setSelectedRecipientId(studentRecipients[0].id);
            } else if (target === 'all_students' && classmates.length > 0) {
                setSelectedRecipientId(classmates[0].id);
            } else {
                setSelectedRecipientId('');
            }
        }
    }, [target, isStudent, studentRecipients, classmates]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id || !message) return;
        if (!isStudent && !title) return;

        setSending(true);

        const sendPromise = (async () => {
            if (isAdmin) {
                if (target === 'all_teachers') {
                    await notificationService.broadcastToRole(profile.id, 'teacher', title, message);
                } else {
                    await notificationService.broadcastToRole(profile.id, 'student', title, message);
                }
            } else if (isTeacher) {
                if (target === 'my_class' && selectedClassId) {
                    if (isMultiSelect && selectedStudentIds.length > 0) {
                        await notificationService.broadcastToUsers(profile.id, selectedStudentIds, title, message, 'private_message');
                    } else {
                        await notificationService.messageClass(profile.id, selectedClassId, title, message);
                    }
                } else if (target === 'admin') {
                    const admins = await sql`SELECT id FROM profiles WHERE role = 'admin' LIMIT 1`;
                    if (admins.length > 0) {
                        await notificationService.send({
                            senderId: profile.id,
                            recipientId: admins[0].id,
                            title: title || `Message from Teacher: ${profile.full_name}`,
                            message,
                            type: 'private_message'
                        });
                    } else {
                        throw new Error('No admin found to receive message');
                    }
                } else if (target === 'all_teachers') {
                    await notificationService.broadcastToRole(profile.id, 'teacher', title, message);
                }
            } else if (isStudent) {
                if (target === 'admin') {
                    const admins = await sql`SELECT id FROM profiles WHERE role = 'admin' LIMIT 1`;
                    if (admins.length > 0) {
                        await notificationService.send({
                            senderId: profile.id,
                            recipientId: admins[0].id,
                            title: title || `Message from Student: ${profile.full_name}`,
                            message,
                            type: 'private_message'
                        });
                    } else {
                        throw new Error('No admin found to receive message');
                    }
                } else if (target === 'teacher' && selectedRecipientId) {
                    await notificationService.send({
                        senderId: profile.id,
                        recipientId: selectedRecipientId,
                        title: title || `Message from Student: ${profile.full_name}`,
                        message,
                        type: 'private_message'
                    });
                } else if (target === 'all_students' && selectedRecipientId) {
                    await notificationService.send({
                        senderId: profile.id,
                        recipientId: selectedRecipientId,
                        title: title || `Message from Classmate: ${profile.full_name}`,
                        message,
                        type: 'private_message'
                    });
                }
            }

            setIsComposeOpen(false);
            setTitle('');
            setMessage('');
            fetchNotifications();
        })();

        toast.promise(sendPromise, {
            loading: 'Sending message...',
            success: 'Message sent successfully!',
            error: (err) => err?.message || 'Failed to send message'
        });

        try {
            await sendPromise;
        } catch (error) {
            console.error('Error sending notification:', error);
        } finally {
            setSending(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            if (profile?.id) syncNotifications(profile.id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!profile?.id) return;
        try {
            await notificationService.markAllAsRead(profile.id);
            syncNotifications(profile.id);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'announcement': return Megaphone;
            case 'private_message': return MessageSquare;
            default: return Bell;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'text-rose-600 bg-rose-50';
            case 'high': return 'text-amber-600 bg-amber-50';
            default: return 'text-indigo-600 bg-indigo-50';
        }
    };

    const selectedClass = teacherClasses.find(c => c.class_id === selectedClassId);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 md:pb-8">
            <div className="max-w-4xl mx-auto px-4 pt-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-[#1E1B4B] tracking-tight">Notification Center</h1>
                        <p className="text-slate-500 font-medium mt-1">Stay updated with the latest alerts and messages.</p>
                    </div>
                    <div className="flex gap-3">
                        {notifications.some(n => !n.is_read) && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 font-bold rounded-xl border border-indigo-100 shadow-sm hover:shadow-md transition-all active:scale-95"
                            >
                                <Check className="w-4 h-4" />
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={() => setIsComposeOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            {isStudent ? 'Message Admin' : 'Compose'}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4" />
                        <p className="text-slate-400 font-bold">Loading updates...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="bg-white rounded-[32px] p-12 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-indigo-50 rounded-[28px] flex items-center justify-center mb-6">
                            <Bell className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-black text-[#1E1B4B]">All caught up!</h2>
                        <p className="text-slate-500 font-medium mt-2 max-w-sm">
                            You don't have any notifications at the moment. We'll alert you when something new arrives.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {notifications.map((notification) => {
                                const Icon = getIcon(notification.type);
                                return (
                                    <motion.div
                                        key={notification.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                                        className={clsx(
                                            "group relative bg-white p-6 rounded-[28px] border transition-all duration-300 cursor-pointer",
                                            notification.is_read
                                                ? "border-slate-100 opacity-75 grayscale-[0.5]"
                                                : "border-indigo-100 shadow-lg shadow-indigo-100/50 hover:shadow-xl hover:shadow-indigo-200/50"
                                        )}
                                    >
                                        <div className="flex gap-6">
                                            <div className={clsx(
                                                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                                                getPriorityColor(notification.priority)
                                            )}>
                                                <Icon className="w-7 h-7" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                    <div>
                                                        <h3 className={clsx(
                                                            "text-lg font-black tracking-tight",
                                                            notification.is_read ? "text-[#1E1B4B]/70" : "text-[#1E1B4B]"
                                                        )}>
                                                            {notification.title}
                                                        </h3>
                                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-0.5">
                                                            {notification.sender_name || 'System'} • {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                    {!notification.is_read && (
                                                        <div className="w-3 h-3 bg-indigo-600 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.5)] animate-pulse" />
                                                    )}
                                                </div>
                                                <p className={clsx(
                                                    "text-slate-600 font-medium leading-relaxed",
                                                    notification.is_read ? "line-clamp-1" : "line-clamp-3"
                                                )}>
                                                    {notification.message}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Compose Modal */}
            <AnimatePresence>
                {isComposeOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsComposeOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="p-3 sm:p-8 flex flex-col h-full overflow-hidden">
                                <div className="flex items-center justify-between mb-4 sm:mb-8 shrink-0">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 rounded-xl sm:rounded-2xl flex items-center justify-center">
                                            <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-black text-[#1E1B4B]">Send Message</h2>
                                    </div>
                                    <button onClick={() => setIsComposeOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                        <X className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar px-1">
                                    <form onSubmit={handleSendMessage} className="space-y-4 sm:space-y-6 pb-24">
                                        {/* Admin target audience */}
                                        {isAdmin && (
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Target Audience</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setTarget('all_teachers')}
                                                    className={clsx(
                                                        "flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border-2 transition-all font-bold",
                                                        target === 'all_teachers' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 text-slate-500 hover:border-indigo-100"
                                                    )}
                                                >
                                                    <Users className="w-4 h-4" />
                                                    Teachers
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setTarget('all_students')}
                                                    className={clsx(
                                                        "flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border-2 transition-all font-bold",
                                                        target === 'all_students' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 text-slate-500 hover:border-indigo-100"
                                                    )}
                                                >
                                                    <School className="w-4 h-4" />
                                                    Students
                                                </button>
                                            </div>
                                        )}

                                        {/* Teacher target selection */}
                                        {isTeacher && (
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Target Audience</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setTarget('my_class')}
                                                        className={clsx(
                                                            "flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all font-bold text-[10px] sm:text-[11px]",
                                                            target === 'my_class' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 text-slate-500 hover:border-indigo-100"
                                                        )}
                                                    >
                                                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        Students
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTarget('admin')}
                                                        className={clsx(
                                                            "flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all font-bold text-[10px] sm:text-[11px]",
                                                            target === 'admin' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 text-slate-500 hover:border-indigo-100"
                                                        )}
                                                    >
                                                        <School className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        Admin
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTarget('all_teachers')}
                                                        className={clsx(
                                                            "flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all font-bold text-[10px] sm:text-[11px]",
                                                            target === 'all_teachers' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 text-slate-500 hover:border-indigo-100"
                                                        )}
                                                    >
                                                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        Teachers
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Teacher content based on target */}
                                        {isTeacher && target === 'my_class' && (
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Send To Class</label>
                                                {loadingClasses ? (
                                                    <div className="flex items-center justify-center py-4">
                                                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                                        <span className="ml-2 text-sm text-slate-400 font-medium">Loading your classes...</span>
                                                    </div>
                                                ) : teacherClasses.length === 0 ? (
                                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                                        <p className="text-sm font-bold text-amber-700">No classes assigned to you yet.</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="relative">
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                                                                className="w-full flex items-center justify-between px-3.5 py-2.5 sm:px-5 sm:py-4 bg-slate-50 border-2 border-indigo-200 rounded-xl hover:border-indigo-400 transition-all font-bold text-left"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={clsx(
                                                                        "w-8 h-8 rounded-xl flex items-center justify-center",
                                                                        selectedClass?.type === 'class_teacher' ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                                                                    )}>
                                                                        {selectedClass?.type === 'class_teacher' ? (
                                                                            <Users className="w-4 h-4" />
                                                                        ) : (
                                                                            <BookOpen className="w-4 h-4" />
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[#1E1B4B] block">{selectedClass?.class_name || 'Select a class'}</span>
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                                            {selectedClass?.type === 'class_teacher' ? 'Class Teacher' : 'Subject Teacher'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <ChevronDown className={clsx(
                                                                    "w-5 h-5 text-slate-400 transition-transform",
                                                                    isClassDropdownOpen && "rotate-180"
                                                                )} />
                                                            </button>

                                                            {/* Dropdown */}
                                                            <AnimatePresence>
                                                                {isClassDropdownOpen && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: -8 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: -8 }}
                                                                        className="absolute z-10 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden max-h-56 overflow-y-auto"
                                                                    >
                                                                        {teacherClasses.map((tc) => (
                                                                            <button
                                                                                key={tc.class_id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSelectedClassId(tc.class_id);
                                                                                    setIsClassDropdownOpen(false);
                                                                                }}
                                                                                className={clsx(
                                                                                    "w-full flex items-center gap-3 px-4 py-2.5 sm:px-5 sm:py-3.5 text-left hover:bg-indigo-50 transition-colors",
                                                                                    selectedClassId === tc.class_id && "bg-indigo-50"
                                                                                )}
                                                                            >
                                                                                <div className={clsx(
                                                                                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                                                                                    tc.type === 'class_teacher' ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                                                                                )}>
                                                                                    {tc.type === 'class_teacher' ? (
                                                                                        <Users className="w-4 h-4" />
                                                                                    ) : (
                                                                                        <BookOpen className="w-4 h-4" />
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <span className="font-bold text-[#1E1B4B] block">{tc.class_name}</span>
                                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                                                        {tc.type === 'class_teacher' ? 'Class Teacher' : 'Subject Teacher'}
                                                                                    </span>
                                                                                </div>
                                                                                {selectedClassId === tc.class_id && (
                                                                                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                                                                                )}
                                                                            </button>
                                                                        ))}
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>

                                                        {/* Selection Mode Toggle */}
                                                        <div className="mt-3 flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsMultiSelect(false)}
                                                                className={clsx(
                                                                    "flex-1 px-2 py-1.5 rounded-lg border font-bold text-[9px] sm:text-[10px] uppercase tracking-wider transition-all",
                                                                    !isMultiSelect ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-400 border-slate-100 hover:border-indigo-100"
                                                                )}
                                                            >
                                                                Whole Class
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsMultiSelect(true)}
                                                                className={clsx(
                                                                    "flex-1 px-2 py-1.5 rounded-lg border font-bold text-[9px] sm:text-[10px] uppercase tracking-wider transition-all",
                                                                    isMultiSelect ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-400 border-slate-100 hover:border-indigo-100"
                                                                )}
                                                            >
                                                                Pick Students
                                                            </button>
                                                        </div>

                                                        {/* Student selection list if multi-select is on */}
                                                        {isMultiSelect && (
                                                            <div className="mt-3 space-y-1 pr-1.5 custom-scrollbar">
                                                                {loadingClassStudents ? (
                                                                    <div className="flex items-center justify-center py-4">
                                                                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                                                    </div>
                                                                ) : classStudents.length === 0 ? (
                                                                    <p className="text-center text-[10px] text-slate-400 py-4 font-bold uppercase tracking-widest">No students found</p>
                                                                ) : (
                                                                    classStudents.map((student) => (
                                                                        <label
                                                                            key={student.id}
                                                                            className={clsx(
                                                                                "flex items-center justify-between p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border-2 transition-all cursor-pointer",
                                                                                selectedStudentIds.includes(student.id) ? "border-indigo-600 bg-indigo-50" : "border-slate-50 bg-slate-50 hover:border-indigo-100"
                                                                            )}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-lg flex items-center justify-center text-indigo-600 font-black text-[10px] sm:text-xs border border-indigo-100 shrink-0">
                                                                                    {student.name.charAt(0)}
                                                                                </div>
                                                                                <span className="text-[11px] sm:text-xs font-bold text-[#1E1B4B]">{student.name}</span>
                                                                            </div>
                                                                            <input
                                                                                type="checkbox"
                                                                                className="hidden"
                                                                                checked={selectedStudentIds.includes(student.id)}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        setSelectedStudentIds(prev => [...prev, student.id]);
                                                                                    } else {
                                                                                        setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                                                                                    }
                                                                                }}
                                                                            />
                                                                            {selectedStudentIds.includes(student.id) ? (
                                                                                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-indigo-600 rounded-lg flex items-center justify-center">
                                                                                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                                                                </div>
                                                                            ) : (
                                                                                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white border-2 border-slate-200 rounded-lg" />
                                                                            )}
                                                                        </label>
                                                                    ))
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {isTeacher && target === 'admin' && (
                                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                                <p className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                                                    <School className="w-4 h-4" />
                                                    Sending to School Admin
                                                </p>
                                            </div>
                                        )}

                                        {isTeacher && target === 'all_teachers' && (
                                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                                <p className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                                                    <Users className="w-4 h-4" />
                                                    Broadcasting to all Teachers
                                                </p>
                                            </div>
                                        )}

                                        {isStudent && (
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Target Audience</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setTarget('teacher')}
                                                        className={clsx(
                                                            "flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all font-bold text-[10px] sm:text-[11px]",
                                                            target === 'teacher' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 text-slate-500 hover:border-indigo-100"
                                                        )}
                                                    >
                                                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        Teachers
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTarget('admin')}
                                                        className={clsx(
                                                            "flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all font-bold text-[10px] sm:text-[11px]",
                                                            target === 'admin' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 text-slate-500 hover:border-indigo-100"
                                                        )}
                                                    >
                                                        <School className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        Admin
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTarget('all_students')}
                                                        className={clsx(
                                                            "flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all font-bold text-[10px] sm:text-[11px]",
                                                            target === 'all_students' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 text-slate-500 hover:border-indigo-100"
                                                        )}
                                                    >
                                                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        Classmates
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Student content based on target */}
                                        {isStudent && target === 'teacher' && (
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Choose Teacher</label>
                                                {loadingStudentData ? (
                                                    <div className="flex items-center justify-center py-4">
                                                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                                        <span className="ml-2 text-sm text-slate-400 font-medium">Finding your teachers...</span>
                                                    </div>
                                                ) : studentRecipients.length === 0 ? (
                                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                                        <p className="text-sm font-bold text-amber-700">No teachers found for your class. Please check your subject assignments.</p>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsRecipientDropdownOpen(!isRecipientDropdownOpen)}
                                                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-2 border-indigo-200 rounded-xl hover:border-indigo-400 transition-all font-bold text-left"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                                                    <Users className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <span className="text-[#1E1B4B] block">{studentRecipients.find(r => r.id === selectedRecipientId)?.name || 'Select a teacher'}</span>
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                                        {studentRecipients.find(r => r.id === selectedRecipientId)?.role}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <ChevronDown className={clsx(
                                                                "w-5 h-5 text-slate-400 transition-transform",
                                                                isRecipientDropdownOpen && "rotate-180"
                                                            )} />
                                                        </button>

                                                        <AnimatePresence>
                                                            {isRecipientDropdownOpen && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -8 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: -8 }}
                                                                    className="absolute z-10 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden max-h-56 overflow-y-auto"
                                                                >
                                                                    {studentRecipients.map((sr) => (
                                                                        <button
                                                                            key={sr.id}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSelectedRecipientId(sr.id);
                                                                                setIsRecipientDropdownOpen(false);
                                                                            }}
                                                                            className={clsx(
                                                                                "w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-indigo-50 transition-colors",
                                                                                selectedRecipientId === sr.id && "bg-indigo-50"
                                                                            )}
                                                                        >
                                                                            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                                                <Users className="w-4 h-4" />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className="font-bold text-[#1E1B4B] block">{sr.name}</span>
                                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{sr.role}</span>
                                                                            </div>
                                                                            {selectedRecipientId === sr.id && (
                                                                                <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                                                                            )}
                                                                        </button>
                                                                    ))}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {isStudent && target === 'all_students' && (
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Choose Classmate</label>
                                                {loadingStudentData ? (
                                                    <div className="flex items-center justify-center py-4">
                                                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                                        <span className="ml-2 text-sm text-slate-400 font-medium">Finding your classmates...</span>
                                                    </div>
                                                ) : classmates.length === 0 ? (
                                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                                        <p className="text-sm font-bold text-amber-700">No classmates found.</p>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsRecipientDropdownOpen(!isRecipientDropdownOpen)}
                                                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-2 border-emerald-200 rounded-xl hover:border-emerald-400 transition-all font-bold text-left"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                                                    <Users className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <span className="text-[#1E1B4B] block">{classmates.find(r => r.id === selectedRecipientId)?.name || 'Select a classmate'}</span>
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Classmate</span>
                                                                </div>
                                                            </div>
                                                            <ChevronDown className={clsx(
                                                                "w-5 h-5 text-slate-400 transition-transform",
                                                                isRecipientDropdownOpen && "rotate-180"
                                                            )} />
                                                        </button>

                                                        <AnimatePresence>
                                                            {isRecipientDropdownOpen && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -8 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: -8 }}
                                                                    className="absolute z-10 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden max-h-56 overflow-y-auto"
                                                                >
                                                                    {classmates.map((sr) => (
                                                                        <button
                                                                            key={sr.id}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSelectedRecipientId(sr.id);
                                                                                setIsRecipientDropdownOpen(false);
                                                                            }}
                                                                            className={clsx(
                                                                                "w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-emerald-50 transition-colors",
                                                                                selectedRecipientId === sr.id && "bg-emerald-50"
                                                                            )}
                                                                        >
                                                                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                                                <Users className="w-4 h-4" />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className="font-bold text-[#1E1B4B] block">{sr.name}</span>
                                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Classmate</span>
                                                                            </div>
                                                                            {selectedRecipientId === sr.id && (
                                                                                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                                                            )}
                                                                        </button>
                                                                    ))}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {isStudent && target === 'admin' && (
                                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                                <p className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                                                    <School className="w-4 h-4" />
                                                    Sending to School Admin
                                                </p>
                                            </div>
                                        )}

                                        {isStudent && target === 'all_students' && (
                                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                                <p className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                                                    <Users className="w-4 h-4" />
                                                    Choose a classmate above to send a private message.
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-2.5">
                                            {!isStudent && (
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Title</label>
                                                    <input
                                                        type="text"
                                                        value={title}
                                                        onChange={(e) => setTitle(e.target.value)}
                                                        placeholder="Enter title..."
                                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-600 focus:bg-white transition-all font-bold outline-none text-sm"
                                                        required
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Message</label>
                                                <textarea
                                                    value={message}
                                                    onChange={(e) => setMessage(e.target.value)}
                                                    placeholder="Write your message..."
                                                    rows={isAdmin || isTeacher ? 2 : 3}
                                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-600 focus:bg-white transition-all font-bold outline-none resize-none text-sm"
                                                    required
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={sending || (isTeacher && target === 'my_class' && !selectedClassId) || (isStudent && target === 'teacher' && !selectedRecipientId)}
                                                className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                                            >
                                                {sending ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Send className="w-5 h-5" />
                                                        {isTeacher ? (
                                                            target === 'admin' ? 'Send to Admin' :
                                                                target === 'all_teachers' ? 'Send to Teachers' :
                                                                    'Send to Class'
                                                        ) : isStudent ? (
                                                            target === 'admin' ? 'Send to Admin' :
                                                                target === 'teacher' ? 'Send to Teacher' :
                                                                    'Send to Classmate'
                                                        ) : 'Send Notification'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >
        </div >
    );
};

export default Notifications;
