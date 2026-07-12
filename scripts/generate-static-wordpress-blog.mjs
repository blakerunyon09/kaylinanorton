import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const exportPath =
  process.env.WORDPRESS_EXPORT ??
  "/Users/blakerunyon/Downloads/kaylinanortonphotography.WordPress.2026-07-06.xml";
const publicDir = new URL("../public/", import.meta.url);
const siteOrigin = "https://kaylinanorton.com";
const postsPerPage = 10;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const decodeEntities = (value = "") =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&apos;", "'");

const readTag = (block, tagName) => {
  const tag = escapeRegExp(tagName);
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`));

  if (!match) {
    return "";
  }

  const value = match[1].trim();
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);

  return decodeEntities(cdata ? cdata[1] : value);
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const stripTags = (value) =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const normalizeContent = (content) =>
  content
    .replaceAll("https://kaylinanorton.com/", "/")
    .replaceAll("http://kaylinanorton.com/", "/")
    .replace(/<img\b/gi, '<img loading="lazy"')
    .replace(/<p>\s*<\/p>/gi, "");

const extractCategories = (block) => {
  const categories = [];
  const categoryPattern =
    /<category\s+domain="([^"]+)"\s+nicename="([^"]+)"[^>]*>([\s\S]*?)<\/category>/g;

  for (const match of block.matchAll(categoryPattern)) {
    if (match[1] !== "category") {
      continue;
    }

    const rawName = match[3].trim();
    const cdata = rawName.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
    const name = decodeEntities(cdata ? cdata[1] : rawName);

    categories.push({
      name,
      slug: match[2],
    });
  }

  return categories;
};

const parsePosts = (xml) => {
  const posts = [];

  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = match[1];

    if (readTag(block, "wp:post_type") !== "post" || readTag(block, "wp:status") !== "publish") {
      continue;
    }

    const title = readTag(block, "title");
    const slug = readTag(block, "wp:post_name") || slugify(title);
    const content = normalizeContent(readTag(block, "content:encoded"));
    const rawExcerpt = readTag(block, "excerpt:encoded");
    const excerpt = stripTags(rawExcerpt || content).slice(0, 220);
    const categories = extractCategories(block);
    const date = readTag(block, "wp:post_date") || readTag(block, "pubDate");
    const image = content.match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? "";

    posts.push({
      title,
      slug,
      content,
      excerpt,
      categories,
      date,
      image,
    });
  }

  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
};

const formatDate = (date) =>
  new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));

const pageShell = ({ title, description = "", canonical, body }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ""}
  <link rel="canonical" href="${canonical}">
  <link rel="icon" type="image/x-icon" href="https://static.showit.co/file/-ZWgWEaGQ6yLr_1-MJ_AYQ/46218/favicon.ico">
  <style>
    :root { color: #202020; background: #fff; font-family: "Courier New", Courier, monospace; letter-spacing: 0; }
    body { margin: 0; }
    .site-nav { display: flex; justify-content: center; gap: clamp(22px, 6vw, 78px); padding: 50px 24px 38px; text-transform: uppercase; font-size: clamp(18px, 2vw, 27px); letter-spacing: 3px; }
    .site-nav a { color: inherit; text-decoration: none; }
    .wrap { width: min(980px, calc(100% - 40px)); margin: 0 auto; }
    .blog-title { margin: 36px 0 54px; text-align: center; text-transform: uppercase; font-size: clamp(38px, 7vw, 76px); font-weight: 400; letter-spacing: 8px; }
    .post-list { display: grid; gap: 48px; margin-bottom: 80px; }
    .post-card { border-top: 1px solid #999; padding-top: 36px; }
    .post-card img { width: 100%; max-height: 520px; object-fit: cover; margin-bottom: 24px; }
    h1, h2 { font-weight: 400; text-transform: uppercase; letter-spacing: 4px; line-height: 1.25; }
    h1 { font-size: clamp(34px, 5vw, 58px); }
    h2 { font-size: clamp(26px, 4vw, 42px); }
    .meta, .categories, .pagination { color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; }
    a { color: inherit; }
    .read-more { display: inline-block; margin-top: 12px; text-transform: uppercase; letter-spacing: 2px; }
    .post-content { font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.75; letter-spacing: 0; }
    .post-content img { display: block; max-width: 100%; height: auto; margin: 22px auto; }
    .post-content a { text-decoration-thickness: 1px; }
    .pagination { display: flex; justify-content: space-between; gap: 24px; margin: 60px 0 100px; }
    .footer { margin-top: 80px; padding: 22px; background: #050505; color: #d8d8d8; text-align: center; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
    @media (max-width: 720px) {
      .site-nav { align-items: center; flex-wrap: wrap; gap: 16px 26px; padding-top: 30px; font-size: 15px; letter-spacing: 2px; }
      .blog-title { letter-spacing: 5px; }
    }
  </style>
</head>
<body>
  <nav class="site-nav" aria-label="Primary">
    <a href="/">Home</a>
    <a href="/portfolio/">Portfolio</a>
    <a href="/about/">About</a>
    <a href="/information/">Information</a>
    <a href="/contact/">Contact</a>
    <a href="/blog/">Blog</a>
  </nav>
  ${body}
  <footer class="footer">© Kaylina Norton Photography</footer>
</body>
</html>
`;

const renderPostCard = (post) => `<article class="post-card">
  ${post.image ? `<a href="/${post.slug}/"><img src="${post.image}" alt=""></a>` : ""}
  <p class="meta">${formatDate(post.date)}</p>
  <h2><a href="/${post.slug}/">${escapeHtml(post.title)}</a></h2>
  <p>${escapeHtml(post.excerpt)}${post.excerpt.length >= 220 ? "..." : ""}</p>
  <a class="read-more" href="/${post.slug}/">Read More</a>
</article>`;

const renderIndex = ({ posts, page, totalPages, title = "Blog", basePath = "/blog/" }) => {
  const previousPage = page > 1 ? (page === 2 ? basePath : `${basePath}page/${page - 1}/`) : "";
  const nextPage = page < totalPages ? `${basePath}page/${page + 1}/` : "";

  return pageShell({
    title: `${title} - Kaylina Norton Photography`,
    description: "Wedding photography stories from Kaylina Norton Photography.",
    canonical: `${siteOrigin}${page === 1 ? basePath : `${basePath}page/${page}/`}`,
    body: `<main class="wrap">
      <h1 class="blog-title">${escapeHtml(title)}</h1>
      <section class="post-list">${posts.map(renderPostCard).join("\n")}</section>
      <nav class="pagination">
        <span>${previousPage ? `<a href="${previousPage}">Newer Posts</a>` : ""}</span>
        <span>${nextPage ? `<a href="${nextPage}">Older Posts</a>` : ""}</span>
      </nav>
    </main>`,
  });
};

const renderPost = (post) =>
  pageShell({
    title: `${post.title} - Kaylina Norton Photography`,
    description: post.excerpt,
    canonical: `${siteOrigin}/${post.slug}/`,
    body: `<main class="wrap">
      <article>
        <p class="meta">${formatDate(post.date)}</p>
        <h1>${escapeHtml(post.title)}</h1>
        ${
          post.categories.length
            ? `<p class="categories">${post.categories
                .map((category) => `<a href="/category/${category.slug}/">${escapeHtml(category.name)}</a>`)
                .join(" / ")}</p>`
            : ""
        }
        <div class="post-content">${post.content}</div>
      </article>
      <p class="pagination"><a href="/blog/">Back to Blog</a></p>
    </main>`,
  });

const writeHtml = async (relativePath, html) => {
  const file = new URL(relativePath, publicDir);
  await mkdir(path.dirname(file.pathname), { recursive: true });
  await writeFile(file, html);
};

const writeIndexes = async (posts) => {
  const totalPages = Math.ceil(posts.length / postsPerPage);

  for (let page = 1; page <= totalPages; page += 1) {
    const pagePosts = posts.slice((page - 1) * postsPerPage, page * postsPerPage);
    const relativePath = page === 1 ? "blog/index.html" : `blog/page/${page}/index.html`;
    await writeHtml(relativePath, renderIndex({ posts: pagePosts, page, totalPages }));
  }
};

const writeCategoryIndexes = async (posts) => {
  const categories = new Map();

  for (const post of posts) {
    for (const category of post.categories) {
      const categoryPosts = categories.get(category.slug) ?? { category, posts: [] };
      categoryPosts.posts.push(post);
      categories.set(category.slug, categoryPosts);
    }
  }

  for (const { category, posts: categoryPosts } of categories.values()) {
    const totalPages = Math.ceil(categoryPosts.length / postsPerPage);

    for (let page = 1; page <= totalPages; page += 1) {
      const pagePosts = categoryPosts.slice((page - 1) * postsPerPage, page * postsPerPage);
      const basePath = `/category/${category.slug}/`;
      const relativePath =
        page === 1 ? `category/${category.slug}/index.html` : `category/${category.slug}/page/${page}/index.html`;

      await writeHtml(
        relativePath,
        renderIndex({
          posts: pagePosts,
          page,
          totalPages,
          title: category.name,
          basePath,
        }),
      );
    }
  }
};

const writeRedirects = async () => {
  await writeFile(
    new URL("_redirects", publicDir),
    [
      "# WordPress blog is statically generated from the 2026-07-06 WXR export.",
      "/blog /blog/ 301!",
      "/wp-content/uploads/* /.netlify/functions/wordpress-proxy/wp-content/uploads/:splat 200!",
      "",
    ].join("\n"),
  );
};

const xml = await readFile(exportPath, "utf8");
const posts = parsePosts(xml);

if (posts.length === 0) {
  throw new Error(`No published WordPress posts found in ${exportPath}`);
}

await rm(new URL("blog/", publicDir), { recursive: true, force: true });
await rm(new URL("category/", publicDir), { recursive: true, force: true });

await writeIndexes(posts);
await writeCategoryIndexes(posts);

for (const post of posts) {
  const html = renderPost(post);
  await writeHtml(`${post.slug}/index.html`, html);
  await writeHtml(`blog/${post.slug}/index.html`, html);
}

await writeRedirects();

console.log(`Generated ${posts.length} static WordPress posts, blog indexes, and category indexes.`);
