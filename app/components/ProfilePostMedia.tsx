import Image from "next/image";

function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|mov|m4v|avi|mkv)(?:$|[?#])/i.test(url);
}

export default function ProfilePostMedia({
  media,
  altPrefix = "Post media",
}: {
  media?: string[];
  altPrefix?: string;
}) {
  const items = Array.isArray(media) ? media.filter(Boolean) : [];

  if (items.length === 0) {
    return null;
  }

  const gridClass = items.length === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className={`mb-4 grid gap-3 ${gridClass}`}>
      {items.map((src, index) => (
        <div
          key={`${src}-${index}`}
          className="relative aspect-video overflow-hidden rounded-xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
        >
          {isVideoUrl(src) ? (
            <video
              src={src}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full bg-black object-cover"
            />
          ) : (
            <Image
              src={src}
              alt={`${altPrefix} ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          )}
        </div>
      ))}
    </div>
  );
}
