export default function AdminAuditLogPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <p className="text-gray-500">Read-only audit trail.</p>
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-400 text-sm">Audit log entries will appear here once event tracking is enabled.</p>
      </div>
    </div>
  )
}
