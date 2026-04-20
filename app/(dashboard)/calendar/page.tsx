import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { PaymentsCalendar } from '@/components/calendar/payments-calendar'

export default function CalendarPage() {
  return (
    <div className="flex flex-col">
      <DashboardHeader title="Календарь выплат" />
      <div className="flex-1 p-4 md:p-6">
        <PaymentsCalendar />
      </div>
    </div>
  )
}
