# Monolithic

The public Monolithic landing page. Static HTML, CSS, and JavaScript; no build step, dependencies, third-party requests, or backend.

## Site files

- `index.html`: page content and ASCII wordmark.
- `console.css`: responsive terminal display and phosphor effects.
- `console.js`: terminal scrolling, cursor, scrollbar, and live clock.
- `.nojekyll`: serves the files directly on GitHub Pages.
- `assets/`: browser icons and the social link-preview card. These are not displayed in the page content.
- `robots.txt` and `sitemap.xml`: crawler access and the canonical homepage.

## Preview

From this directory, run:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. Stop the server with Ctrl+C. You can also open `index.html` directly in a browser.

## Publish

Repository: [pjkinsella/monolithic-site](https://github.com/pjkinsella/monolithic-site).

GitHub Pages is enabled with **Deploy from a branch → main → / (root)**. Push changes to `main` to publish them; no build workflow is required. `CNAME` and Pages settings specify `monolithicmfg.com`.

### Connect the domain

DNS is managed at Porkbun. Replace the existing parking records for the root domain and `www` with these records (leave the root Host field blank in Porkbun):

| Type | Host | Answer |
| --- | --- | --- |
| A | (blank) | 185.199.108.153 |
| A | (blank) | 185.199.109.153 |
| A | (blank) | 185.199.110.153 |
| A | (blank) | 185.199.111.153 |
| CNAME | www | pjkinsella.github.io |

Keep email-related MX and TXT records. After DNS resolves to GitHub and the certificate is available, enable **Enforce HTTPS** in [Pages settings](https://github.com/pjkinsella/monolithic-site/settings/pages).

See [GitHub's custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) and [Porkbun's DNS instructions](https://kb.porkbun.com/article/231-how-to-add-dns-records-on-porkbun).

The contact link uses `hello@monolithicmfg.com`. Configure that mailbox or forwarding alias with the email provider before publishing.

## Search and sharing

The production origin is **https://monolithicmfg.com/**. The canonical link, Open Graph URL, structured data, robots sitemap reference, and sitemap use this same address. If the preferred domain changes, update all of them together, including the absolute social-card URLs.

The page includes a descriptive title and summary, Organization and WebSite JSON-LD, Open Graph and Twitter card metadata, and browser icons. The public copy is present in the original HTML. Clock output and decorative afterimage layers are excluded from search snippets with `data-nosnippet`.

After deployment:

1. Confirm the homepage, robots file, sitemap, icons, and social card return HTTP 200 over HTTPS.
2. Configure the preferred custom domain in GitHub Pages. Confirm `www` redirects to the canonical root domain.
3. Verify the domain in Google Search Console, submit `https://monolithicmfg.com/sitemap.xml`, and inspect the homepage URL.
4. Test a shared link in the relevant social platform's preview debugger; previews may cache older metadata.

Search Console verification requires account-specific DNS or verification details. No verification token is included in this repository. Indexing and rich-result display are determined by search engines after crawling.
