import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { Database } from '@/types/database'

type PricingSettings = Database['public']['Tables']['pricing_settings']['Row']
type PricingSettingsInsert = Database['public']['Tables']['pricing_settings']['Insert']
type PricingSettingsUpdate = Database['public']['Tables']['pricing_settings']['Update']

// Validation schema for pricing settings
const pricingSettingsSchema = z.object({
  labor_rate: z.number().min(0),
  overhead_percentage: z.number().min(0).max(100),
  margin_percentage: z.number().min(0).max(100),
  production_rates: z.record(z.any()).optional(),
  frequency_multipliers: z.record(z.any()).optional(),
  service_type_rates: z.record(z.any()).optional()
})

// GET /api/pricing-settings - Get pricing settings for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: settings, error } = await supabase
      .from('pricing_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, create default settings
        const defaultSettings: PricingSettingsInsert = {
          user_id: user.id,
          labor_rate: 25,
          overhead_percentage: 15,
          margin_percentage: 20,
          production_rates: {
            residential: 1000,
            commercial: 800,
            carpet: 1200,
            window: 500,
            floor: 900
          },
          frequency_multipliers: {
            'one-time': 1.0,
            'weekly': 0.9,
            'bi-weekly': 0.95,
            'monthly': 1.0,
            'quarterly': 1.1
          },
          service_type_rates: {
            residential: 0.15,
            commercial: 0.20,
            carpet: 0.12,
            window: 0.25,
            floor: 0.18
          }
        }

        const { data: newSettings, error: createError } = await supabase
          .from('pricing_settings')
          .insert(defaultSettings)
          .select()
          .single()

        if (createError) {
          console.error('Error creating default pricing settings:', createError)
          return NextResponse.json(
            { error: 'Failed to create default pricing settings' },
            { status: 500 }
          )
        }

        return NextResponse.json({ settings: newSettings })
      }
      
      console.error('Error fetching pricing settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pricing settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error in GET /api/pricing-settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/pricing-settings - Update pricing settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate the request body
    const validationResult = pricingSettingsSchema.partial().safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    const supabase = await createClient()
    
    // Update the pricing settings
    const settingsUpdate: PricingSettingsUpdate = {
      ...updateData,
      updated_at: new Date().toISOString()
    }

    const { data: settings, error } = await supabase
      .from('pricing_settings')
      .update(settingsUpdate)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating pricing settings:', error)
      return NextResponse.json(
        { error: 'Failed to update pricing settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error in PUT /api/pricing-settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/pricing-settings/reset - Reset to default settings
export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    const defaultSettings: PricingSettingsUpdate = {
      labor_rate: 25,
      overhead_percentage: 15,
      margin_percentage: 20,
      production_rates: {
        residential: 1000,
        commercial: 800,
        carpet: 1200,
        window: 500,
        floor: 900
      },
      frequency_multipliers: {
        'one-time': 1.0,
        'weekly': 0.9,
        'bi-weekly': 0.95,
        'monthly': 1.0,
        'quarterly': 1.1
      },
      service_type_rates: {
        residential: 0.15,
        commercial: 0.20,
        carpet: 0.12,
        window: 0.25,
        floor: 0.18
      },
      updated_at: new Date().toISOString()
    }

    const { data: settings, error } = await supabase
      .from('pricing_settings')
      .update(defaultSettings)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error resetting pricing settings:', error)
      return NextResponse.json(
        { error: 'Failed to reset pricing settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error in POST /api/pricing-settings/reset:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}