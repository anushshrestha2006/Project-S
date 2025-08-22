'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Search, MapPin } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

export function SearchForm() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const { toast } = useToast();

  const handleSearch = () => {
    // This is a placeholder for the actual search logic.
    // In a real app, you would use this information to filter rides.
    toast({
      title: 'Search Submitted',
      description: `Searching for rides from ${from || 'any'} to ${to || 'any'} on ${date ? format(date, 'PPP') : 'any date'}.`,
    });
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
        <div className="relative">
             <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
             <Input
                placeholder="From"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="pl-10"
            />
        </div>
       <div className="relative">
             <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                placeholder="To"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="pl-10"
            />
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
          />
        </PopoverContent>
      </Popover>
      <Button onClick={handleSearch} className="lg:col-start-4">
        <Search className="mr-2 h-4 w-4" /> Search
      </Button>
    </div>
  );
}
