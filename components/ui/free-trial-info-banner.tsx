import { Clock, Shield, CheckCircle, Check, Gift, FileText } from 'lucide-react'
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
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span><strong>No credit card required</strong> to start</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            <span>Generate and view proposals <strong>instantly</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            <span>Upgrade anytime to send &amp; download</span>
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
            <strong className="text-lg">Subscribe to Unlock All Features</strong>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Unlimited proposals</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Send proposals to clients via email</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Download proposals as PDF</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
    )
  }
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 max-w-3xl mx-auto">
        <h3 className="text-lg font-semibold text-emerald-900 text-center mb-4">Start Creating Proposals for Free</h3>
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
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <span>No credit card needed</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-800">
            <Shield className="h-5 w-5 text-emerald-600" />
            <span>Upgrade to unlock all features</span>
          </div>
        </div>
        <p className="text-sm text-emerald-700 text-center mt-3">
          Sign up and start generating proposals immediately. Subscribe to send and download.
        </p>
    </div>
  )
}

export default FreeTrialInfoBanner
