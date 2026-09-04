export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <div className="relative w-14 h-14 mx-auto">
          <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-40 mx-auto bg-gray-100 rounded-full animate-pulse" />
          <div className="h-2.5 w-28 mx-auto bg-gray-50 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
