

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bus, User as UserIcon, LogOut, LogIn, UserPlus, LayoutDashboard, Ticket, Users, Settings, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getUserProfile } from '@/lib/data';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        if (profile) {
            setUser(profile);
            localStorage.setItem('sumo-sewa-user', JSON.stringify(profile));
        } else {
             // This might happen if Firestore data isn't created yet
             // We create a temporary user object until profile is fetched
             const tempUser: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || "User",
                email: firebaseUser.email || "",
                role: 'user'
             }
             setUser(tempUser);
             localStorage.setItem('sumo-sewa-user', JSON.stringify(tempUser));
        }
      } else {
        setUser(null);
        localStorage.removeItem('sumo-sewa-user');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
        await signOut(auth);
        router.push('/');
        router.refresh();
    } catch (error) {
        console.error("Error signing out: ", error);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="flex items-center space-x-2 mr-6">
          <Bus className="h-6 w-6 text-primary" />
          <span className="font-bold font-headline text-lg">Sumo Sewa</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border-2 border-primary/50">
                       {user.photoURL && <AvatarImage src={user.photoURL} alt={user.name} />}
                       <AvatarFallback className="bg-primary/20 text-primary font-bold">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                   <Link href="/my-bookings">
                      <DropdownMenuItem>
                          <Ticket className="mr-2 h-4 w-4" />
                          My Bookings
                      </DropdownMenuItem>
                  </Link>
                    <Link href="/profile">
                        <DropdownMenuItem>
                            <UserIcon className="mr-2 h-4 w-4" />
                            Profile
                        </DropdownMenuItem>
                    </Link>
                  {user.role === 'admin' && (
                    <>
                     <Link href="/admin">
                        <DropdownMenuItem>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Booking Panel
                        </DropdownMenuItem>
                      </Link>
                       {user.email === 'anushshrestha8683@gmail.com' && (
                          <>
                            <Link href="/admin/users">
                              <DropdownMenuItem>
                                  <Users className="mr-2 h-4 w-4" />
                                  User Management
                              </DropdownMenuItem>
                            </Link>
                             <Link href="/admin/settings">
                              <DropdownMenuItem>
                                  <Settings className="mr-2 h-4 w-4" />
                                  Payment Settings
                              </DropdownMenuItem>
                            </Link>
                             <Link href="/admin/site-settings">
                              <DropdownMenuItem>
                                  <Wrench className="mr-2 h-4 w-4" />
                                  Site Settings
                              </DropdownMenuItem>
                            </Link>
                          </>
                       )}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                </Link>
                 <Link href="/signup">
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
