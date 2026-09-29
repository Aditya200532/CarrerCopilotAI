export function Pagination({ meta, onChange }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-between text-sm">
      <span className="text-slate-500">
        Page {meta.page} of {meta.totalPages} · {meta.total} total
      </span>
      <div className="flex gap-2">
        <button className="btn-secondary !px-3 !py-1.5" disabled={!meta.hasPrev} onClick={() => onChange(meta.page - 1)}>
          Previous
        </button>
        <button className="btn-secondary !px-3 !py-1.5" disabled={!meta.hasNext} onClick={() => onChange(meta.page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
