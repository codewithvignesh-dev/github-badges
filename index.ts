import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Badges API</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.15/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen flex flex-col items-center justify-center p-6">
  <main class="max-w-2xl w-full">
    <h1 class="text-3xl md:text-4xl font-bold text-center mb-6 text-white">⚡ GitHub Badges API</h1>
    <p class="text-center text-gray-400 mb-10">A collection of endpoints to display GitHub statistics, built with TypeScript and Vercel Functions.</p>
    
    <div class="grid gap-4">
      ${[
        { name: 'Repository View Count', path: '/ghrvc', desc: 'Displays total repository views.' },
        { name: 'Profile View Count', path: '/ghpvc', desc: 'Shows total profile views.' },
        { name: 'Followers Count', path: '/ghflwcnt', desc: 'Displays GitHub followers count.' },
        { name: 'Fork Count', path: '/ghfc', desc: 'Returns total repository forks.' },
        { name: 'Star Count', path: '/ghsc', desc: 'Shows total repository stars.' }
      ]
        .map(
          s => `
          <a href="${s.path}" class="block border border-gray-800 rounded-2xl p-5 bg-gray-900 hover:bg-gray-800 transition">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-lg font-semibold text-white">${s.name}</h2>
                <p class="text-gray-400 text-sm">${s.desc}</p>
              </div>
              <span class="text-blue-400 mt-2 sm:mt-0 font-mono text-sm">${s.path}</span>
            </div>
          </a>`
        )
        .join('')}
    </div>

    <footer class="text-center text-gray-600 text-xs mt-10">
      Made with ❤️ by <span class="text-blue-400 font-semibold">Vigneshwaran P</span><br>
      Blessed by Lord Shiva 🕉️
    </footer>
  </main>
</body>
</html>
  `
  res.status(200).setHeader('Content-Type', 'text/html').send(html)
}
