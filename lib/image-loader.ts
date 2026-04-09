type ImageLoaderProps = {
  src: string
  width: number
  quality?: number
}

const shouldUseCloudflareImageProxy = () => {
  if (process.env.NODE_ENV !== "production") {
    return false
  }

  if (process.env.CF_PAGES === "1") {
    return true
  }

  return (
    process.env.CLOUDFLARE_IMAGE_LOADER === "1" ||
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGE_LOADER === "1"
  )
}

const normalizeSrc = (src: string) => {
  const value = src.trim()

  if (/^https?:\/\//i.test(value)) {
    // Keep absolute URLs human-readable for Cloudflare while escaping query delimiters.
    return encodeURI(value).replace(/\?/g, "%3F").replace(/&/g, "%26").replace(/#/g, "%23")
  }

  if (value.startsWith("/")) {
    return encodeURI(value.slice(1))
  }

  return encodeURI(value)
}

const getParamsString = ({ width, quality }: Omit<ImageLoaderProps, "src">) => {
  const paramsObj = {
    width,
    quality: quality || 75,
    format: "avif",
    metadata: "none",
  }

  return Object.entries(paramsObj)
    .map(([key, value]) => `${key}=${value}`)
    .join(",")
}

export default function cloudflareLoader({ src, width, quality }: ImageLoaderProps) {
  if (!shouldUseCloudflareImageProxy()) {
    const separator = src.includes("?") ? "&" : "?"
    return `${src}${separator}w=${width}`
  }

  return `/cdn-cgi/image/${getParamsString({ width, quality })}/${normalizeSrc(src)}`
}
