import * as XLSX from 'xlsx';
import { sql } from './db';
import { authClient } from './auth-client';

/**
 * List.xlsx format:
 * Column A: Class (sparse, grouped)
 * Column B: Class Teacher (sparse, grouped)
 * Column C: Subject (every row)
 * Column D: Subject Teacher (every row)
 */

export interface ParsedImport {
    teachers: TeacherEntry[];
    subjects: string[];
    classes: string[];
    classTeacherMap: Record<string, string>;
    assignments: Assignment[];
    totalRows: number;
}

export interface StudentParsedImport {
    students: StudentEntry[];
    totalRows: number;
}

export interface TeacherEntry {
    name: string;
    email: string;
}

export interface StudentEntry {
    admission_no: string;
    student_name: string;
    father_name: string;
    mother_name: string;
    phone_number: string;
    dob: string;
    address: string;
    category: string;
    className: string;
}

export interface Assignment {
    className: string;
    classTeacher: string;
    subject: string;
    subjectTeacher: string;
}

// ──── Helpers ────

/** Convert to Sentence Case: "mr. sanjeev kumar singh" → "Mr. Sanjeev Kumar Singh" */
function toSentenceCase(str: string): string {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/** Strip honorifics and generate email: "Dr. Bhanu Prakash Sharma" → "bhanu@class.com" */
function generateEmail(name: string): string {
    const cleaned = name
        .replace(/^(mr\.|mrs\.|ms\.|dr\.|shri\.?|smt\.?)\s*/i, '')
        .trim();
    const firstName = cleaned.split(' ')[0].toLowerCase();
    return `${firstName}@class.com`;
}

/** Make email unique by appending a number if it already exists */
function makeUniqueEmails(teachers: { name: string; email: string }[]): TeacherEntry[] {
    const emailCount: Record<string, number> = {};
    return teachers.map(t => {
        const baseEmail = t.email;
        if (emailCount[baseEmail] !== undefined) {
            emailCount[baseEmail]++;
            const [local, domain] = baseEmail.split('@');
            return { ...t, email: `${local}${emailCount[baseEmail]}@${domain}` };
        } else {
            emailCount[baseEmail] = 0;
            return t;
        }
    });
}

// ──── Parser ────

export const parseImportFile = async (file: File): Promise<ParsedImport> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawData || rawData.length === 0) {
        throw new Error("The uploaded file is empty.");
    }

    // Detect headers
    const keys = Object.keys(rawData[0]);
    const classKey = keys.find(k => k.toLowerCase().trim() === 'class') || keys[0];
    const classTeacherKey = keys.find(k => k.toLowerCase().trim() === 'class teacher') || keys[1];
    const subjectKey = keys.find(k => k.toLowerCase().trim() === 'subject') || keys[2];
    const subjectTeacherKey = keys.find(k => k.toLowerCase().trim() === 'subject teacher') || keys[3];

    // Forward-fill grouped rows
    let currentClass = '';
    let currentClassTeacher = '';
    const assignments: Assignment[] = [];

    for (const row of rawData) {
        const cls = row[classKey]?.toString().trim();
        const ct = row[classTeacherKey]?.toString().trim();
        const subj = row[subjectKey]?.toString().trim();
        const st = row[subjectTeacherKey]?.toString().trim();

        if (cls) currentClass = cls.toUpperCase().trim();
        if (ct) currentClassTeacher = toSentenceCase(ct);

        if (subj && st && currentClass) {
            assignments.push({
                className: currentClass,
                classTeacher: currentClassTeacher,
                subject: toSentenceCase(subj),
                subjectTeacher: toSentenceCase(st),
            });
        }
    }

    // Extract unique values
    const allTeacherNames = new Set<string>();
    const classTeacherMap: Record<string, string> = {};

    for (const a of assignments) {
        if (a.classTeacher) allTeacherNames.add(a.classTeacher);
        if (a.subjectTeacher) allTeacherNames.add(a.subjectTeacher);
        if (a.className && a.classTeacher) {
            classTeacherMap[a.className] = a.classTeacher;
        }
    }

    // Build teachers with emails
    const rawTeachers = Array.from(allTeacherNames).sort().map(name => ({
        name,
        email: generateEmail(name),
    }));
    const teachers = makeUniqueEmails(rawTeachers);

    const subjects = Array.from(new Set(assignments.map(a => a.subject))).sort();
    const classes = Array.from(new Set(assignments.map(a => a.className))).sort();

    return {
        teachers,
        subjects,
        classes,
        classTeacherMap,
        assignments,
        totalRows: rawData.length,
    };
};

