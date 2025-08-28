

'use client';

import { useState } from 'react';
import type { RideTemplate } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, Edit, Hash } from 'lucide-react';
import { Badge } from '../ui/badge';
import { RideTemplateForm } from './RideTemplateForm';

export function RideTemplateTable({ templates: initialTemplates }: { templates: RideTemplate[] }) {
    const [templates, setTemplates] = useState(initialTemplates);
    const [selectedTemplate, setSelectedTemplate] = useState<RideTemplate | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const handleEdit = (template: RideTemplate) => {
        setSelectedTemplate(template);
        setIsSheetOpen(true);
    };

    const handleTemplateUpdate = (updatedTemplate: RideTemplate) => {
        setTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Route</TableHead>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Timings</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.length > 0 ? (
                        templates.map(template => (
                            <TableRow key={template.id}>
                                <TableCell>
                                    <div className="font-medium flex items-center">
                                        {template.from} <ArrowRight className="mx-2 h-4 w-4" /> {template.to}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Price: NPR {template.price}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{template.vehicleType}</Badge>
                                    <div className="flex items-center text-sm text-muted-foreground mt-1 gap-1 font-mono">
                                        <Hash className="h-3 w-3" />
                                        {template.vehicleNumber}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center text-sm gap-2">
                                        <Clock className="h-4 w-4 text-primary" />
                                        {template.departureTime} - {template.arrivalTime}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                      ) : (
                         <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    You do not own any ride templates.
                                </TableCell>
                            </TableRow>
                      )}
                    </TableBody>
                </Table>
            </div>
            {selectedTemplate && (
                <RideTemplateForm 
                    template={selectedTemplate}
                    isOpen={isSheetOpen}
                    setIsOpen={setIsSheetOpen}
                    onSuccess={handleTemplateUpdate}
                />
            )}
        </>
    );
}
