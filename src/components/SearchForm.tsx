'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, Search } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';

export function SearchForm() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const handleSearch = useDebouncedCallback((params: Record<string, string | undefined>) => {
        const urlParams = new URLSearchParams(searchParams);
        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                urlParams.set(key, value);
            } else {
                urlParams.delete(key);
            }
        })
        replace(`${pathname}?${urlParams.toString()}`);
    }, 300);

    const fromValue = searchParams.get('from') || '';
    const toValue = searchParams.get('to') || '';
    const dateValue = searchParams.get('date') ? new Date(searchParams.get('date') as string) : undefined;


    return (
        <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 md:grid-cols-4 items-end gap-4">
             <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="from">From</Label>
                <Select name="from" value={fromValue} onValueChange={(value) => handleSearch({ from: value })}>
                    <SelectTrigger id="from">
                        <SelectValue placeholder="Select origin" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="Birgunj">Birgunj</SelectItem>
                        <SelectItem value="Kathmandu">Kathmandu</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="to">To</Label>
                <Select name="to" value={toValue} onValueChange={(value) => handleSearch({ to: value })}>
                    <SelectTrigger id="to">
                        <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                         <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="Birgunj">Birgunj</SelectItem>
                        <SelectItem value="Kathmandu">Kathmandu</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="date">Date</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateValue && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateValue ? format(dateValue, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={dateValue}
                        onSelect={(date) => handleSearch({ date: date ? format(date, 'yyyy-MM-dd') : undefined })}
                        disabled={{ before: new Date() }}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
            </div>
            
             <Button type="button" onClick={() => replace(pathname)} variant="outline" className="md:w-auto">
                Clear
            </Button>
        </form>
    );
}
