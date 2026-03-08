import { startOfYear, differenceInWeeks } from 'date-fns';

export interface Tip {
    content: string;
    author?: string;
}

export const teacherTips: Tip[] = [
    { content: "The art of teaching is the art of assisting discovery.", author: "Mark Van Doren" },
    { content: "Teaching is the greatest act of optimism.", author: "Colleen Wilcox" },
    { content: "Students don't care how much you know until they know how much you care.", author: "Teddy Roosevelt" },
    { content: "The best teachers are those who show you where to look but don't tell you what to see.", author: "Alexandra K. Trenfor" },
    { content: "Education is not the filling of a pail, but the lighting of a fire.", author: "W.B. Yeats" },
    { content: "Try using 'wait time'—give students 3-5 seconds to think after asking a question.", author: "Teaching Best Practice" },
    { content: "Positive reinforcement is 10x more effective than criticism. Catch them doing something right!", author: "Classroom Management" },
    { content: "Every child deserves a champion—an adult who will never give up on them.", author: "Rita Pierson" },
    { content: "A teacher affects eternity; he can never tell where his influence stops.", author: "Henry Adams" },
    { content: "Start your class with a 'Hook'—something surprising or intriguing to grab attention.", author: "Pedagogy Tip" }
];

export const studentTips: Tip[] = [
    { content: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
    { content: "The expert in anything was once a beginner.", author: "Helen Hayes" },
    { content: "Don't study harder, study smarter. Try the Pomodoro technique (25m study, 5m break).", author: "Study Hack" },
    { content: "Consistency beats intensity. 30 minutes every day is better than a 5-hour cram session.", author: "Learning Tip" },
    { content: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
    { content: "Mistakes are proof that you are trying. Don't be afraid to ask 'why'.", author: "Growth Mindset" },
    { content: "Active recall is the best way to learn. Instead of re-reading, try to explain it to a friend.", author: "Learning Strategy" },
    { content: "Your attitude, not your aptitude, will determine your altitude.", author: "Zig Ziglar" },
    { content: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
    { content: "Organize your notes using the Cornell method for better retention during exams.", author: "Success Tip" }
];

/**
 * Returns a tip from the provided array based on the current week of the year.
 * This ensures the tip remains the same for the entire week for all users.
 */
export function getWeeklyTip(tips: Tip[]): Tip {
    if (!tips || tips.length === 0) return { content: "Keep learning and growing!" };

    const now = new Date();
    const start = startOfYear(now);
    const weekNumber = differenceInWeeks(now, start);

    // Cycle through tips based on the week number
    const index = weekNumber % tips.length;
    return tips[index];
}
