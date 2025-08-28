

'use client';

import { useState, useTransition } from 'react';
import type { RideTemplate } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, Edit, Hash, PlusCircle, Trash2, Loader2, Users, User, Car } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { VehicleTemplateForm } from './VehicleTemplateForm';
import { deleteRideTemplate } from '@/lib/actions';

function DeleteTemplateButton({ template, onConfirm, isPending }: { template: RideTemplate, onConfirm: (templateId: string) => void, isPending: boolean }) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                 <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-red-50" disabled={isPending}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this vehicle template?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently remove the template for the {template.vehicleType} ({template.vehicleNumber}). This action cannot be undone and may affect future ride generation.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onConfirm(template.id)} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Yes, delete template
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export function VehicleTemplateTable({ 
    initialTemplates,
}: { 
    initialTemplates: RideTemplate[],
 }) {
    const [templates, setTemplates] = useState(initialTemplates);
    const [selectedTemplate, setSelectedTemplate] = useState<RideTemplate | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleEdit = (template: RideTemplate) => {
        setSelectedTemplate(template);
        setIsSheetOpen(true);
    };
    
    const handleAdd = () => {
        setSelectedTemplate(null);
        setIsSheetOpen(true);
    };

    const handleDelete = (templateId: string) => {
        startTransition(async () => {
            const result = await deleteRideTemplate(templateId);
            if (result.success) {
                toast({ title: "Success", description: "Vehicle template has been deleted." });
                setTemplates(prev => prev.filter(t => t.id !== templateId));
            } else {
                toast({ variant: "destructive", title: "Error", description: result.message });
            }
        })
    }

    const handleSuccess = (savedTemplate: RideTemplate) => {
        if (selectedTemplate) { // Edit
            setTemplates(prev => prev.map(t => t.id === savedTemplate.id ? savedTemplate : t));
        } else { // Create
            setTemplates(prev => [...prev, savedTemplate]);
        }
    }

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button onClick={handleAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Vehicle
                </Button>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {templates.length > 0 ? templates.map(template => (
                            <TableRow key={template.id}>
                                <TableCell>
                                    <div className='flex items-center gap-2'>
                                        <Car className="h-4 w-4 text-primary" />
                                        <Badge variant="secondary">{template.vehicleType}</Badge>
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground mt-1 gap-1 font-mono">
                                        <Hash className="h-3 w-3" />
                                        {template.vehicleNumber}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium flex items-center">
                                        {template.from} <ArrowRight className="mx-2 h-4 w-4" /> {template.to}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Price: NPR {template.price}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center text-sm font-medium gap-2">
                                        <Clock className="h-4 w-4" />
                                        {template.departureTime}
                                    </div>
                                     <div className="text-xs text-muted-foreground ml-6">Arrival: {template.arrivalTime}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        {template.ownerName}
                                    </div>
                                    <div className="text-sm text-muted-foreground">{template.ownerEmail}</div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </Button>
                                     <DeleteTemplateButton template={template} onConfirm={handleDelete} isPending={isPending} />
                                </TableCell>
                            </TableRow>
                        )) : (
                             <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No vehicle templates found. Add one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <VehicleTemplateForm 
                template={selectedTemplate}
                isOpen={isSheetOpen}
                setIsOpen={setIsSheetOpen}
                onSuccess={handleSuccess}
            />
        </>
    );
}
