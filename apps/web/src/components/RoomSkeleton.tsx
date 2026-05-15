export function RoomSkeletonCard() {
  return (
    <div className="skeleton-card" role="status">
      <div className="skeleton-header">
        <div className="skeleton-avatar skeleton-pulse" />
        <div style={{ flex: 1 }}>
          <div className="skeleton-title skeleton-pulse" />
          <div className="skeleton-subtitle skeleton-pulse" />
        </div>
      </div>
      <div className="skeleton-body skeleton-pulse" />      <div className="skeleton-footer">
        <div className="skeleton-stat skeleton-pulse" />
        <div className="skeleton-stat skeleton-pulse" />
      </div>
    </div>
  )
}

export function RoomSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="card-grid">
      {Array.from({ length: count }, (_, i) => (
        <RoomSkeletonCard key={i} />
      ))}
    </div>
  )
}
