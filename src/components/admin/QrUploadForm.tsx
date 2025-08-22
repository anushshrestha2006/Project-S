
'use client';

import { useActionState, useRef, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { uploadPaymentQr } from '@/lib/actions';
import type { PaymentMethod } from '@/lib/types';
import { UploadCloud, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface QrUploadFormProps {
    paymentMethod: PaymentMethod;
    currentQrUrl: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
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

export function QrUploadForm({ paymentMethod, currentQrUrl }: QrUploadFormProps) {
    const initialState = { success: false, message: '' };
    const [state, formAction] = useActionState(uploadPaymentQr, initialState);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    useEffect(() => {
        if (!state.message) return;
        
        if (state.success) {
            toast({
                title: 'Success!',
                description: state.message,
            });
            formRef.current?.reset();
            setPreviewUrl(null);
        } else {
             toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: state.message,
            });
        }
    }, [state, toast]);

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
    
    return (
         <div className="space-y-4">
             <div className="flex flex-col items-center gap-4">
                <p className="font-semibold text-muted-foreground">Current QR Code</p>
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                     {currentQrUrl ? (
                        <Image src={currentQrUrl} alt={`${paymentMethod} QR Code`} width={192} height={192} className="object-contain"/>
                     ) : (
                        <p className="text-xs text-muted-foreground text-center p-2">No QR Code uploaded yet.</p>
                     )}
                </div>
            </div>

            <form ref={formRef} action={formAction} className="space-y-4">
                <input type="hidden" name="paymentMethod" value={paymentMethod} />
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="qrCode">Upload New QR Code</Label>
                    <Input id="qrCode" name="qrCode" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} required/>
                </div>
                 {previewUrl && (
                    <div className="flex flex-col items-center gap-2">
                        <p className="font-semibold text-muted-foreground text-sm">New QR Preview</p>
                        <Image src={previewUrl} alt="New QR Preview" width={128} height={128} className="object-contain rounded-md border p-1" />
                    </div>
                 )}
                <SubmitButton />
            </form>
         </div>
    );
}
