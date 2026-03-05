import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Calendar, BookOpen, UserCircle } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { authClient } from '../../lib/auth-client';
import { sql } from '../../lib/db';
import { motion } from 'framer-motion';

const SignUp = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        dob: '',
        gender: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { data, error: authError } = await authClient.signUp.email({
                email: formData.email,
                password: formData.password,
                name: formData.fullName,
            });

            if (authError) {
                setError(authError.message || 'Failed to create account');
                setIsLoading(false);
                return;
            }

            // Create profile in public.profiles
            // Note: In a production app, this should be done via a database trigger 
            // on the auth.users table for better reliability.
            const userRole = formData.email.toLowerCase() === 'manojupadhyay256@gmail.com' ? 'admin' : 'teacher';

            await sql`
                INSERT INTO public.profiles (id, full_name, email, role)
                VALUES (${data.user.id}, ${formData.fullName}, ${formData.email}, ${userRole})
                ON CONFLICT (id) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    email = EXCLUDED.email,
                    role = EXCLUDED.role
            `;

            navigate('/signin');
        } catch (err: any) {
            console.error('Signup error:', err);
            setError(err.message || 'Failed to create account');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl w-full"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/20">
                        <BookOpen className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create Account</h1>
                    <p className="text-gray-500 mt-2">Join ClassCheck and start managing your school</p>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Full Name"
                                name="fullName"
                                placeholder="John Doe"
                                icon={<User className="w-5 h-5" />}
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                            />

                            <Input
                                label="Email Address"
                                name="email"
                                placeholder="name@school.com"
                                type="email"
                                icon={<Mail className="w-5 h-5" />}
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />

                            <Input
                                label="Date of Birth"
                                name="dob"
                                type="date"
                                icon={<Calendar className="w-5 h-5" />}
                                value={formData.dob}
                                onChange={handleChange}
                                required
                            />

                            <div className="w-full space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 ml-1">Gender</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        <UserCircle className="w-5 h-5" />
                                    </div>
                                    <select
                                        name="gender"
                                        className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10 pl-11 appearance-none"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <Input
                                label="Password"
                                name="password"
                                placeholder="••••••••"
                                type="password"
                                icon={<Lock className="w-5 h-5" />}
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />

                            <Input
                                label="Confirm Password"
                                name="confirmPassword"
                                placeholder="••••••••"
                                type="password"
                                icon={<Lock className="w-5 h-5" />}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" isLoading={isLoading}>
                            Create Account
                        </Button>
                    </form>

                    <p className="text-center mt-8 text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link to="/signin" className="font-bold text-gray-900 hover:text-primary transition-colors">
                            Sign in instead
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default SignUp;
