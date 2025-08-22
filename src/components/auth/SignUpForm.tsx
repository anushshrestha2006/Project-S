'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import type { User } from '@/lib/types';
import { CheckCircle2, XCircle, User as UserIcon, Mail, Phone, Lock } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phoneNumber: z.string().regex(/^\d{10}$/, { message: 'Please enter a valid 10-digit phone number.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
});

const PasswordStrengthIndicator = ({ password = '' }: { password?: string }) => {
    const getStrength = () => {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/\d/.test(password)) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++; // special chars
        return score;
    }

    const score = getStrength();
    const value = (score / 5) * 100;
    const label = ['Very Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'][score];
    const color = ['bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-500'][score];

    if (!password) return null;

    return (
        <div>
            <Progress value={value} className="h-1.5" barClassName={color} />
            <p className="text-xs mt-1 text-right text-muted-foreground">{label}</p>
        </div>
    );
};


export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched'
  });

  const { watch, formState: { errors } } = form;
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  function onSubmit(values: z.infer<typeof formSchema>) {
    // This is mock signup. Replace with Firebase Auth.
    const newUser: User = {
        id: `user-${Date.now()}`,
        name: values.name,
        email: values.email,
        phoneNumber: values.phoneNumber,
        role: 'user',
    }
    // In a real app, you would not store the password here.
    // Also, you would check if user already exists.
    
    localStorage.setItem('sumo-sewa-user', JSON.stringify(newUser));

    toast({
      title: 'Account Created Successfully!',
      description: "Welcome to Sumo Sewa. You are now logged in.",
    });
    router.push('/');
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="John Doe" {...field} className="pl-10" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="name@example.com" {...field} className="pl-10"/>
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="98XXXXXXXX" {...field} className="pl-10"/>
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} className="pl-10"/>
                </FormControl>
              </div>
              <FormMessage />
              <PasswordStrengthIndicator password={field.value} />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="pl-10"/>
                    </FormControl>
                    {confirmPassword && (
                        password === confirmPassword && !errors.confirmPassword ? (
                            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                        ) : (
                            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-destructive" />
                        )
                    )}
                </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full text-base py-6">
          Create Account
        </Button>
      </form>
    </Form>
  );
}
