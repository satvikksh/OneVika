export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header skeleton */}
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl mb-8 animate-pulse"></div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column skeleton */}
          <div className="lg:w-1/3 space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6">
              <div className="flex flex-col items-center">
                <div className="w-40 h-40 rounded-full bg-gray-200 dark:bg-gray-700 mb-6 animate-pulse"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6 animate-pulse"></div>
                <div className="space-y-3 w-full">
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
          </div>

          {/* Right column skeleton */}
          <div className="lg:w-2/3 space-y-6">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}