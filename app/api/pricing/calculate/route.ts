import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { createPricingEngine, type PricingCalculationInput } from '@/lib/pricing-engine'
import { z } from 'zod'
import { serviceTypeSchema, serviceFrequencySchema } from '@/lib/validations/proposal'

// Validation schema for pricing calculation request
const pricingCalculationSchema = z.object({
  serviceType: serviceTypeSchema,
  facilitySize: z.number().min(1),
  serviceFrequency: serviceFrequencySchema,
  serviceSpecificData: z.record(z.any()).optional(),
  globalInputs: z.record(z.any()).optional(),
  adjustments: z.record(z.number()).optional()
})

// POST /api/pricing/calculate - Calculate pricing for a proposal
export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate the request body
    const validationResult = pricingCalculationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const calculationInput = validationResult.data

    const supabase = await createClient()
    
    // Get user's pricing settings
    const { data: settings, error: settingsError } = await supabase
      .from('pricing_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (settingsError) {
      console.error('Error fetching pricing settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch pricing settings' },
        { status: 500 }
      )
    }

    // Create pricing engine instance
    const pricingEngine = createPricingEngine(settings)
    
    // Prepare calculation input
    const input: PricingCalculationInput = {
      serviceType: calculationInput.serviceType,
      facilitySize: calculationInput.facilitySize,
      serviceFrequency: calculationInput.serviceFrequency,
      serviceSpecificData: calculationInput.serviceSpecificData || {},
      globalInputs: calculationInput.globalInputs || {}
    }

    // Calculate pricing
    const pricingBreakdown = pricingEngine.calculatePricing(input)

    return NextResponse.json({ 
      pricing: pricingBreakdown,
      input: calculationInput
    })
  } catch (error) {
    console.error('Error in POST /api/pricing/calculate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/pricing/calculate - Get a quick estimate (for testing/preview)
export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const serviceType = searchParams.get('serviceType') as any
    const facilitySize = parseFloat(searchParams.get('facilitySize') || '1000')
    const serviceFrequency = searchParams.get('serviceFrequency') as any

    if (!serviceType || !serviceFrequency) {
      return NextResponse.json(
        { error: 'Missing required parameters: serviceType, serviceFrequency' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get user's pricing settings
    const { data: settings, error: settingsError } = await supabase
      .from('pricing_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (settingsError) {
      console.error('Error fetching pricing settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch pricing settings' },
        { status: 500 }
      )
    }

    // Create pricing engine instance
    const pricingEngine = createPricingEngine(settings)
    
    // Calculate basic pricing estimate using utility function
    const estimate = pricingEngine.getQuickEstimate(
      serviceType,
      facilitySize,
      serviceFrequency
    )

    return NextResponse.json({ 
      estimate,
      input: {
        serviceType,
        facilitySize,
        serviceFrequency
      }
    })
  } catch (error) {
    console.error('Error in GET /api/pricing/calculate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}