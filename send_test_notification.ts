
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.VITE_DATABASE_URL!);

async function run() {
    try {
        console.log('--- Searching for Aariv Tudu (9205) ---');
        const students = await sql`
            SELECT id, student_name, class_id FROM students WHERE admission_no = '9205' LIMIT 1
        `;

        if (students.length === 0) {
            console.log('Student not found');
            return;
        }

        const aariv = students[0];
        console.log('Found Student:', aariv);

        console.log('--- Searching for Class Teacher ---');
        const classes = await sql`
            SELECT name, class_teacher_id FROM classes WHERE id = ${aariv.class_id} LIMIT 1
        `;

        if (classes.length === 0 || !classes[0].class_teacher_id) {
            console.log('Class or Teacher not found');
            return;
        }

        const classInfo = classes[0];
        const teacher = await sql`
            SELECT name, email FROM teachers WHERE id = ${classInfo.class_teacher_id} LIMIT 1
        `;

        if (teacher.length === 0) {
            console.log('Teacher details not found');
            return;
        }

        const teacherInfo = teacher[0];
        console.log('Found Teacher:', teacherInfo);

        // Find the profile ID for the teacher (recipient_id must be a profile_id)
        const profile = await sql`
            SELECT id FROM profiles WHERE LOWER(email) = LOWER(${teacherInfo.email}) LIMIT 1
        `;

        if (profile.length === 0) {
            console.log('Teacher profile not found');
            return;
        }

        const recipientId = profile[0].id;
        console.log('Recipient Profile ID:', recipientId);

        console.log('--- Sending Test Notification ---');
        const title = `Notification Test from Aariv Tudu`;
        const message = 'Hello teacher, I am testing the new Vercel notification system. Please confirm if you received this.';

        const result = await sql`
            INSERT INTO notifications (sender_id, recipient_id, title, message, type, priority, status)
            VALUES (${aariv.id}, ${recipientId}, ${title}, ${message}, 'private_message', 'normal', 'pending')
            RETURNING id
        `;

        console.log('Notification created with ID:', result[0].id);
        console.log('The worker should process this in a few seconds.');

    } catch (err) {
        console.error('Error:', err);
    }
}

run();
