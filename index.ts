import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const services = [
    { name: 'GitHub Profile Views', path: '/ghpvc', desc: 'Displays your total GitHub profile views.' },
    { name: 'GitHub Repo Views', path: '/ghrvc', desc: 'Shows repository view count in badge format.' },
    { name: 'Star Count', path: '/ghsc', desc: 'Returns total stars for a repository.' },
    { name: 'Fork Count', path: '/ghfc', desc: 'Displays the number of repository forks.' },
    { name: 'Follower Count', path: '/ghflwcnt', desc: 'Shows your total GitHub followers.' }
  ]

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>⚡ GitHub Services API</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body {
      background-color: #f8f9fa;
      color: #212529;
    }
    .service-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .service-card:hover {
      transform: translateY(-6px);
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.1);
    }
    .endpoint {
      font-family: monospace;
      background-color: #e9ecef;
      padding: 3px 8px;
      border-radius: 4px;
    }
    footer {
      margin-top: 60px;
      font-size: 0.85rem;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
    <div class="container">
      <a class="navbar-brand fw-bold" href="#">GitHub API Services</a>
    </div>
  </nav>

  <main class="container py-5">
    <div class="text-center mb-5">
      <h1 class="fw-bold text-primary mb-3">⚡ GitHub Services API</h1>
      <p class="text-muted">A collection of endpoints to display GitHub statistics and insights, built with TypeScript and Vercel.</p>
    </div>

    <div class="row g-4">
      ${services.map(s => `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card h-100 border-0 shadow-sm service-card">
            <div class="card-body d-flex flex-column justify-content-between">
              <div>
                <h5 class="card-title text-primary fw-semibold">${s.name}</h5>
                <p class="card-text text-muted small">${s.desc}</p>
              </div>
              <div class="d-flex justify-content-between align-items-center mt-3">
                <span class="endpoint">${s.path}</span>
                <a href="${s.path}" class="btn btn-outline-primary btn-sm">Visit</a>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <footer class="text-center mt-5">
      <p class="mb-0">Made with ❤️ by <span class="text-primary fw-semibold">Vigneshwaran P</span></p>
      <p class="mb-0">Blessed by Lord Shiva 🕉️</p>
    </footer>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
  `

  res.status(200).setHeader('Content-Type', 'text/html').send(html)
}