export const parseStudentImport = async (file: File): Promise<StudentParsedImport> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { cellDates: true }); // Important for Excel date serials
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

    if (!rawData || rawData.length === 0) {
        throw new Error("The uploaded file is empty.");
    }

    const students: StudentEntry[] = rawData.map(row => {
        // Handle potential Date objects from XLSX when cellDates: true
        let dobValue = row['Date of Birth'] || row['dob'] || row['DOB'] || '';

        return {
            admission_no: String(row['Admission No'] || row['admission_no'] || ''),
            student_name: toSentenceCase(String(row['Student Name'] || row['student_name'] || row['Name'] || '')),
            father_name: toSentenceCase(String(row['Father Name'] || row['father_name'] || row['Father\'s Name'] || '')),
            mother_name: toSentenceCase(String(row['Mother Name'] || row['mother_name'] || row['Mother\'s Name'] || '')),
            phone_number: String(row['Phone Number'] || row['phone_number'] || row['Phone'] || ''),
            dob: dobValue ? String(dobValue) : '',
            address: String(row['Address'] || row['address'] || ''),
            category: String(row['Category'] || row['category'] || 'General'),
            className: String(row['Class'] || row['class'] || '').toUpperCase().trim(),
        };
    }).filter(s => s.student_name && s.admission_no);

    return {
        students,
        totalRows: rawData.length,
    };
};

export const executeStudentImport = async (
    parsedData: StudentParsedImport,
    onProgress?: (progress: number, status: string) => void
) => {
    const { students } = parsedData;
    const totalSteps = students.length;
    let currentStep = 0;

    const updateProgress = (status: string) => {
        currentStep++;
        if (onProgress) {
            onProgress(Math.min(Math.round((currentStep / totalSteps) * 100), 100), status);
        }
    };

    // Build class name -> ID map
    const allClasses = await sql`SELECT id, name FROM public.classes`;
    const classMap = new Map(allClasses.map(c => [String(c.name).toUpperCase(), c.id]));

    for (const student of students) {
        updateProgress(`Importing ${student.student_name}...`);
        const classId = classMap.get(student.className.toUpperCase()) || null;

        // Clean DOB if provided (Excel often provides numbers or strings)
        let cleanedDob = null;
        if (student.dob) {
            const d = new Date(student.dob);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                // SQL DATE ranges (approx 1000 - 9999), but we use 1900-2100 for safety
                if (year > 1900 && year < 2100) {
                    cleanedDob = d.toISOString().split('T')[0];
                } else {
                    console.warn(`Date of birth out of reasonable range for ${student.student_name}:`, student.dob);
                }
            }
        }

        await sql`
            INSERT INTO public.students (
                admission_no, 
                student_name, 
                father_name, 
                mother_name, 
                phone_number, 
                dob,
                address,
                category, 
                class_id
            )
            VALUES (
                ${student.admission_no}, 
                ${student.student_name}, 
                ${student.father_name}, 
                ${student.mother_name}, 
                ${student.phone_number}, 
                ${cleanedDob},
                ${student.address},
                ${student.category}, 
                ${classId}
            )
            ON CONFLICT (admission_no) DO UPDATE SET
                student_name = EXCLUDED.student_name,
                father_name = EXCLUDED.father_name,
                mother_name = EXCLUDED.mother_name,
                phone_number = EXCLUDED.phone_number,
                dob = EXCLUDED.dob,
                address = EXCLUDED.address,
                category = EXCLUDED.category,
                class_id = EXCLUDED.class_id
        `;
    }

    return {
        success: true,
        message: `Successfully imported ${students.length} students.`,
        studentsCount: students.length,
    };
};

// ──── Importer ────

