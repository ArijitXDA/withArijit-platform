'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProfileFormProps {
  email: string
  initialData: { full_name: string; mobile: string; timezone: string }
}

export function ProfileForm({ email, initialData }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialData.full_name)
  const [mobile, setMobile] = useState(initialData.mobile)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: updateError } = await (supabase as any)
      .from('users')
      .update({ full_name: fullName, mobile })
      .eq('email', email)

    if (updateError) {
      setError('Failed to save. Please try again.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Email</Label>
        <Input value={email} disabled className="bg-gray-50" />
      </div>
      <div>
        <Label>Full Name</Label>
        <Input value={fullName} onChange={e => setFullName(e.target.value)} />
      </div>
      <div>
        <Label>Mobile</Label>
        <Input value={mobile} onChange={e => setMobile(e.target.value)} />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {saved && <p className="text-green-600 text-sm">Profile saved!</p>}
      <Button onClick={handleSave} disabled={loading}>
        {loading ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  )
}
