import { createClient } from '@/lib/supabase/server'
import { MapPin } from 'lucide-react'

export const revalidate = 3600
export const metadata = { title: 'AI Spots', description: 'AI-friendly co-working spaces and learning spots across India.' }

export default async function AISpotsPage() {
  const supabase = await createClient()
  const { data: spots, error } = await supabase
    .from('aispot_master')
    .select('id, name, city, state, address')
    .eq('is_approved', true)
    .order('city')

  if (error) console.error('Failed to fetch AI spots:', error.message)

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">AI Spots</h1>
      <p className="text-gray-600 text-lg mb-12">AI-friendly spaces where you can learn, work, and connect.</p>
      {(spots ?? []).length === 0 ? (
        <p className="text-gray-500 text-center py-12">AI Spots launching soon in your city.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(spots ?? []).map((spot: { id: string; name: string; city: string; state?: string; address?: string }) => (
            <div key={spot.id} className="p-6 border rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <MapPin className="text-indigo-600 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <h3 className="font-semibold">{spot.name}</h3>
                  <p className="text-gray-600 text-sm">{spot.city}{spot.state ? `, ${spot.state}` : ''}</p>
                  {spot.address && <p className="text-gray-500 text-xs mt-1">{spot.address}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
