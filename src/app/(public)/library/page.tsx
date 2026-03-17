import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'

export const revalidate = 3600
export const metadata = { title: 'AI Library', description: 'Free AI resources, guides, and templates.' }

export default async function LibraryPage() {
  const supabase = await createClient()
  // Try to fetch public library items - gracefully handle if table doesn't exist
  const { data: items, error } = await supabase
    .from('library_items')
    .select('id, title, type, description')
    .eq('is_public', true)
    .limit(3)

  if (error) console.error('Failed to fetch library items:', error.message)

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">AI Resource Library</h1>
        <p className="text-gray-600 text-lg">Templates, guides, prompts, and tools. Free previews — full access for enrolled students.</p>
      </div>
      {(items ?? []).length > 0 && (
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {(items ?? []).map((item: { id: string; title: string; type: string; description?: string }) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">{item.description ?? item.type}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="text-center p-12 bg-gray-50 rounded-2xl">
        <Lock className="mx-auto mb-4 text-gray-400" size={40} />
        <h3 className="text-xl font-semibold mb-2">Full Library — Students Only</h3>
        <p className="text-gray-600 mb-6">300+ resources available to enrolled students.</p>
        <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }), '')}>
          Get Access →
        </Link>
      </div>
    </div>
  )
}
