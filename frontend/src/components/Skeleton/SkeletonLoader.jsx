
export const SongSkeleton = () => {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-background-card bg-opacity-20 animate-pulse">
      <div className="w-12 h-12 bg-gray-border rounded-md"></div>
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-gray-border rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-border rounded w-1/2"></div>
      </div>
      <div className="w-8 h-4 bg-gray-border rounded"></div>
    </div>
  )
}

export const CardSkeleton = () => {
  return (
    <div className="p-3 bg-background-card bg-opacity-40 border border-gray-border rounded-xl animate-pulse">
      <div className="aspect-square bg-gray-border rounded-lg mb-3"></div>
      <div className="h-4 bg-gray-border rounded w-5/6 mb-2"></div>
      <div className="h-3 bg-gray-border rounded w-2/3"></div>
    </div>
  )
}

export const BannerSkeleton = () => {
  return (
    <div className="w-full h-40 sm:h-56 bg-gray-border rounded-2xl animate-pulse"></div>
  )
}
