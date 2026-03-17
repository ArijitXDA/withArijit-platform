export const metadata = { title: 'Contact Us', description: 'Get in touch with withArijit.' }

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
      <div className="space-y-4 text-gray-700">
        <p>Email: <a href="mailto:ai@withArijit.com" className="text-indigo-600 hover:underline">ai@withArijit.com</a></p>
        <p>WhatsApp: <a href="https://wa.me/919999999999" className="text-indigo-600 hover:underline">+91 99999 99999</a></p>
        <p>Company: oStaran Edu Pvt Ltd, Mumbai, India</p>
      </div>
    </div>
  )
}
