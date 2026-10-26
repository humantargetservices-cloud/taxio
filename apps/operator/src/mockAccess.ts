export type DemoRole = 'driver' | 'dispatcher'
export type DemoStatus = 'approved' | 'pending' | 'suspended'
export type DemoIdentity = { id: string; label: string; role: DemoRole; status: DemoStatus; companyId: string }
export const demoIdentities: DemoIdentity[] = [
  { id: 'driver', label: 'Alex Driver', role: 'driver', status: 'approved', companyId: 'company-a' },
  { id: 'dispatcher', label: 'Sam Dispatcher', role: 'dispatcher', status: 'approved', companyId: 'company-a' },
  { id: 'pending', label: 'Pat Pending', role: 'driver', status: 'pending', companyId: 'company-a' },
  { id: 'suspended', label: 'Robin Suspended', role: 'driver', status: 'suspended', companyId: 'company-a' },
]
export function canOperate(identity: DemoIdentity, companyId: string) {
  return identity.status === 'approved' && identity.companyId === companyId
}
