'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Wand2, FileText } from 'lucide-react'

interface ProposalForm {
  title: string
  client_name: string
  client_email: string
  project_description: string
  budget_range: string
  timeline: string
  company_name: string
  services_offered: string
}

export default function NewProposalPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [form, setForm] = useState<ProposalForm>({
    title: '',
    client_name: '',
    client_email: '',
    project_description: '',
    budget_range: '',
    timeline: '',
    company_name: '',
    services_offered: ''
  })
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const generateProposalContent = async () => {
    if (!form.project_description || !form.client_name) {
      setError('Please fill in at least the client name and project description to generate content.')
      return
    }

    setGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_name: form.client_name,
          project_description: form.project_description,
          budget_range: form.budget_range,
          timeline: form.timeline,
          company_name: form.company_name,
          services_offered: form.services_offered
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate proposal content')
      }

      const data = await response.json()
      setGeneratedContent(data.content)
    } catch (error) {
      console.error('Error generating content:', error)
      setError('Failed to generate proposal content. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setError('You must be logged in to create a proposal.')
      return
    }

    if (!form.title || !form.client_name || !form.project_description) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      
      const { data, error: insertError } = await supabase
        .from('proposals')
        .insert({
          user_id: user.id,
          title: form.title,
          client_name: form.client_name,
          client_email: form.client_email,
          project_description: form.project_description,
          budget_range: form.budget_range,
          timeline: form.timeline,
          company_name: form.company_name,
          services_offered: form.services_offered,
          content: generatedContent,
          status: 'draft',
          value: parseFloat(form.budget_range.replace(/[^0-9.-]+/g, '')) || 0
        })
        .select()
        .single()

      if (insertError) throw insertError

      router.push(`/dashboard/proposals/${data.id}`)
    } catch (error) {
      console.error('Error creating proposal:', error)
      setError('Failed to create proposal. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Proposal</h1>
        <p className="mt-2 text-sm text-gray-600">
          Fill in the details below and let AI help you create a professional proposal.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Essential details about your proposal and client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Proposal Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Website Redesign for ABC Company"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="client_name">Client Name *</Label>
                <Input
                  id="client_name"
                  name="client_name"
                  value={form.client_name}
                  onChange={handleInputChange}
                  placeholder="e.g., John Smith"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="client_email">Client Email</Label>
                <Input
                  id="client_email"
                  name="client_email"
                  type="email"
                  value={form.client_email}
                  onChange={handleInputChange}
                  placeholder="client@company.com"
                />
              </div>
              
              <div>
                <Label htmlFor="company_name">Client Company</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  value={form.company_name}
                  onChange={handleInputChange}
                  placeholder="e.g., ABC Company"
                />
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>
                Information about the project scope and requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="budget_range">Budget Range</Label>
                <Input
                  id="budget_range"
                  name="budget_range"
                  value={form.budget_range}
                  onChange={handleInputChange}
                  placeholder="e.g., $5,000 - $10,000"
                />
              </div>
              
              <div>
                <Label htmlFor="timeline">Timeline</Label>
                <Input
                  id="timeline"
                  name="timeline"
                  value={form.timeline}
                  onChange={handleInputChange}
                  placeholder="e.g., 4-6 weeks"
                />
              </div>
              
              <div>
                <Label htmlFor="services_offered">Services Offered</Label>
                <textarea
                  id="services_offered"
                  name="services_offered"
                  value={form.services_offered}
                  onChange={handleInputChange}
                  placeholder="e.g., Web design, development, SEO optimization"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Description */}
        <Card>
          <CardHeader>
            <CardTitle>Project Description *</CardTitle>
            <CardDescription>
              Describe the project requirements, goals, and any specific details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              id="project_description"
              name="project_description"
              value={form.project_description}
              onChange={handleInputChange}
              placeholder="Describe the project in detail. Include goals, requirements, target audience, and any specific features or functionality needed."
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </CardContent>
        </Card>

        {/* AI Content Generation */}
        <Card>
          <CardHeader>
            <CardTitle>AI-Generated Content</CardTitle>
            <CardDescription>
              Generate professional proposal content using AI based on your project details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              onClick={generateProposalContent}
              disabled={generating || !form.project_description || !form.client_name}
              variant="outline"
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Proposal Content
                </>
              )}
            </Button>
            
            {generatedContent && (
              <div className="mt-4">
                <Label>Generated Content Preview</Label>
                <div className="mt-2 p-4 border rounded-md bg-gray-50 max-h-60 overflow-y-auto">
                  <div className="whitespace-pre-wrap text-sm">
                    {generatedContent}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Create Proposal
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}