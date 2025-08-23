
'use client';
import { useState, useActionState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { useFormStatus } from 'react-dom';
import { processBooking, type BookingState } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { PaymentDetails, PaymentMethod } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

interface PaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  bookingDetails: {
    rideId: string;
    userId: string;
    seats: number[];
    passengerName: string;
    passengerPhone: string;
    totalPrice: number;
  };
  paymentDetails: PaymentDetails;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Submitting...' : 'Complete Booking'}
        </Button>
    )
}

function QrCodeDisplay({ qrUrl, altText }: { qrUrl: string, altText: string }) {
    return (
        <div className="aspect-square w-full bg-muted rounded-md flex items-center justify-center p-4">
           {qrUrl ? (
                <Image data-ai-hint="QR code" src={qrUrl} width={300} height={300} alt={altText} className="object-contain" />
            ) : (
                <div className="text-center text-muted-foreground">
                    <p>QR Code not available.</p>
                    <p className="text-xs">Admin needs to upload it.</p>
                </div>
            )}
        </div>
    );
}

export function PaymentDialog({ isOpen, setIsOpen, bookingDetails, paymentDetails }: PaymentDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [activeTab, setActiveTab] = useState<PaymentMethod>('esewa');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const initialState: BookingState = { message: null, errors: {} };
  const [state, dispatch] = useActionState(processBooking, initialState);

  useEffect(() => {
    if(!isOpen) return;

    if (state?.message && !state.errors) {
        toast({
            title: "Booking Submitted!",
            description: state.message,
            variant: 'default',
            className: "bg-green-500 border-green-500 text-white"
        });
        setIsOpen(false);
        router.refresh();
        setTimeout(() => router.push('/my-bookings'), 2000);
    } else if (state?.message && state.errors) {
        const errorDescription = Object.values(state.errors).flat().join('\n');
        toast({
            variant: "destructive",
            title: "Booking Failed",
            description: errorDescription || "An unexpected error occurred."
        })
    }
  }, [state, isOpen, setIsOpen, router, toast]);

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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Payment</DialogTitle>
          <DialogDescription>
            Scan the QR to pay NPR {bookingDetails.totalPrice.toLocaleString()}. Then, upload a screenshot of the payment confirmation.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={dispatch}>
            <input type="hidden" name="rideId" value={bookingDetails.rideId} />
            <input type="hidden" name="seats" value={JSON.stringify(bookingDetails.seats)} />
            <input type="hidden" name="userId" value={bookingDetails.userId} />
            <input type="hidden" name="passengerName" value={bookingDetails.passengerName} />
            <input type="hidden" name="passengerPhone" value={bookingDetails.passengerPhone} />
            <input type="hidden" name="paymentMethod" value={activeTab} />

            <Tabs defaultValue="esewa" className="w-full" onValueChange={(val) => setActiveTab(val as PaymentMethod)}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="esewa">eSewa</TabsTrigger>
                    <TabsTrigger value="khalti">Khalti</TabsTrigger>
                    <TabsTrigger value="imepay">IMEPay</TabsTrigger>
                </TabsList>
                <TabsContent value="esewa">
                    <QrCodeDisplay qrUrl={paymentDetails.esewa.qrUrl} altText="eSewa QR Code" />
                </TabsContent>
                <TabsContent value="khalti">
                     <QrCodeDisplay qrUrl={paymentDetails.khalti.qrUrl} altText="Khalti QR Code" />
                </TabsContent>
                <TabsContent value="imepay">
                     <QrCodeDisplay qrUrl={paymentDetails.imepay.qrUrl} altText="IMEPay QR Code" />
                </TabsContent>
            </Tabs>
            
            <div className="grid w-full items-center gap-1.5 mt-4">
                <Label htmlFor="paymentScreenshot">Payment Screenshot</Label>
                <Input type="file" id="paymentScreenshot" name="paymentScreenshot" required accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                 {state?.errors?.paymentScreenshot && <p className="text-xs text-destructive">{state.errors.paymentScreenshot[0]}</p>}
            </div>
             {previewUrl && (
                <div className="mt-2 flex flex-col items-center gap-2">
                    <p className="font-semibold text-muted-foreground text-sm">Screenshot Preview</p>
                    <Image src={previewUrl} alt="Payment screenshot preview" width={100} height={100} className="object-contain rounded-md border p-1" />
                </div>
            )}
            
             <DialogFooter className="mt-6">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <SubmitButton />
            </DialogFooter>
             {state?.errors?.server && <p className="text-sm text-destructive text-center pt-2">{state.errors.server[0]}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
