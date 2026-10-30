'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireWorkspace } from '@/lib/session'

const PROVIDERS = ['make', 'n8n', 'zapier', 'langchain', 'odoo', 'zoho', 'custom']
const clean = (e: unknown) => (e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Something went wrong')

export async function addConnector(fd: FormData) {
  const ctx = await requireWorkspace()
  const provider = String(fd.get('provider') ?? ''); const method = fd.get('method') === 'api' ? 'api' : 'webhook'
  if (!PROVIDERS.includes(provider)) redirect('/app/connectors?error=' + encodeURIComponent('Choose a provider.'))
  const { error } = await ctx.sb.rpc('lois_connector_save', { p_tenant: ctx.ws.tenant_id, p_provider: provider, p_method: method, p_label: String(fd.get('label') ?? '').trim().slice(0, 80), p_endpoint: String(fd.get('endpoint') ?? '').trim().slice(0, 500) })
  if (error) redirect('/app/connectors?error=' + encodeURIComponent(clean(error)))
  revalidatePath('/app/connectors'); redirect('/app/connectors?done=added')
}

export async function switchConnector(fd: FormData) {
  const ctx = await requireWorkspace()
  const on = fd.get('on') === '1'
  const { error } = await ctx.sb.rpc('lois_connector_switch', { p_connector: String(fd.get('id') ?? ''), p_on: on, p_reason: String(fd.get('reason') ?? '').trim().slice(0, 300) })
  if (error) redirect('/app/connectors?error=' + encodeURIComponent(clean(error)))
  revalidatePath('/app/connectors'); redirect('/app/connectors?done=' + (on ? 'on' : 'off'))
}
