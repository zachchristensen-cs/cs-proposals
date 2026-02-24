import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center border-b px-4 lg:hidden">
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="-ml-2">
        <Menu className="size-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>
      <h1 className="mx-auto font-serif text-lg tracking-tight">Cambridge Studio</h1>
      {/* Spacer to keep title centered */}
      <div className="w-9" />
    </header>
  )
}
