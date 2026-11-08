# Monolithic

The public Monolithic landing page. Static HTML, CSS, and JavaScript; no build step, dependencies, external assets, or backend.

## Site files

- `index.html`: page content and ASCII wordmark.
- `console.css`: responsive terminal display and phosphor effects.
- `console.js`: terminal scrolling, cursor, scrollbar, and live clock.
- `.nojekyll`: serves the files directly on GitHub Pages.

## Preview

From this directory, run:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. Stop the server with Ctrl+C. You can also open `index.html` directly in a browser.

## Publish

Push this repository to GitHub, then enable **Settings → Pages → Deploy from a branch → main → / (root)**. No build workflow is required.

Configure the custom domain in Pages settings, add the corresponding DNS records, and enable HTTPS after the certificate is available. See [GitHub's custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

The contact link uses `hello@monolithicmfg.com`. Configure that mailbox or forwarding alias with the email provider before publishing.
