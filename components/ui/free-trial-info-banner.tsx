import { Clock, Shield, CreditCard, CheckCircle, Check, Gift } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert';
import React from 'react'

const FreeTrialInfoBanner = ({component}: {component: 'signup' | 'pricing'}) => {
  if (component === 'signup') {
    return (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
        <div className="space-y-1.5 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            <span><strong>7-day free trial</strong> OR <strong>3 proposals</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <span>Credit card required - <strong>no charge until trial ends</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            <span>Cancel anytime - <strong>completely free</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>Choose your plan after signup to begin</span>
          </div>
        </div>
      </div>
    )
  }
  if (component === 'pricing') {
    return (
        <Alert className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <Gift className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">
            <strong className="text-lg">Welcome! Start Your 7-Day Free Trial</strong>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                <span><strong>7-day free trial</strong> OR <strong>3 proposals</strong> (whichever comes first)</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <span>Credit card required to start - <strong>you won&apos;t be charged</strong> until trial ends</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>Cancel anytime before trial ends - <strong>no charge at all</strong></span>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium">
              👇 Choose a plan below to begin your free trial and start creating proposals!
            </p>
          </AlertDescription>
        </Alert>
    )
  }
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 max-w-3xl mx-auto">
        <h3 className="text-lg font-semibold text-emerald-900 text-center mb-4">🎉 Every Plan Starts with a Free Trial</h3>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
          <div className="flex items-center gap-2 text-emerald-800">
            <Clock className="h-5 w-5 text-emerald-600" />
            <span><strong>7-day</strong> free trial</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-800">
            <Check className="h-5 w-5 text-emerald-600" />
            <span><strong>3</strong> free proposals</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-800">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            <span>No charge until trial ends</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-800">
            <Shield className="h-5 w-5 text-emerald-600" />
            <span>Cancel anytime - free</span>
          </div>
        </div>
        <p className="text-sm text-emerald-700 text-center mt-3">
          Trial ends when 7 days pass or you&apos;ve used all 3 proposals (whichever comes first). <strong>You won&apos;t be charged if you cancel before trial ends.</strong>
        </p>
    </div>
  )
}

export default FreeTrialInfoBanner