// src/app/login/page.tsx

'use client';

import React, {useEffect} from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/store/hooks'; // Use typed hooks
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { login } from '@/features/user/userSlice';
import { Logo } from '@/components/custom/TopLeftLogo';
import {LoginRequest} from "@/types/type";

type LoginFormInputs = {
    email: string;
    password: string;
};

const formVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.5,
            type: "spring",
            stiffness: 100,
            when: "beforeChildren",
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 100 }
    }
};

export default function LoginPage() {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<LoginFormInputs>();

    const dispatch = useAppDispatch(); // Use the typed dispatch
    const router = useRouter();

    const { loading, error } = useAppSelector((state) => state.user); // Access loading and error states

    // Reset the error state when the component mounts
    useEffect(() => {
        dispatch({type: 'user/errorReset'})
    },[])
    const onSubmit = async (data: LoginRequest) => {
        try {
            // @ts-ignore
            const resultAction = await dispatch(login(data));
            if (login.fulfilled.match(resultAction)) {
                // Login successful
                console.log('router trying to push');
                router.push('/profile');
            } else if (login.rejected.match(resultAction)) {
                // Login failed
                console.error('Login failed:', resultAction.payload);
                // Optionally, display the error using a toast or UI element
            }
        } catch (error) {
            console.error('Login failed:', error);
            // Handle any unexpected errors
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-4 overflow-hidden">
            <Logo />
            <motion.div
                variants={formVariants}
                initial="hidden"
                animate="visible"
            >
                <Card className="w-[90vw] shadow-2xl backdrop-blur-sm bg-white/90">
                    <CardHeader className="space-y-1">
                        <motion.div variants={itemVariants}>
                            <CardTitle className="text-2xl text-center font-bold">Sign in</CardTitle>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <CardDescription className="text-center">
                                Enter your credentials to access your account
                            </CardDescription>
                        </motion.div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <motion.div variants={itemVariants} className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    {...register("email", {
                                        required: "Email is required",
                                        pattern: {
                                            value: /\S+@\S+\.\S+/,
                                            message: "Invalid email address"
                                        }
                                    })}
                                    className="transition-all duration-200 focus:ring-2 focus:ring-purple-400"
                                />
                                {errors.email && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-sm text-red-500"
                                    >
                                        {errors.email.message}
                                    </motion.p>
                                )}
                            </motion.div>
                            <motion.div variants={itemVariants} className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    {...register("password", {
                                        required: "Password is required",
                                        minLength: {
                                            value: 8,
                                            message: "Password must be at least 8 characters"
                                        }
                                    })}
                                    className="transition-all duration-200 focus:ring-2 focus:ring-purple-400"
                                />
                                {errors.password && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-sm text-red-500"
                                    >
                                        {errors.password.message}
                                    </motion.p>
                                )}
                            </motion.div>
                            <motion.div variants={itemVariants}>
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                                    disabled={isSubmitting || loading}
                                >
                                    {isSubmitting || loading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : null}
                                    Sign In
                                </Button>
                            </motion.div>
                            <motion.div variants={itemVariants}>
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-sm text-red-500 text-center"
                                    >
                                        {error}
                                    </motion.p>
                                )}
                            </motion.div>
                        </form>
                    </CardContent>
                    <CardFooter>
                        <motion.div variants={itemVariants} className="w-full">
                            <Link href="/reset" passHref>
                                <Button variant="link" className="w-36 text-sm text-gray-600 hover:text-gray-800">
                                    Forgot password?
                                </Button>
                            </Link>
                        </motion.div>
                        <motion.div variants={itemVariants} className="w-36">
                            <Link href="/signup" passHref>
                                <Button variant="outline" className="w-full">
                                    Create an account
                                </Button>
                            </Link>
                        </motion.div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
