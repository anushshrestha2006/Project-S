
'use client';
import { useState, useRef, useEffect } from 'react';
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
import { processBooking, type BookingState } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { PaymentDetails, PaymentMethod } from '@/lib/types';
import { Loader2 } from 'lucide-react';

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

export function PaymentDialog({ isOpen, setIsOpen, bookingDetails, paymentDetails }: PaymentDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [activeTab, setActiveTab] = useState<PaymentMethod>('esewa');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<BookingState | null>(null);

  useEffect(() => {
    if(!isOpen) {
      setFormState(null); // Reset state when dialog closes
      setPreviewUrl(null);
      formRef.current?.reset();
      return;
    }

    if (formState?.success) {
        toast({
            title: "Booking Submitted!",
            description: formState.message,
            variant: 'default',
            className: "bg-green-500 border-green-500 text-white"
        });
        setIsOpen(false);
        router.refresh();
        setTimeout(() => router.push('/my-bookings'), 2000);
    } else if (formState && !formState.success && formState.message) {
        const errorDescription = formState.errors ? Object.values(formState.errors).flat().join('\n') : "An unexpected error occurred.";
        toast({
            variant: "destructive",
            title: "Booking Failed",
            description: errorDescription
        })
    }
  }, [formState, isOpen, setIsOpen, router, toast]);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormState(null);

    const formData = new FormData(event.currentTarget);
    const result = await processBooking(null, formData);

    setFormState(result);
    setIsSubmitting(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Payment</DialogTitle>
          <DialogDescription>
            Scan the QR to pay NPR {bookingDetails.totalPrice.toLocaleString()}. Then, upload a screenshot of the payment confirmation.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit}>
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
                    <div className="aspect-square w-full bg-muted rounded-md flex items-center justify-center p-4">
                       {paymentDetails.esewa.qrUrl ? (
                            <Image data-ai-hint="QR code" src={paymentDetails.esewa.qrUrl} width={300} height={300} alt="eSewa QR Code" className="object-contain" />
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <p>QR Code not available.</p>
                                <p className="text-xs">Admin needs to upload it.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="khalti">
                     <div className="aspect-square w-full bg-muted rounded-md flex items-center justify-center p-4">
                       {paymentDetails.khalti.qrUrl ? (
                            <Image data-ai-hint="QR code" src={paymentDetails.khalti.qrUrl} width={300} height={300} alt="Khalti QR Code" className="object-contain" />
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <p>QR Code not available.</p>
                                <p className="text-xs">Admin needs to upload it.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="imepay">
                    <div className="aspect-square w-full bg-muted rounded-md flex items-center justify-center p-4">
                       {paymentDetails.imepay.qrUrl ? (
                            <Image data-ai-hint="QR code" src={paymentDetails.imepay.qrUrl} width={300} height={300} alt="IMEPay QR Code" className="object-contain" />
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <p>QR Code not available.</p>
                                <p className="text-xs">Admin needs to upload it.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
            
            <div className="grid w-full items-center gap-1.5 mt-4">
                <Label htmlFor="paymentScreenshot">Payment Screenshot</Label>
                <Input type="file" id="paymentScreenshot" name="paymentScreenshot" required accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                 {formState?.errors?.paymentScreenshot && <p className="text-xs text-destructive">{formState.errors.paymentScreenshot[0]}</p>}
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
                 <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Complete Booking'}
                </Button>
            </DialogFooter>
             {formState?.errors?.server && <p className="text-sm text-destructive text-center pt-2">{formState.errors.server[0]}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
