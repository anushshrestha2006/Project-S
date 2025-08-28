
'use client';

import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, ArrowLeftRight, Search } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { format, addDays, isEqual, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';

export function SearchForm() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const [fromValue, setFromValue] = useState(searchParams.get('from') || '');
    const [toValue, setToValue] = useState(searchParams.get('to') || '');
    const [dateValue, setDateValue] = useState(searchParams.get('date') ? new Date(searchParams.get('date') as string) : undefined);
    
    const handleSwap = () => {
        setFromValue(toValue);
        setToValue(fromValue);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams);
        if (fromValue && fromValue !== 'all') {
            params.set('from', fromValue);
        } else {
            params.delete('from');
        }
        if (toValue && toValue !== 'all') {
            params.set('to', toValue);
        } else {
            params.delete('to');
        }
        if (dateValue) {
            params.set('date', format(dateValue, 'yyyy-MM-dd'));
        } else {
            params.delete('date');
        }
        replace(`${pathname}?${params.toString()}`);
    };

    const handleDateSelect = (date: Date | undefined) => {
        setDateValue(date);
    };

    const today = startOfDay(new Date());
    const nextFiveDays = Array.from({ length: 5 }, (_, i) => addDays(today, i));

    const selectedDate = dateValue ? startOfDay(dateValue) : undefined;
    
    return (
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
             <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="from">From</Label>
                <Select name="from" value={fromValue} onValueChange={setFromValue}>
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
            
            <div className="flex items-center justify-center my-[-8px]">
                 <Button variant="ghost" size="icon" type="button" onClick={handleSwap} className="mx-auto" aria-label="Swap origin and destination">
                    <ArrowLeftRight className="h-5 w-5 text-primary rotate-90" />
                </Button>
            </div>

            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="to">To</Label>
                <Select name="to" value={toValue} onValueChange={setToValue}>
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
                <div className="grid grid-cols-6 gap-2">
                    {nextFiveDays.map(day => (
                        <Button
                            key={day.toString()}
                            type="button"
                            variant={selectedDate && isEqual(day, selectedDate) ? 'default' : 'outline'}
                            onClick={() => handleDateSelect(day)}
                            className="flex flex-col h-16 flex-1 text-base p-1"
                        >
                            <span className="font-bold text-lg">{format(day, 'dd')}</span>
                            <span className="text-xs">{format(day, 'EEE')}</span>
                        </Button>
                    ))}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-16 w-full"
                                aria-label="Open calendar"
                            >
                                <CalendarIcon />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleDateSelect}
                                disabled={{ before: new Date() }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <Button type="submit" className="w-full text-lg py-6 mt-2">
                 <Search className="mr-2 h-5 w-5" />
                Search
            </Button>
        </form>
    );
}
