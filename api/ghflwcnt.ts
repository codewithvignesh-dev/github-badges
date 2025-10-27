import { VercelRequest, VercelResponse } from '@vercel/node'

module.exports = async function handler(req: VercelRequest, res: VercelResponse) {
  const user = (req.query.user as string)?.trim()
  const label = (req.query.label as string)?.trim() || 'Followers'

  if (!user) {
    res.status(400).send('Usage: /ghfollowers?user=<username>&label=Followers')
    return
  }

  const ghToken = process.env.GITHUB_TOKEN
  if (!ghToken) {
    res.status(500).send('Server misconfigured: GITHUB_TOKEN not set')
    return
  }

  const apiUrl = `https://api.github.com/users/${user}`
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${ghToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }

  const ghResp = await fetch(apiUrl, { headers })
  if (!ghResp.ok) {
    res.status(ghResp.status).send(`GitHub API error: ${await ghResp.text()}`)
    return
  }

  const data = await ghResp.json()
  const followers = data.followers || 0

  const labelWidth = Math.max(60, label.length * 7.2)
  const valueText = followers.toLocaleString()
  const valueWidth = Math.max(40, valueText.length * 7.2)
  const totalWidth = labelWidth + valueWidth

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="#28a745"/>
    <rect width="${totalWidth}" height="20" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${valueText}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${valueText}</text>
  </g>
</svg>`

  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'max-age=3600')
  res.status(200).send(svg)
}
