'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { useAppDispatch } from '@/store/hooks';
import { login } from '@/features/user/userSlice';
import axiosInstance from '@/api/axiosInstance';

type LoginFormInputs = {
    email: string;
    password: string;
};

export default function LoginPage() {
    const { register, handleSubmit } = useForm<LoginFormInputs>();
    const dispatch = useAppDispatch();

    const onSubmit = async (data: LoginFormInputs) => {
        try {
            await axiosInstance.post('/login', data);
            dispatch(login());
            // Redirect or perform other actions
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <form onSubmit={handleSubmit(onSubmit)}>
                <Input {...register('email')} placeholder="Email" type="email" className="mb-4" />
                <Input {...register('password')} placeholder="Password" type="password" className="mb-4" />
                <Button type="submit">Login</Button>
            </form>
        </div>
    );
}
