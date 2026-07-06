const target = process.env.WORDPRESS_URL ?? "https://kaylinanorton.com";
const sampleSlugs = [
  "david-sarah-crowne-plaza-playhouse-square-wedding-cleveland-ohio",
  "andy-kate-navy-blush-summer-wedding-at-the-ivory-room-columbus-ohio",
  "2017-year-review",
];

const normalizeUrl = (value) => value.replace(/\/+$/, "");
const siteUrl = normalizeUrl(target);

const fetchJsonWithHeaders = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return {
    data: await response.json(),
    headers: response.headers,
  };
};

const fetchCount = async (type) => {
  const url = new URL(`/wp-json/wp/v2/${type}`, siteUrl);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("_fields", "id");

  const { headers } = await fetchJsonWithHeaders(url);
  return Number(headers.get("x-wp-total") ?? 0);
};

const fetchCategories = async () => {
  const url = new URL("/wp-json/wp/v2/categories", siteUrl);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("_fields", "id,name,slug,count,parent");

  const { data } = await fetchJsonWithHeaders(url);
  return data
    .map(({ name, slug, count, parent }) => ({ name, slug, count, parent }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
};

const fetchRecentPosts = async () => {
  const url = new URL("/wp-json/wp/v2/posts", siteUrl);
  url.searchParams.set("per_page", "5");
  url.searchParams.set("_fields", "date,slug,title");

  const { data } = await fetchJsonWithHeaders(url);
  return data.map((post) => ({
    date: post.date,
    slug: post.slug,
    title: post.title?.rendered ?? "",
  }));
};

const checkPath = async (path) => {
  const response = await fetch(`${siteUrl}${path}`, { redirect: "manual" });
  return {
    path,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    location: response.headers.get("location") ?? "",
  };
};

const audit = async () => {
  const { data: info } = await fetchJsonWithHeaders(`${siteUrl}/wp-json/`);
  const [posts, media, pages, categories, recentPosts, checks] =
    await Promise.all([
      fetchCount("posts"),
      fetchCount("media"),
      fetchCount("pages"),
      fetchCategories(),
      fetchRecentPosts(),
      Promise.all([
        checkPath("/blog/"),
        checkPath("/category/weddings/"),
        checkPath(`/wp-json/wp/v2/posts?per_page=1&_fields=id,slug`),
        ...sampleSlugs.map((slug) => checkPath(`/${slug}/`)),
      ]),
    ]);

  return {
    url: siteUrl,
    name: info.name,
    description: info.description,
    wordpressUrl: info.url,
    home: info.home,
    timezone: info.timezone_string,
    counts: {
      posts,
      media,
      pages,
      categories: categories.length,
    },
    recentPosts,
    categories,
    checks,
  };
};

console.log(JSON.stringify(await audit(), null, 2));
