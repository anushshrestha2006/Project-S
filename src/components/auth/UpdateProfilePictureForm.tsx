
'use client';

import { useActionState, useRef, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateProfilePicture } from '@/lib/actions';
import type { User } from '@/lib/types';
import { UploadCloud, Loader2, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                </>
            ) : (
                <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload & Save
                </>
            )}
        </Button>
    )
}

interface UpdateProfilePictureFormProps {
    currentUser: User;
    onProfileUpdate: (updatedUser: Partial<User>) => void;
}


export function UpdateProfilePictureForm({ currentUser, onProfileUpdate }: UpdateProfilePictureFormProps) {
    const initialState = { success: false, message: '', errors: {}, user: null };
    const [state, formAction] = useActionState(updateProfilePicture, initialState);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!state) return;
        
        if (state.success && state.user) {
            toast({
                title: 'Success!',
                description: state.message,
            });
            onProfileUpdate(state.user);
            formRef.current?.reset();
            setPreviewUrl(null);
        } else if (!state.success && state.message) {
             toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: state.message,
            });
        }
    }, [state, toast, onProfileUpdate]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setPreviewUrl(null);
        }
    };
    
    const getInitials = (name: string) => {
      if (!name) return 'U';
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    
    return (
         <Card>
            <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Upload a new avatar. It will be visible to others.</CardDescription>
            </CardHeader>
            <CardContent>
                <form ref={formRef} action={formAction} className="space-y-4">
                    <input type="hidden" name="userId" value={currentUser.id} />
                    <div className="flex flex-col items-center gap-4">
                        <Avatar className="w-32 h-32 text-4xl border-4 border-primary/20">
                            <AvatarImage src={previewUrl || currentUser.photoURL} alt={currentUser.name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {getInitials(currentUser.name)}
                            </AvatarFallback>
                        </Avatar>

                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="photo">Select Image</Label>
                            <Input id="photo" name="photo" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                            {state?.errors?.photo && <p className="text-xs text-destructive">{state.errors.photo[0]}</p>}
                        </div>

                    </div>
                    <SubmitButton />
                </form>
            </CardContent>
         </Card>
    );
}
