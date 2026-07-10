"use client";

interface DateSeparatorProps {
  label: string;
}

export default function DateSeparator({ label }: DateSeparatorProps) {
  return (
    <div className="flex justify-center px-4 py-2">
      <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200/70 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800">
        {label}
      </div>
    </div>
  );
}
