import { Bot } from 'lucide-react';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-sidebar-primary hover:text-sidebar-primary/90 transition-colors">
      <Bot className="h-7 w-7" />
      <span>PersonaSim</span>
    </Link>
  );
}
