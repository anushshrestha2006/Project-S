

import { getRideTemplates } from "@/lib/data";
import { RideTemplateTable } from "@/components/admin/RideTemplateTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function RideTemplatesSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="border rounded-lg">
                <div className="p-4 border-b">
                    <Skeleton className="h-5 w-1/4" />
                </div>
                <div className="p-4 space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </div>
        </div>
    )
}

async function RideSettings() {
    const templates = await getRideTemplates();
    return <RideTemplateTable templates={templates} />;
}

export default function RideManagementPage() {

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Ride Template Management</h1>
                <p className="text-muted-foreground">Manage the base templates used to automatically generate daily schedules.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Ride Templates</CardTitle>
                    <CardDescription>
                        Edit the vehicle number and timings for each ride template. These are the master copies for daily ride generation.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<RideTemplatesSkeleton />}>
                        <RideSettings />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
