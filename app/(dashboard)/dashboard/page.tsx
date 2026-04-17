import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default function DashboardPage() {
  return (
    <div className="flex flex-col">
      <DashboardHeader title="Дашборд" />
      <DashboardContent />
    </div>
  )
}
