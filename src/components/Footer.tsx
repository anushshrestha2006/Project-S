
import Link from 'next/link';
import { Phone, MessageCircle, Facebook, Instagram } from 'lucide-react';
import { Button } from './ui/button';
import { getFooterSettings } from '@/lib/data';

export default async function Footer() {
  const settings = await getFooterSettings();

  return (
    <footer className="bg-muted text-muted-foreground border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 font-headline">Bryzoo</h3>
            <p className="text-sm">
              Your reliable partner for travel between Birgunj and Kathmandu. Book your ride with ease and comfort.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 font-headline">Contact Us</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-center md:justify-start">
                <Phone className="w-4 h-4 mr-2 text-primary" />
                <span>Customer Service: {settings.customerServicePhone}</span>
              </li>
              <li className="flex items-center justify-center md:justify-start">
                <MessageCircle className="w-4 h-4 mr-2 text-primary" />
                <span>WhatsApp: {settings.whatsappNumber}</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 font-headline">Follow Us</h3>
            <div className="flex justify-center md:justify-start space-x-4">
              <Button asChild variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                <Link href={settings.facebookUrl} target="_blank" aria-label="Facebook">
                  <Facebook className="w-6 h-6" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                <Link href={settings.instagramUrl} target="_blank" aria-label="Instagram">
                  <Instagram className="w-6 h-6" />
                </Link>
              </Button>
            </div>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-border/50 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Bryzoo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
