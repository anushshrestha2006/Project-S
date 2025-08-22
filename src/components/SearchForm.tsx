'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Search, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SearchForm() {
  const router = useRouter();
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  const [date, setDate] = useState<Date | undefined>();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (date) params.append('date', format(date, 'yyyy-MM-dd'));
    
    router.push(`/?${params.toString()}`);
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="relative md:col-span-1">
             <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
             <Select onValueChange={setFrom} value={from}>
                <SelectTrigger className="pl-10">
                    <SelectValue placeholder="From" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Birgunj">Birgunj</SelectItem>
                    <SelectItem value="Kathmandu">Kathmandu</SelectItem>
                </SelectContent>
            </Select>
        </div>
       <div className="relative md:col-span-1">
             <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
            <Select onValueChange={setTo} value={to}>
                <SelectTrigger className="pl-10">
                    <SelectValue placeholder="To" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Birgunj">Birgunj</SelectItem>
                    <SelectItem value="Kathmandu">Kathmandu</SelectItem>
                </SelectContent>
            </Select>
       </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={'outline'}
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'PPP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
          />
        </PopoverContent>
      </Popover>
      <Button onClick={handleSearch}>
        <Search className="mr-2 h-4 w-4" /> Search
      </Button>
    </div>
  );
}
