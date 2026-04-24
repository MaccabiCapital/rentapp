// ============================================================
// Starter room/item checklist for new inspections
// ============================================================
//
// When a new inspection is created we seed this default list of
// rooms + items so the landlord lands on a pre-populated walk-
// through instead of a blank page. Items can be added, renamed,
// or deleted on the inspection detail page.
//
// Ordering is preserved via sort_order on inspection_items.
// The list is grouped semantically: common areas → kitchen →
// bathrooms → bedrooms → exterior → utilities.

export type StarterItem = { room: string; item: string }

export const STARTER_CHECKLIST: StarterItem[] = [
  // Entry / common areas
  { room: 'Entry', item: 'Front door + locks' },
  { room: 'Entry', item: 'Doorbell / intercom' },
  { room: 'Entry', item: 'Floor / flooring' },

  // Living room
  { room: 'Living Room', item: 'Walls + paint' },
  { room: 'Living Room', item: 'Ceiling' },
  { room: 'Living Room', item: 'Flooring / carpet' },
  { room: 'Living Room', item: 'Windows + screens' },
  { room: 'Living Room', item: 'Blinds / curtains' },
  { room: 'Living Room', item: 'Light fixtures + switches' },
  { room: 'Living Room', item: 'Outlets' },
  { room: 'Living Room', item: 'HVAC vents / thermostat' },

  // Kitchen
  { room: 'Kitchen', item: 'Refrigerator' },
  { room: 'Kitchen', item: 'Stove / oven / range hood' },
  { room: 'Kitchen', item: 'Dishwasher' },
  { room: 'Kitchen', item: 'Microwave' },
  { room: 'Kitchen', item: 'Sink + faucet' },
  { room: 'Kitchen', item: 'Garbage disposal' },
  { room: 'Kitchen', item: 'Cabinets + drawers' },
  { room: 'Kitchen', item: 'Countertops' },
  { room: 'Kitchen', item: 'Backsplash' },
  { room: 'Kitchen', item: 'Flooring' },
  { room: 'Kitchen', item: 'Walls + paint' },
  { room: 'Kitchen', item: 'Ceiling' },
  { room: 'Kitchen', item: 'Light fixtures + outlets' },

  // Bathroom
  { room: 'Bathroom', item: 'Toilet' },
  { room: 'Bathroom', item: 'Sink + faucet + vanity' },
  { room: 'Bathroom', item: 'Shower / tub + enclosure' },
  { room: 'Bathroom', item: 'Tile / grout' },
  { room: 'Bathroom', item: 'Mirror / medicine cabinet' },
  { room: 'Bathroom', item: 'Exhaust fan' },
  { room: 'Bathroom', item: 'Flooring' },
  { room: 'Bathroom', item: 'Walls + paint' },

  // Bedroom
  { room: 'Bedroom', item: 'Walls + paint' },
  { room: 'Bedroom', item: 'Ceiling' },
  { room: 'Bedroom', item: 'Flooring / carpet' },
  { room: 'Bedroom', item: 'Windows + screens' },
  { room: 'Bedroom', item: 'Closet + shelving + doors' },
  { room: 'Bedroom', item: 'Light fixtures + switches' },
  { room: 'Bedroom', item: 'Outlets' },

  // Utility
  { room: 'Utility', item: 'Water heater' },
  { room: 'Utility', item: 'Furnace / HVAC unit' },
  { room: 'Utility', item: 'Washer hookup / washer' },
  { room: 'Utility', item: 'Dryer hookup / dryer' },
  { room: 'Utility', item: 'Circuit breaker panel' },
  { room: 'Utility', item: 'Smoke + CO detectors' },

  // Exterior
  { room: 'Exterior', item: 'Front yard / landscaping' },
  { room: 'Exterior', item: 'Back yard / deck / patio' },
  { room: 'Exterior', item: 'Siding / exterior paint' },
  { room: 'Exterior', item: 'Roof (visible from ground)' },
  { room: 'Exterior', item: 'Gutters + downspouts' },
  { room: 'Exterior', item: 'Driveway / walkway' },
  { room: 'Exterior', item: 'Garage / carport' },
  { room: 'Exterior', item: 'Mailbox / house number' },
]