export const executeImport = async (
    parsedData: ParsedImport,
    onProgress?: (progress: number, status: string) => void
) => {
    try {
        const { teachers, subjects, classes, classTeacherMap, assignments } = parsedData;

        // Total steps (apprx): Teachers (N) + Subjects (1) + Classes (1) + Assignments (1)
        // We'll treat teachers as the major chunk, then others as quick steps.
        const totalSteps = teachers.length + 3;
        let currentStep = 0;

        const updateProgress = (status: string) => {
            currentStep++;
            if (onProgress) {
                onProgress(Math.min(Math.round((currentStep / totalSteps) * 100), 99), status);
            }
        };

        // Step 1: Insert teachers + create auth accounts
        let accountsCreated = 0;
        for (const teacher of teachers) {
            updateProgress(`Creating account for ${teacher.name}...`);
            // Insert into teachers table
            await sql`
                INSERT INTO teachers (name, email) 
                VALUES (${teacher.name}, ${teacher.email}) 
                ON CONFLICT (name) DO UPDATE SET email = EXCLUDED.email
            `;

            // Create auth account via better-auth signUp
            try {
                // Try to create the auth account
                await authClient.signUp.email({
                    email: teacher.email,
                    password: 'dps@12345',
                    name: teacher.name,
                });
            } catch (authError) {
                // Ignore errors (e.g. user already exists)
            }

            // Always attempt to create or sync the profile for the teacher
            try {
                const authUsers = await sql`
                    SELECT id FROM neon_auth."user" WHERE email = ${teacher.email} LIMIT 1
                `;

                if (authUsers.length > 0) {
                    await sql`
                        INSERT INTO public.profiles (id, full_name, email, role)
                        VALUES (${authUsers[0].id}, ${teacher.name}, ${teacher.email}, 'teacher')
                        ON CONFLICT (email) DO UPDATE SET 
                            id = EXCLUDED.id,
                            role = 'teacher'
                    `;
                    accountsCreated++;
                }
            } catch (err) {
                console.error(`Error syncing profile for ${teacher.email}:`, err);
            }
        }

        // Step 2: Insert subjects
        updateProgress("Setting up subjects...");
        for (const subject of subjects) {
            await sql`
                INSERT INTO subjects (name) 
                VALUES (${subject}) 
                ON CONFLICT (name) DO NOTHING
            `;
        }

        // Step 3: Build name → ID maps
        const allTeachers = await sql`SELECT id, name FROM teachers`;
        const allSubjects = await sql`SELECT id, name FROM subjects`;
        const teacherMap = new Map(allTeachers.map(t => [t.name, t.id]));
        const subjectMap = new Map(allSubjects.map(s => [s.name, s.id]));

        // Step 4: Insert classes (with class teacher)
        updateProgress("Configuring classes...");
        for (const className of classes) {
            const classTeacherName = classTeacherMap[className];
            const classTeacherId = classTeacherName ? teacherMap.get(classTeacherName) : null;
            await sql`
                INSERT INTO classes (name, class_teacher_id)
                VALUES (${className}, ${classTeacherId})
                ON CONFLICT (name) DO UPDATE SET class_teacher_id = EXCLUDED.class_teacher_id
            `;
        }

        // Step 5: Fetch classes for mapping
        const allClasses = await sql`SELECT id, name FROM classes`;
        const classMap = new Map(allClasses.map(c => [c.name, c.id]));

        // Step 6: Insert class_subjects assignments
        updateProgress("finalizing subject assignments...");
        let successCount = 0;
        for (const entry of assignments) {
            const classId = classMap.get(entry.className);
            const subjectId = subjectMap.get(entry.subject);
            const teacherId = teacherMap.get(entry.subjectTeacher);

            if (classId && subjectId && teacherId) {
                await sql`
                    INSERT INTO class_subjects (class_id, subject_id, teacher_id)
                    VALUES (${classId}, ${subjectId}, ${teacherId})
                    ON CONFLICT (class_id, subject_id, teacher_id) DO NOTHING
                `;
                successCount++;
            }
        }

        if (onProgress) onProgress(100, "Done!");

        return {
            success: true,
            message: `Successfully processed ${successCount} assignments.`,
            teachersCount: teachers.length,
            subjectsCount: subjects.length,
            classesCount: classes.length,
            assignmentsCount: successCount,
            accountsCreated,
        };
    } catch (error) {
        console.error("Execute Import Error:", error);
        throw error instanceof Error ? error : new Error("Failed to execute import.");
    }
};

export const bulkDeleteData = async () => {
    try {
        const adminEmail = 'manojupadhyay256@gmail.com';

        // 1. Get admin user ID to preserve sessions/accounts
        const adminUsers = await sql`
            SELECT id FROM neon_auth."user" WHERE email = ${adminEmail} LIMIT 1
        `;
        const adminId = adminUsers[0]?.id;

        // 2. Delete data in order to respect foreign keys (Children -> Parents)
        // Targeted tables confirmed to exist in user's public schema
        await sql`DELETE FROM attendance`;
        await sql`DELETE FROM class_subjects`;
        await sql`DELETE FROM students`;
        await sql`DELETE FROM classes`;
        await sql`DELETE FROM holidays`;
        await sql`DELETE FROM subjects`;
        await sql`DELETE FROM teachers`;

        // 3. Profiles and Auth (Preserving Admin)
        await sql`DELETE FROM profiles WHERE email != ${adminEmail}`;

        if (adminId) {
            await sql`DELETE FROM neon_auth.session WHERE "userId" != ${adminId}`;
            await sql`DELETE FROM neon_auth.account WHERE "userId" != ${adminId}`;
            await sql`DELETE FROM neon_auth."user" WHERE id != ${adminId}`;
        } else {
            // Safety: if adminId is not found, we don't clear auth users to avoid lockout
            console.warn("Admin ID not found during bulk delete, skipping auth user deletion.");
        }

        return {
            success: true,
            message: "Academic data has been successfully cleared. Admin account preserved.",
        };
    } catch (error) {
        console.error("Bulk Delete Error:", error);
        throw error instanceof Error ? error : new Error("Failed to clear data.");
    }
};
