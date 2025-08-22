'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
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
import { CheckCircle2, XCircle } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  phoneNumber: z.string().regex(/^\d{10}$/, { message: 'Please enter a valid 10-digit phone number.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

function PasswordStrength({ password }: { password?: string }) {
  const [strength, setStrength] = useState({ value: 0, label: 'Weak', color: 'bg-destructive' });

  useState(() => {
    let score = 0;
    if (!password) {
      setStrength({ value: 0, label: 'Weak', color: 'bg-destructive' });
      return;
    }
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/\d/.test(password)) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score < 3) {
      setStrength({ value: (score / 5) * 100, label: 'Weak', color: 'bg-destructive' });
    } else if (score < 5) {
      setStrength({ value: (score / 5) * 100, label: 'Medium', color: 'bg-yellow-500' });
    } else {
      setStrength({ value: 100, label: 'Strong', color: 'bg-green-500' });
    }
  });

  return (
    <div>
        <Progress value={strength.value} className="h-2" barClassName={strength.color} />
        <p className="text-xs mt-1 text-muted-foreground">{strength.label}</p>
    </div>
  );
}

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

  const password = form.watch('password');
  const confirmPassword = form.watch('confirmPassword');
  const { errors } = form.formState;

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Mock signup
    const newUser: User = {
        id: `user-${Date.now()}`,
        name: values.name,
        email: values.email,
        role: 'user',
        // In a real app, you would not store the password here
    }
    localStorage.setItem('sumo-sewa-user', JSON.stringify(newUser));

    toast({
      title: 'Account Created',
      description: "You have been successfully signed up.",
    });
    router.push('/');
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
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
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
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
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
              <FormControl>
                <Input placeholder="98XXXXXXXX" {...field} />
              </FormControl>
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
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
               <PasswordStrength password={field.value} />
              <FormMessage />
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
                    <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
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
        <Button type="submit" className="w-full">
          Create Account
        </Button>
        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline">
            Login
          </Link>
        </div>
      </form>
    </Form>
  );
}
