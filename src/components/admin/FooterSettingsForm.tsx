
'use client';

import { useActionState, useRef, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import type { FooterSettings } from '@/lib/types';
import { updateFooterSettings } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                </>
            ) : (
                <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                </>
            )}
        </Button>
    )
}

export function FooterSettingsForm({ currentSettings }: { currentSettings: FooterSettings }) {
    const initialState = { success: false, message: '', errors: {} };
    const [state, formAction] = useActionState(updateFooterSettings, initialState);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (!state.message) return;

        if (state.success) {
            toast({
                title: 'Success!',
                description: state.message,
            });
        } else {
             toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: state.message,
            });
        }
    }, [state, toast]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Footer Content</CardTitle>
                <CardDescription>Update the contact numbers and social media links that appear in the site footer.</CardDescription>
            </CardHeader>
            <CardContent>
                <form ref={formRef} action={formAction} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="customerServicePhone">Customer Service Phone</Label>
                        <Input 
                            id="customerServicePhone"
                            name="customerServicePhone"
                            defaultValue={currentSettings.customerServicePhone}
                        />
                        {state?.errors?.customerServicePhone && <p className="text-xs text-destructive">{state.errors.customerServicePhone[0]}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                        <Input 
                            id="whatsappNumber"
                            name="whatsappNumber"
                            defaultValue={currentSettings.whatsappNumber}
                        />
                         {state?.errors?.whatsappNumber && <p className="text-xs text-destructive">{state.errors.whatsappNumber[0]}</p>}
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="facebookUrl">Facebook URL</Label>
                        <Input 
                            id="facebookUrl"
                            name="facebookUrl"
                            defaultValue={currentSettings.facebookUrl}
                            type="url"
                        />
                         {state?.errors?.facebookUrl && <p className="text-xs text-destructive">{state.errors.facebookUrl[0]}</p>}
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="instagramUrl">Instagram URL</Label>
                        <Input 
                            id="instagramUrl"
                            name="instagramUrl"
                            defaultValue={currentSettings.instagramUrl}
                             type="url"
                        />
                         {state?.errors?.instagramUrl && <p className="text-xs text-destructive">{state.errors.instagramUrl[0]}</p>}
                    </div>

                    <div className="flex justify-end">
                        <SubmitButton />
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
