
import { getPaymentDetails } from "@/lib/data";
import { QrUploadForm } from "@/components/admin/QrUploadForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaymentMethod } from "@/lib/types";

async function QrSettings() {
    const paymentDetails = await getPaymentDetails();
    
    return (
         <Tabs defaultValue="esewa" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="esewa">eSewa</TabsTrigger>
                <TabsTrigger value="khalti">Khalti</TabsTrigger>
                <TabsTrigger value="imepay">IMEPay</TabsTrigger>
            </TabsList>
            <TabsContent value="esewa">
                <QrUploadForm paymentMethod="esewa" currentQrUrl={paymentDetails.esewa.qrUrl} />
            </TabsContent>
            <TabsContent value="khalti">
                <QrUploadForm paymentMethod="khalti" currentQrUrl={paymentDetails.khalti.qrUrl} />
            </TabsContent>
            <TabsContent value="imepay">
                <QrUploadForm paymentMethod="imepay" currentQrUrl={paymentDetails.imepay.qrUrl} />
            </TabsContent>
        </Tabs>
    )
}

function SettingsSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="border rounded-lg p-6">
                <div className="flex flex-col items-center gap-4">
                    <Skeleton className="h-48 w-48" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
        </div>
    )
}

export default function SettingsPage() {

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Payment Settings</h1>
                <p className="text-muted-foreground">Manage QR codes for payment methods.</p>
            </div>

            <Card className="max-w-lg mx-auto">
                <CardHeader>
                    <CardTitle>QR Code Management</CardTitle>
                    <CardDescription>Upload a new QR code image for each payment provider. The new QR will be shown to users immediately.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<SettingsSkeleton />}>
                        <QrSettings />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
