import { i18n } from "../i18n"
import { FullSlug, getFileExtension, joinSegments, pathToRoot } from "../util/path"
import { CSSResourceToStyleElement, JSResourceToScriptElement } from "../util/resources"
import { googleFontHref, googleFontSubsetHref } from "../util/theme"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { unescapeHTML } from "../util/escape"
import { CustomOgImagesEmitterName } from "../plugins/emitters/ogImage"
export default (() => {
  const Head: QuartzComponent = ({
    cfg,
    fileData,
    externalResources,
    ctx,
  }: QuartzComponentProps) => {
    const titleSuffix = cfg.pageTitleSuffix ?? ""
    const rawTitle = String(
      fileData.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title,
    ).trim()
    const title = rawTitle + titleSuffix
    const description =
      fileData.frontmatter?.socialDescription ??
      fileData.frontmatter?.description ??
      unescapeHTML(fileData.description?.trim() ?? i18n(cfg.locale).propertyDefaults.description)

    const { css, js, additionalHead } = externalResources

    const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
    const path = url.pathname as FullSlug
    const baseDir = fileData.slug === "404" ? path : pathToRoot(fileData.slug!)
    const iconPath = joinSegments(baseDir, "static/icon.png")

    // Url of current page
    const socialUrl =
      fileData.slug === "404" ? url.toString() : joinSegments(url.toString(), fileData.slug!)

    const usesCustomOgImage = ctx.cfg.plugins.emitters.some(
      (e) => e.name === CustomOgImagesEmitterName,
    )
    const ogImageDefaultPath = `https://${cfg.baseUrl}/static/og-image.png`

    // Blog posts carry article metadata (dates, author, tags, JSON-LD) so crawlers and
    // agents can cite them; listings and site pages stay plain "website" pages.
    const slug = fileData.slug ?? ""
    const isPost = slug.startsWith("posts/") && !slug.endsWith("/index")
    const canonical =
      typeof fileData.frontmatter?.canonical === "string"
        ? (fileData.frontmatter.canonical as string)
        : socialUrl
    const iso = (d?: Date) =>
      d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : undefined
    const publishedAt = iso(fileData.dates?.published ?? fileData.dates?.created)
    const modifiedAt = iso(fileData.dates?.modified) ?? publishedAt
    const tags = Array.isArray(fileData.frontmatter?.tags)
      ? (fileData.frontmatter!.tags as string[])
      : []
    const author = "Lisa N. Cao"
    const socialImage = fileData.frontmatter?.socialImage
    const ogImage =
      typeof socialImage === "string" && socialImage.startsWith("http")
        ? socialImage
        : usesCustomOgImage
          ? `https://${cfg.baseUrl}/${slug}-og-image.webp`
          : ogImageDefaultPath
    const jsonLd = isPost
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: rawTitle,
          description,
          url: socialUrl,
          mainEntityOfPage: socialUrl,
          image: ogImage,
          datePublished: publishedAt,
          dateModified: modifiedAt,
          author: { "@type": "Person", name: author, url: `https://${cfg.baseUrl}/about` },
          publisher: { "@type": "Person", name: author, url: `https://${cfg.baseUrl}/` },
          keywords: tags.join(", "),
          inLanguage: cfg.locale,
          isAccessibleForFree: true,
        }
      : undefined

    return (
      <head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        {cfg.theme.cdnCaching && cfg.theme.fontOrigin === "googleFonts" && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link rel="stylesheet" href={googleFontHref(cfg.theme)} />
            {cfg.theme.typography.title && (
              <link rel="stylesheet" href={googleFontSubsetHref(cfg.theme, cfg.pageTitle)} />
            )}
          </>
        )}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <meta name="og:site_name" content={cfg.pageTitle}></meta>
        <meta property="og:title" content={title} />
        <meta property="og:type" content={isPost ? "article" : "website"} />
        {isPost && publishedAt && <meta property="article:published_time" content={publishedAt} />}
        {isPost && modifiedAt && <meta property="article:modified_time" content={modifiedAt} />}
        {isPost && <meta property="article:author" content={author} />}
        {isPost && tags.map((t) => <meta property="article:tag" content={t} />)}
        <meta name="author" content={author} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta property="og:description" content={description} />
        <meta property="og:image:alt" content={description} />

        {!usesCustomOgImage && (
          <>
            <meta property="og:image" content={ogImageDefaultPath} />
            <meta property="og:image:url" content={ogImageDefaultPath} />
            <meta name="twitter:image" content={ogImageDefaultPath} />
            <meta
              property="og:image:type"
              content={`image/${getFileExtension(ogImageDefaultPath) ?? "png"}`}
            />
          </>
        )}

        {cfg.baseUrl && (
          <>
            <meta property="twitter:domain" content={cfg.baseUrl}></meta>
            <meta property="og:url" content={socialUrl}></meta>
            <meta property="twitter:url" content={socialUrl}></meta>
          </>
        )}

        {/* self-canonical by default; frontmatter `canonical:` overrides when a post was first published elsewhere */}
        {fileData.slug !== "404" && <link rel="canonical" href={canonical} />}
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
            }}
          />
        )}

        <link rel="icon" href={iconPath} />
        <meta name="description" content={description} />
        <meta name="generator" content="Quartz" />

        {css.map((resource) => CSSResourceToStyleElement(resource, true))}
        {js
          .filter((resource) => resource.loadTime === "beforeDOMReady")
          .map((res) => JSResourceToScriptElement(res, true))}
        {additionalHead.map((resource) => {
          if (typeof resource === "function") {
            return resource(fileData)
          } else {
            return resource
          }
        })}
      </head>
    )
  }

  return Head
}) satisfies QuartzComponentConstructor
