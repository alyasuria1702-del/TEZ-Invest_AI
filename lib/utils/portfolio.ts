import type { PositionWithInstrument, PositionMetrics, PortfolioMetrics, InstrumentType } from '@/lib/types/database'

export function calculatePositionMetrics(
  position: PositionWithInstrument,
  totalPortfolioValue: number
): PositionMetrics {
  const { instrument } = position
  const currentPrice = instrument.last_price || position.average_buy_price
  
  const currentValue = currentPrice * position.quantity
  const purchaseValue = position.average_buy_price * position.quantity
  const profitLoss = currentValue - purchaseValue
  const profitLossPercent = purchaseValue > 0 ? (profitLoss / purchaseValue) * 100 : 0
  const weight = totalPortfolioValue > 0 ? (currentValue / totalPortfolioValue) * 100 : 0

  return {
    position,
    currentValue,
    purchaseValue,
    profitLoss,
    profitLossPercent,
    weight,
  }
}

export function calculatePortfolioMetrics(positions: PositionWithInstrument[]): PortfolioMetrics {
  if (positions.length === 0) {
    return {
      totalValue: 0,
      totalPurchaseValue: 0,
      totalProfitLoss: 0,
      totalProfitLossPercent: 0,
      positions: [],
      assetAllocation: [],
    }
  }

  // Calculate total current value first for weight calculations
  let totalValue = 0
  let totalPurchaseValue = 0

  positions.forEach(position => {
    const currentPrice = position.instrument.last_price || position.average_buy_price
    totalValue += currentPrice * position.quantity
    totalPurchaseValue += position.average_buy_price * position.quantity
  })

  // Calculate individual position metrics
  const positionMetrics = positions.map(position => 
    calculatePositionMetrics(position, totalValue)
  )

  // Calculate P&L
  const totalProfitLoss = totalValue - totalPurchaseValue
  const totalProfitLossPercent = totalPurchaseValue > 0 
    ? (totalProfitLoss / totalPurchaseValue) * 100 
    : 0

  // Calculate asset allocation
  const allocationMap = new Map<InstrumentType, number>()
  
  positionMetrics.forEach(pm => {
    const type = pm.position.instrument.instrument_type
    const current = allocationMap.get(type) || 0
    allocationMap.set(type, current + pm.currentValue)
  })

  const assetAllocation = Array.from(allocationMap.entries()).map(([type, value]) => ({
    type,
    value,
    percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
  }))

  // Sort by value descending
  assetAllocation.sort((a, b) => b.value - a.value)

  return {
    totalValue,
    totalPurchaseValue,
    totalProfitLoss,
    totalProfitLossPercent,
    positions: positionMetrics,
    assetAllocation,
  }
}

export function calculateExpectedPayments(
  positions: PositionWithInstrument[],
  days: number = 365
): { coupon: number; dividend: number } {
  let coupon = 0
  let dividend = 0

  positions.forEach(position => {
    const { instrument } = position
    
    if (instrument.instrument_type === 'bond' && instrument.coupon_value) {
      // Assuming semi-annual coupons, calculate pro-rata
      const annualCoupon = instrument.coupon_value * 2
      coupon += (annualCoupon * position.quantity * days) / 365
    }
    
    // Dividends would need historical data, skipping for MVP
  })

  return { coupon, dividend }
}
