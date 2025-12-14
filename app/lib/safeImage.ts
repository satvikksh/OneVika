export async function findValidImage(basePath: string) {
  const extensions = ["jpg", "jpeg", "png", "webp"];
  
  for (const ext of extensions) {
    const url = `${basePath}.${ext}`;

    try {
      const res = await fetch(url, { method: "HEAD" });

      if (res.ok) return url;
    } catch (err) {
      continue;
    }
  }

  // Default fallback image
  return "/img/fallback.jpg";
}
