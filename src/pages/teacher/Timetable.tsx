import { useState, useEffect } from 'react';
import { Upload, ImageIcon, Save, Loader2, X, AlertCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import { motion } from 'framer-motion';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

const TeacherTimetable = () => {
    const { profile } = useAuthStore();
    const [timetable, setTimetable] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [classInfo, setClassInfo] = useState<{ id: string; name: string } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchTimetable = async () => {
            if (!profile?.email) return;
            setIsLoading(true);
            try {
                const result = await sql`
                    SELECT c.id, c.name, c.timetable
                    FROM teachers t
                    JOIN classes c ON c.class_teacher_id = t.id
                    WHERE LOWER(t.email) = LOWER(${profile.email})
                    LIMIT 1
                `;
                if (result.length > 0) {
                    setClassInfo({ id: result[0].id, name: result[0].name });
                    setTimetable(result[0].timetable);
                    setPreviewUrl(result[0].timetable);
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limit to 2MB to keep Base64 size reasonable for DB
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image size must be less than 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setPreviewUrl(base64String);
            setTimetable(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!classInfo || !timetable) return;
        setIsSaving(true);
        try {
            await sql`
                UPDATE classes 
                SET timetable = ${timetable}
                WHERE id = ${classInfo.id}
            `;
            toast.success('Timetable updated successfully!');
        } catch (error) {
            console.error('Error saving timetable:', error);
            toast.error('Failed to update timetable');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = () => {
        setPreviewUrl(null);
        setTimetable(null);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-gray-500 font-medium">Loading timetable...</p>
            </div>
        );
    }

    if (!classInfo) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-white rounded-3xl border border-rose-100">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No Class Assigned</h3>
                <p className="text-gray-500 max-w-xs">You must be a class teacher to manage a timetable.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <div>
                <h1 className="text-lg md:text-4xl font-black text-gray-900 tracking-tight">Class Timetable</h1>
                <p className="text-gray-500 mt-1">Upload and manage the timetable for Class {classInfo.name}.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
                >
                    <h3 className="text-xl font-extrabold text-gray-900 mb-6">Upload New Timetable</h3>

                    <div className="space-y-6">
                        <div className="relative group">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                                id="timetable-upload"
                            />
                            <label
                                htmlFor="timetable-upload"
                                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8 text-primary" />
                                    </div>
                                    <p className="mb-2 text-sm text-gray-700">
                                        <span className="font-bold text-primary">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-400">PNG, JPG or WEBP (MAX. 2MB)</p>
                                </div>
                            </label>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                onClick={handleSave}
                                isLoading={isSaving}
                                disabled={!timetable || isSaving}
                                className="flex-1 h-14 rounded-2xl font-bold"
                            >
                                <Save className="w-5 h-5 mr-2" />
                                Save Timetable
                            </Button>
                            {previewUrl && (
                                <Button
                                    variant="outline"
                                    onClick={handleRemove}
                                    className="h-14 w-14 rounded-2xl flex items-center justify-center p-0 border-rose-100 text-rose-500 hover:bg-rose-50"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Preview Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
                >
                    <h3 className="text-xl font-extrabold text-gray-900 mb-6">Current Timetable</h3>

                    {previewUrl ? (
                        <div className="relative rounded-2xl overflow-hidden border border-gray-50 bg-gray-50 flex items-center justify-center min-h-[300px]">
                            <img
                                src={previewUrl}
                                alt="Class Timetable"
                                className="max-w-full max-h-[500px] object-contain shadow-2xl"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                            <ImageIcon className="w-12 h-12 text-gray-300 mb-3" />
                            <p className="text-gray-400 font-medium text-sm">No timetable uploaded yet</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default TeacherTimetable;
