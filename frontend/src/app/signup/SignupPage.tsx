'use client';

import React, {useEffect} from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { register_acc } from '@/features/user/userSlice';
import {Logo} from '@/components/custom/TopLeftLogo'
import {RegisterRequest} from "@/types/type";
import {useAppSelector} from "@/store/hooks";
type SignUpFormInputs = {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
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

export default function SignUpPage() {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        watch
    } = useForm<SignUpFormInputs>();

    const dispatch = useDispatch();
    const router = useRouter();
    const { loading, error } = useAppSelector((state) => state.user); // Access loading and error states

    // Reset the error state when the component mounts
    useEffect(() => {
        dispatch({type: 'user/errorReset'})
    },[])
    const onSubmit = async (data: SignUpFormInputs) => {
        try {
            console.log(data)
            const final_data : RegisterRequest = {email: data.email, password: data.password, full_name: data.name}
            // @ts-ignore
            const resultAction = await dispatch(register_acc(final_data));

            if (register_acc.fulfilled.match(resultAction)) {
                // Sign up successful
                router.push('/profile');
            } else if (register_acc.rejected.match(resultAction)) {
                // Sign up failed
                console.error('Signup failed:', resultAction.payload);
                // Optionally, display the error to the user
            }
        } catch (error) {
            console.error('An unexpected error occurred:', error);
        }
    };

    return (
        <div className = "min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-4">
            <Logo />
            <motion.div
                variants={formVariants}
                initial="hidden"
                animate="visible"
            >
                <Card className="w-80 shadow-2xl backdrop-blur-sm bg-white/90">
                    <CardHeader className="space-y-1">
                        <motion.div variants={itemVariants}>
                            <CardTitle className="text-2xl text-center font-bold">Create an Account</CardTitle>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <CardDescription className="text-center">
                                Sign up for a new Parking Pass account
                            </CardDescription>
                        </motion.div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <motion.div variants={itemVariants} className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    {...register("name", { required: "Name is required" })}
                                    className="transition-all duration-200 focus:ring-2 focus:ring-purple-400"
                                />
                                {errors.name && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-sm text-red-500"
                                    >
                                        {errors.name.message}
                                    </motion.p>
                                )}
                            </motion.div>
                            <motion.div variants={itemVariants} className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
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
                            <motion.div variants={itemVariants} className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    {...register("confirmPassword", {
                                        required: "Please confirm your password",
                                        validate: (val: string) => {
                                            if (watch('password') != val) {
                                                return "Your passwords do not match";
                                            }
                                        }
                                    })}
                                    className="transition-all duration-200 focus:ring-2 focus:ring-purple-400"
                                />
                                {errors.confirmPassword && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-sm text-red-500"
                                    >
                                        {errors.confirmPassword.message}
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
                                    Sign Up
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
                        <motion.div variants={itemVariants} className="w-full text-center">
                            <span className="text-sm text-gray-600">Already have an account? </span>
                            <Link href="/login" passHref>
                                <Button variant="link" className="text-sm text-purple-600 hover:text-purple-800">
                                    Sign In
                                </Button>
                            </Link>
                        </motion.div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}