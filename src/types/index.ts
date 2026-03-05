export type UserRole = 'admin' | 'principal' | 'teacher';

export interface Profile {
    id: string;
    full_name: string;
    email: string;
    date_of_birth?: string;
    gender?: 'Male' | 'Female' | 'Other';
    role: UserRole;
    created_at: string;
    updated_at: string;
}

export interface Class {
    id: string;
    name: string;
    class_teacher_id: string | null;
    teacher_name?: string;
    student_count?: number;
    created_at: string;
}

export interface Student {
    id: string;
    admission_no: string;
    student_name: string;
    father_name: string;
    mother_name: string;
    phone_number: string;
    category: string;
    class_id: string;
    created_at: string;
    updated_at: string;
}

export interface Attendance {
    id: string;
    student_id: string;
    class_id: string;
    date: string;
    status: 'Present' | 'Absent' | 'Leave' | 'Holiday';
    marked_by: string;
    created_at: string;
}

export interface Holiday {
    id: string;
    date: string;
    description: string;
    created_at: string;
}
