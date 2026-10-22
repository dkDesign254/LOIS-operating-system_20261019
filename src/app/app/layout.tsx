import Link from 'next/link'
import { getCtx } from '@/lib/session'
import { Nav, type NavItem } from '@/components/nav'
import { Icon } from '@/components/icons'
import { signOut, switchWorkspace } from './actions'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCtx()

  const items: NavItem[] = ctx.ws
    ? [
        { href: '/app/control', label: 'Start here', icon: 'home' },
        { href: '/app', label: 'Ask LOIS', icon: 'chat' },
        { href: '/app/decisions', label: 'Decisions', icon: 'gov' },
        { href: '/app/memory', label: 'Memory', icon: 'note' },
        { href: '/app/arms', label: 'Business arms', icon: 'grid' },
        { href: '/app/automations', label: 'Automations', icon: 'flow' },
        { href: '/app/continuity', label: 'Data & backups', icon: 'archive' },
        { href: '/app/knowledge', label: 'Knowledge base', icon: 'book' },
        { href: '/app/bank', label: 'Knowledge bank', icon: 'shield' },
        { href: '/app/help', label: 'Get help', icon: 'lifebuoy' },
        { href: '/app/projects', label: 'Projects', icon: 'folder' },
        { href: '/app/sandbox', label: 'Sandbox', icon: 'flask' },
        { href: '/app/learn', label: 'Learn LOIS', icon: 'learn' },
        { href: '/app/rewards', label: 'Rewards', icon: 'trophy' },
        { href: '/app/integrations', label: 'Integrations', icon: 'plug' },
        { href: '/app/team', label: 'Team', icon: 'users' },
        { href: '/app/profile', label: 'Profile', icon: 'user' },
      ]
    : []

  return (
    <div className="shell">
      <aside className="side">
        <Link href="/app" className="brand">
          <i /> LOIS
        </Link>
        {ctx.workspaces.length > 0 && (
          <form action={switchWorkspace}>
            <label htmlFor="tenant" style={{ color: '#9fb0c8' }}>
              Workspace
            </label>
            <select id="tenant" name="tenant" defaultValue={ctx.ws?.tenant_id}>
              {ctx.workspaces.map((w) => (
                <option key={w.tenant_id} value={w.tenant_id}>
                  {w.name}
                </option>
              ))}
            </select>
            <button className="link small" style={{ marginTop: 4 }}>
              Switch
            </button>
          </form>
        )}
        <Nav items={items} />
        <div className="who">
          {ctx.ws && (
            <div>
              {ctx.ws.role} · {ctx.ws.plan} plan
            </div>
          )}
          <div style={{ wordBreak: 'break-all' }}>{ctx.user.email}</div>
          <form action={signOut}>
            <button className="link" style={{ paddingLeft: 0 }}>
              <span className="row" style={{ gap: 6 }}>
                <Icon name="logout" style={{ width: 16, height: 16 }} /> Sign out
              </span>
            </button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
