'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/icons'

export type NavItem = { href: string; label: string; icon: IconName }

export function Nav({ items }: { items: NavItem[] }) {
  const path = usePathname()
  return (
    <nav className="nav" aria-label="Main">
      {items.map((i) => {
        const active = i.href === '/app' ? path === '/app' : path.startsWith(i.href)
        return (
          <Link key={i.href} href={i.href} aria-current={active ? 'page' : undefined}>
            <Icon name={i.icon} />
            <span>{i.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
