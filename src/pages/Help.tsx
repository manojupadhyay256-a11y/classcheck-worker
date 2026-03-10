import { useAuthStore } from '../stores/authStore';
import {
    Book,
    ChevronRight,
    Users,
    Calendar,
    Settings,
    FileText,
    Search,
    GraduationCap,
    ShieldCheck,
    Layout,
    Sparkles
} from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpItem {
    id: string;
    title: string;
    description: string;
    icon: any;
    content: string[];
}

interface HelpSection {
    id: string;
    title: string;
    icon: any;
    items: HelpItem[];
}

const Help = () => {
    const { profile } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

    const role = profile?.role || 'student';

    const helpData: HelpSection[] = [
        {
            id: 'student',
            title: 'Student Guide',
            icon: GraduationCap,
            items: [
                {
                    id: 's-classwork',
                    title: 'Using Class Work',
                    description: 'Learn how to view your daily school activities and homework.',
                    icon: Book,
                    content: [
                        'Go to the "Class Work" section from the bottom menu or sidebar.',
                        'Activity for each subject will be listed by date.',
                        'You can see what was taught in class and what homework was assigned.',
                        'Filter by date to see past records.'
                    ]
                },
                {
                    id: 's-attendance',
                    title: 'Checking Attendance',
                    description: 'Keep track of your presence and school days.',
                    icon: Calendar,
                    content: [
                        'Navigate to the "Attend" section.',
                        'The calendar shows your attendance month by month.',
                        'Green dots usually represent "Present", and Red represents "Absent".',
                        'Check the summary at the bottom for total days present.'
                    ]
                },
                {
                    id: 's-subjects',
                    title: 'My Subjects & Syllabus',
                    description: 'View your enrolled subjects and their progress.',
                    icon: Layout,
                    content: [
                        'Go to "My Subjects" to see all your assigned classes.',
                        'Click on a subject to see detailed syllabus status.',
                        'Topics completed are usually marked for your reference.'
                    ]
                }
            ]
        },
        {
            id: 'teacher',
            title: 'Teacher Guide',
            icon: Users,
            items: [
                {
                    id: 't-attendance',
                    title: 'Marking Attendance',
                    description: 'How to efficiently take daily attendance for your classes.',
                    icon: Calendar,
                    content: [
                        'Click "Attendance" in the main menu.',
                        'Select the Class and Section you want to mark.',
                        'Toggle student status (P/A). Use "Mark All Present" for speed.',
                        'IMPORTANT: Always click "Save Attendance" at the bottom when done.'
                    ]
                },
                {
                    id: 't-logbook',
                    title: 'Managing Log Book',
                    description: 'Record daily lessons and student activities.',
                    icon: FileText,
                    content: [
                        'Go to "Log Book" and select your class.',
                        'Select the date and period.',
                        'Type in the topics covered and assignments given.',
                        'These logs become visible to students in their "Class Work".'
                    ]
                },
                {
                    id: 't-syllabus',
                    title: 'Syllabus Management',
                    description: 'Update topics as you progress through the year.',
                    icon: Book,
                    content: [
                        'Navigate to "My Subjects" and click on a subject.',
                        'Check or uncheck topics as you complete them in class.',
                        'This helps the school administration track academic progress.'
                    ]
                }
            ]
        },
        {
            id: 'admin',
            title: 'Administrator Guide',
            icon: ShieldCheck,
            items: [
                {
                    id: 'a-users',
                    title: 'User Management',
                    description: 'How to add and manage Teachers and Students.',
                    icon: Users,
                    content: [
                        'Use the "Teachers" or "Students" menu to see current lists.',
                        'Use "Bulk Import" to upload entire classes via Excel/CSV.',
                        'You can reset passwords or edit profiles from the list view.'
                    ]
                },
                {
                    id: 'a-classes',
                    title: 'Class & Subject Assignment',
                    description: 'Setting up the school structure.',
                    icon: Layout,
                    content: [
                        'Create Classes (e.g., 10th) and Sections (e.g., A).',
                        'Use "Class Assignment" to link Teachers to specific subjects in each class.',
                        'This link is required for Teachers to be able to take attendance.'
                    ]
                },
                {
                    id: 'a-settings',
                    title: 'Global Settings',
                    description: 'Customizing the school portal.',
                    icon: Settings,
                    content: [
                        'Go to "Settings" to change the School Name or Logo.',
                        'Adjust academic session dates and other global parameters.',
                        'Manage Teacher logins and portal access from the "Teacher Logins" section.'
                    ]
                }
            ]
        }
    ];

    // Filter sections based on role
    const visibleSections = helpData.filter(section => {
        if (role === 'admin') return true;
        if (role === 'teacher') return section.id === 'teacher' || section.id === 'student';
        return section.id === 'student';
    });

    const filteredSections = visibleSections.map(section => ({
        ...section,
        items: section.items.filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(section => section.items.length > 0);

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <header className="bg-white border-b border-[#F1F5F9] px-6 py-8 md:px-12 md:py-12">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-100">
                            <HelpCircle className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black text-[#1E1B4B] tracking-tight">Help & Guide</h1>
                            <p className="text-[#64748B] font-bold text-sm tracking-tight opacity-70">Learn how to make the best use of ClassCheck</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-[#94A3B8] group-focus-within:text-amber-600 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search for guides or features..."
                            className="block w-full pl-12 pr-4 py-4 md:py-5 bg-white border-2 border-[#F1F5F9] rounded-2xl md:rounded-3xl text-[15px] font-bold text-[#1E1B4B] placeholder-[#94A3B8] focus:outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-50 transition-all duration-300"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-10 md:py-16 space-y-12">
                {filteredSections.length > 0 ? (
                    filteredSections.map((section) => (
                        <div key={section.id} className="space-y-6">
                            <div className="flex items-center gap-3 px-2">
                                <div className="p-2 bg-amber-50 rounded-xl">
                                    <section.icon className="w-5 h-5 text-amber-600" />
                                </div>
                                <h2 className="text-lg font-black text-[#1E1B4B] uppercase tracking-widest">{section.title}</h2>
                            </div>

                            <div className="grid gap-4">
                                {section.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className={clsx(
                                            "bg-white rounded-[28px] border-2 transition-all duration-300 overflow-hidden",
                                            expandedItemId === item.id
                                                ? "border-amber-600 shadow-2xl shadow-amber-100"
                                                : "border-transparent hover:border-amber-100 hover:shadow-xl hover:shadow-amber-50"
                                        )}
                                    >
                                        <button
                                            onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                                            className="w-full px-6 py-6 md:px-8 md:py-8 flex items-center gap-6 text-left"
                                        >
                                            <div className={clsx(
                                                "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-colors duration-300 shrink-0",
                                                expandedItemId === item.id ? "bg-amber-600" : "bg-slate-50"
                                            )}>
                                                <item.icon className={clsx(
                                                    "w-6 h-6 md:w-7 md:h-7 transition-colors duration-300",
                                                    expandedItemId === item.id ? "text-white" : "text-slate-400"
                                                )} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg md:text-xl font-black text-[#1E1B4B] tracking-tight">{item.title}</h3>
                                                <p className="text-[#64748B] font-bold text-[13px] md:text-sm mt-1">{item.description}</p>
                                            </div>
                                            <div className={clsx(
                                                "p-2 rounded-xl transition-all duration-300 shrink-0",
                                                expandedItemId === item.id ? "bg-amber-600 rotate-90" : "bg-slate-50 rotate-0"
                                            )}>
                                                <ChevronRight className={clsx(
                                                    "w-5 h-5",
                                                    expandedItemId === item.id ? "text-white" : "text-slate-400"
                                                )} />
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {expandedItemId === item.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                >
                                                    <div className="px-6 pb-8 md:px-8 md:pb-10 pt-2 border-t border-[#F8FAFC]">
                                                        <div className="bg-amber-50/50 rounded-2xl p-6 md:p-8 space-y-4">
                                                            {item.content.map((point, idx) => (
                                                                <div key={idx} className="flex gap-4">
                                                                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-amber-100">
                                                                        <span className="text-[10px] font-black text-amber-600">{idx + 1}</span>
                                                                    </div>
                                                                    <p className="text-sm md:text-[15px] font-bold text-[#1E1B4B]/80 leading-relaxed pt-0.5">
                                                                        {point}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="mt-8 flex items-center gap-3 px-2">
                                                            <div className="flex-1 h-px bg-[#F1F5F9]" />
                                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">End of Guide</span>
                                                            <div className="flex-1 h-px bg-[#F1F5F9]" />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border-2 border-dashed border-[#F1F5F9]">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                            <Search className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-black text-[#1E1B4B]">No guides found</h3>
                        <p className="text-[#64748B] text-sm font-bold mt-1">Try searching for different keywords</p>
                    </div>
                )}
            </main>

            {/* Getting Started Tip */}
            {!searchQuery && (
                <div className="max-w-4xl mx-auto px-6 pb-20">
                    <div className="bg-linear-to-br from-amber-600 to-amber-700 rounded-[40px] p-8 md:p-12 text-center text-white relative overflow-hidden shadow-2xl shadow-amber-200">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                        <div className="relative z-10 space-y-4">
                            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full backdrop-blur-md mb-2">
                                <Sparkles className="w-4 h-4 text-amber-300" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Expert Tip</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">Need more help?</h2>
                            <p className="text-amber-100 font-bold max-w-lg mx-auto leading-relaxed">
                                Our support team is always here to help you get the most out of ClassCheck. Contact your school administrator for personalized assistance.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const HelpCircle = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
    </svg>
);

export default Help;
