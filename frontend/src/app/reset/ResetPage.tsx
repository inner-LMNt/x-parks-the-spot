'use client';

import React, {useEffect, useState} from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/custom/TopLeftLogo';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {reset} from '@/features/user/userSlice';
import {PasswordResetRequest} from "@/types/type";
import {useAppDispatch} from "@/store/hooks";
import {useAppSelector} from "@/store/hooks";
import Link from "next/link"; // Adjust the path if needed

type ForgotPasswordInputs = {
    email: string;
};

const formVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.5,
            type: 'spring',
            stiffness: 100,
            when: 'beforeChildren',
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 100 },
    },
};

export default function ForgotPasswordPage() {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordInputs>();

    const dispatch = useAppDispatch();
    const [isDialogOpen, setIsDialogOpen] = useState(false); // Initially false
    const { loading, error } = useAppSelector((state) => state.user);
    const router = useRouter();
    // Reset the error state when the component mounts
    useEffect(() => {
        dispatch({type: 'user/errorReset'})
    },[])
    const onSubmit = async (data: PasswordResetRequest) => {
        try {
            // @ts-ignore
            const resultAction = await dispatch(reset(data.email));

            if (reset.fulfilled.match(resultAction)) {
                // Password reset email sent successfully
                console.log('Password reset email sent:', data);
                setIsDialogOpen(true);
            } else if (reset.rejected.match(resultAction)) {
                // Password reset failed
                console.error('Password reset failed:', resultAction.payload);
                // Optionally, display the error to the user
            }
        } catch (error) {
            console.error('An unexpected error occurred:', error);
        }
    };

    const handleDialogConfirm = () => {
        // Close the dialog and redirect to the sign-in page
        setIsDialogOpen(false);
        router.push('/login'); // Redirect to login page
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-4">
            <Logo />
            <motion.div variants={formVariants} initial="hidden" animate="visible">
                <Card className="relative w-[350px] shadow-2xl bg-white border border-gray-200 rounded-lg">
                    <motion.div variants={itemVariants}>
                        <Link href="/login" passHref>
                            <Button variant="link" className="absolute mt-2 ml-0">
                                <ArrowLeft className="w-5 h-5 text-gray-400"/>
                            </Button>
                        </Link>
                    </motion.div>
                    <CardHeader className="space-y-1">
                        <motion.div variants={itemVariants}>
                            <CardTitle className="text-2xl text-center font-bold">Forgot Password</CardTitle>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <CardDescription className="text-center text-gray-600">
                                Enter your email to reset your password
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
                                    {...register('email', {
                                        required: 'Email is required',
                                        pattern: {
                                            value: /\S+@\S+\.\S+/,
                                            message: 'Invalid email address',
                                        },
                                    })}
                                    className="transition-all duration-200 focus:ring-2 focus:ring-purple-400"
                                />
                                {errors.email && (
                                    <motion.p
                                        initial={{opacity: 0, y: -10}}
                                        animate={{opacity: 1, y: 0}}
                                        className="text-sm text-red-500"
                                    >
                                        {errors.email.message}
                                    </motion.p>
                                )}
                            </motion.div>
                            <motion.div variants={itemVariants}>
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                                    disabled={isSubmitting || loading}
                                >
                                    {isSubmitting || loading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                    ) : null}
                                    Reset Password
                                </Button>
                            </motion.div>
                            <motion.div variants={itemVariants}>
                                {error && (
                                    <motion.p
                                        initial={{opacity: 0, y: -10}}
                                        animate={{opacity: 1, y: 0}}
                                        className="text-sm text-red-500 text-center"
                                    >
                                        {error}
                                    </motion.p>
                                )}
                            </motion.div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>

            <AlertDialog open={isDialogOpen} onOpenChange={() => setIsDialogOpen(true)}>
                <AlertDialogContent className="bg-white shadow-lg rounded-lg p-6">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg text-purple-700 font-bold">Password Reset
                            Requested</AlertDialogTitle> {/* Updated Color */}
                        <AlertDialogDescription className="text-sm text-gray-600">
                            A password reset link has been sent to your email. Please check your inbox and follow the instructions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            className="bg-purple-500 text-white hover:bg-purple-600 rounded-md px-4 py-2"
                            onClick={handleDialogConfirm}
                        >
                            OK
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
