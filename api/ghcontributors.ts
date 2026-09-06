import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {

    const user = (req.query.user as string)?.trim()
    const repo = (req.query.repo as string)?.trim()

    if (!user || !repo) {
        res.status(400).send(
            'Usage: /ghcontributors?user=<username>&repo=<repository>'
        )
        return
    }

    const ghToken = process.env.GITHUB_TOKEN

    if (!ghToken) {
        res.status(500).send(
            'Server misconfigured: GITHUB_TOKEN not set'
        )
        return
    }

    const apiUrl =
        `https://api.github.com/repos/${user}/${repo}/contributors?per_page=3&anon=true`

    const headers = {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${ghToken}`,
        'X-GitHub-Api-Version': '2026-03-10',
    }

    try {

        const ghResp = await fetch(apiUrl, { headers })

        if (!ghResp.ok) {
            res
                .status(ghResp.status)
                .send(`GitHub API error: ${await ghResp.text()}`)
            return
        }

        const contributors = await ghResp.json()

        if (!Array.isArray(contributors) || contributors.length === 0) {
            res.status(404).send('No contributors found')
            return
        }

        const myIdentities = new Set([
            'tg-darkespyt',
            'Vigneshwaran',
            'Vigneshwaran P',
            'codewithvignesh-dev',
        ])

        const mergedContributors = new Map<string, any>()

        contributors.forEach((contributor: any) => {

            const identity =
                contributor.login ||
                contributor.name ||
                'Unknown'

            const displayName =
                myIdentities.has(identity)
                    ? 'codewithvignesh-dev'
                    : identity

            const contributions =
                Number(contributor.contributions) || 0

            if (mergedContributors.has(displayName)) {

                const existing =
                    mergedContributors.get(displayName)

                existing.contributions += contributions

            } else {

                mergedContributors.set(displayName, {
                    login: displayName,
                    avatar: contributor.avatar_url || '',
                    url:
                        displayName === 'codewithvignesh-dev'
                            ? 'https://github.com/codewithvignesh-dev'
                            : contributor.html_url || '#',
                    contributions,
                })
            }
        })

        const mergedData =
            Array.from(mergedContributors.values())

        const total = mergedData.reduce(
            (sum: number, contributor: any) =>
                sum + contributor.contributions,
            0
        )

        if (total === 0) {
            res.status(404).send('No contribution data found')
            return
        }

        // Sort by contributions descending so rank #1 is always accurate.
        const data = mergedData
            .map((contributor: any) => ({
                ...contributor,
                percentage:
                    (contributor.contributions / total) * 100,
            }))
            .sort(
                (a: any, b: any) => b.contributions - a.contributions
            )

        const MAX_CONTRIBUTORS = 6

        let chartData = data.slice(0, MAX_CONTRIBUTORS)

        if (data.length > MAX_CONTRIBUTORS) {

            const rest = data.slice(MAX_CONTRIBUTORS)

            const othersContributions = rest.reduce(
                (sum: number, contributor: any) =>
                    sum + contributor.contributions,
                0
            )

            const othersPercentage = rest.reduce(
                (sum: number, contributor: any) =>
                    sum + contributor.percentage,
                0
            )

            chartData.push({
                login: 'Others',
                avatar: '',
                url: '#',
                contributions: othersContributions,
                percentage: othersPercentage,
            })
        }

        const svg = renderCard(user, repo, chartData)

        res.setHeader('Content-Type', 'image/svg+xml')
        res.setHeader('Cache-Control', 'public, max-age=3600')
        res.status(200).send(svg)

    } catch (error) {

        console.error(error)

        res
            .status(500)
            .send('Failed to fetch contributor data')
    }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const ACCENTS = [
    { fill: '#3b82f6', dark: '#1d4ed8', text: '#93c5fd' }, // blue    - rank 1 identity
    { fill: '#a855f7', dark: '#7e22ce', text: '#d8b4fe' }, // purple  - rank 2
    { fill: '#22c55e', dark: '#15803d', text: '#86efac' }, // green   - rank 3
    { fill: '#ec4899', dark: '#be185d', text: '#f9a8d4' }, // pink
    { fill: '#06b6d4', dark: '#0e7490', text: '#67e8f9' }, // cyan
    { fill: '#f97316', dark: '#c2410c', text: '#fdba74' }, // orange
    { fill: '#ef4444', dark: '#b91c1c', text: '#fca5a5' }, // red
    { fill: '#64748b', dark: '#334155', text: '#cbd5e1' }, // slate ("Others")
]

const GOLD = '#fbbf24'
const GOLD_DARK = '#d97706'

function renderCard(user: string, repo: string, chartData: any[]): string {

    const width = 1000
    const headerHeight = 195
    const rowHeight = 132
    const rowGap = 16
    const perRow = rowHeight + rowGap
    const footerHeight = 66

    const height =
        headerHeight + chartData.length * perRow - rowGap + footerHeight

    const cardX = 430
    const cardWidth = width - cardX - 40

    const donutCx = 220
    const donutCy = headerHeight + (chartData.length * perRow - rowGap) / 2
    const outerR = 150
    const innerR = 96

    const slices = buildDonutSlices(chartData, donutCx, donutCy, outerR, innerR)
    const rows = buildRows(chartData, cardX, cardWidth, headerHeight, perRow, rowHeight)

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0b1120" />
            <stop offset="55%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#111827" />
        </linearGradient>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0.15" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${GOLD}" />
            <stop offset="100%" stop-color="${GOLD_DARK}" />
        </linearGradient>
        <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#000000" flood-opacity="0.35" />
        </filter>
        <filter id="goldGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="${GOLD}" flood-opacity="0.55" />
        </filter>
        <clipPath id="cardClip"><rect width="${width}" height="${height}" rx="24" /></clipPath>
    </defs>

    <g clip-path="url(#cardClip)">
        <rect width="${width}" height="${height}" fill="url(#bg)" />

        <!-- decorative wave, bottom-right -->
        <path d="M ${width - 260} ${height} C ${width - 180} ${height - 90}, ${width - 60} ${height - 40}, ${width} ${height - 130} L ${width} ${height} Z" fill="url(#waveGrad)" />

        <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="23" fill="none" stroke="rgba(148,163,184,0.18)" stroke-width="1" />
    </g>

    <!-- Header -->
    ${brandIcon(40, 42, 26)}
    <text x="104" y="60" font-family="'Segoe UI', Arial, sans-serif" font-size="32" font-weight="800" fill="#f8fafc">Contributors</text>
    <text x="104" y="86" font-family="'Segoe UI', Arial, sans-serif" font-size="14" fill="#94a3b8">Amazing people who make this project better</text>
    ${vectorHeart(432, 79, 9)}

    <text x="${width - 40}" y="48" text-anchor="end" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="16" fill="#a5b4fc">Together</text>
    <text x="${width - 40}" y="72" text-anchor="end" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="16" fill="#a5b4fc">We Build</text>
    ${vectorSparkle(width - 22, 26, 7)}
    ${vectorSparkle(width - 140, 92, 5)}
    <line x1="${width - 128}" y1="78" x2="${width - 40}" y2="78" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />

    <!-- Donut -->
    ${slices}
    <circle cx="${donutCx}" cy="${donutCy}" r="${innerR - 8}" fill="#0f172a" filter="url(#softShadow)" />
    ${brandIcon(donutCx - 20, donutCy - 44, 20)}
    <text x="${donutCx}" y="${donutCy + 8}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="13" fill="#94a3b8">Total Contributions</text>
    <text x="${donutCx}" y="${donutCy + 38}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="30" font-weight="800" fill="#f8fafc">100%</text>

    <!-- Ranked cards -->
    ${rows}

    <!-- Footer -->
    ${brandIcon(40, height - 46, 15)}
    <text x="72" y="${height - 34}" font-family="'Segoe UI', Arial, sans-serif" font-size="13" fill="#94a3b8">Open Source &#160;&#8226;&#160; Build Together</text>

    ${vectorSparkle(width - 34, height - 46, 6)}
    ${vectorSparkle(width - 64, height - 20, 4)}
</svg>
`.trim()
}

function vectorSparkle(cx: number, cy: number, size: number): string {
    // small 4-point star, used instead of an emoji so it renders identically everywhere
    return `
        <path d="M ${cx} ${cy - size} Q ${cx + size * 0.22} ${cy - size * 0.22} ${cx + size} ${cy} Q ${cx + size * 0.22} ${cy + size * 0.22} ${cx} ${cy + size} Q ${cx - size * 0.22} ${cy + size * 0.22} ${cx - size} ${cy} Q ${cx - size * 0.22} ${cy - size * 0.22} ${cx} ${cy - size} Z" fill="#c7d2fe" opacity="0.85" />
    `
}

function vectorHeart(cx: number, cy: number, size: number): string {
    return `
        <path d="M ${cx} ${cy + size * 0.7}
                 C ${cx - size * 1.3} ${cy - size * 0.4}, ${cx - size * 0.4} ${cy - size * 1.3}, ${cx} ${cy - size * 0.4}
                 C ${cx + size * 0.4} ${cy - size * 1.3}, ${cx + size * 1.3} ${cy - size * 0.4}, ${cx} ${cy + size * 0.7} Z"
              fill="#a78bfa" />
    `
}

function vectorCrown(cx: number, cy: number, w: number, h: number): string {
    const left = cx - w / 2
    const right = cx + w / 2
    const base = cy + h * 0.35
    const top = cy - h * 0.55
    return `
        <path d="M ${left} ${base}
                 L ${left} ${cy}
                 L ${left + w * 0.25} ${cy + h * 0.15}
                 L ${cx} ${top}
                 L ${right - w * 0.25} ${cy + h * 0.15}
                 L ${right} ${cy}
                 L ${right} ${base}
                 Z"
              fill="url(#goldGrad)" stroke="${GOLD_DARK}" stroke-width="0.8" />
        <circle cx="${left}" cy="${cy}" r="${w * 0.05}" fill="${GOLD}" />
        <circle cx="${cx}" cy="${top}" r="${w * 0.06}" fill="${GOLD}" />
        <circle cx="${right}" cy="${cy}" r="${w * 0.05}" fill="${GOLD}" />
    `
}

function brandIcon(x: number, y: number, r: number): string {
    // Generic "repo / code" mark (avoids reproducing any third-party logo).
    return `
        <g>
            <circle cx="${x + r}" cy="${y + r}" r="${r}" fill="#ffffff" />
            <text x="${x + r}" y="${y + r + r * 0.36}" text-anchor="middle" font-family="'Consolas', 'Courier New', monospace" font-size="${r * 1.15}" font-weight="700" fill="#0f172a">&lt;/&gt;</text>
        </g>
    `
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = (angleDeg - 90) * Math.PI / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function donutSlicePath(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number) {
    const outerStart = polar(cx, cy, rOuter, endAngle)
    const outerEnd = polar(cx, cy, rOuter, startAngle)
    const innerStart = polar(cx, cy, rInner, startAngle)
    const innerEnd = polar(cx, cy, rInner, endAngle)
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1'

    return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerStart.x} ${innerStart.y}`,
        `A ${rInner} ${rInner} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
        'Z',
    ].join(' ')
}

function buildDonutSlices(chartData: any[], cx: number, cy: number, rOuter: number, rInner: number): string {

    let currentAngle = 0

    return chartData.map((contributor, index) => {

        const startAngle = currentAngle
        const sliceAngle = contributor.percentage * 3.6
        const endAngle = currentAngle + sliceAngle
        currentAngle = endAngle

        const accent = ACCENTS[index % ACCENTS.length]
        const isTop = index === 0

        const path = donutSlicePath(cx, cy, rOuter, rInner, startAngle, endAngle)

        return `
            <path
                d="${path}"
                fill="${accent.fill}"
                stroke="#0b1120"
                stroke-width="3"
                ${isTop ? 'filter="url(#softShadow)"' : ''}
            >
                <title>${escapeXml(contributor.login)}: ${contributor.percentage.toFixed(2)}%</title>
            </path>
        `
    }).join('')
}

function avatarIcon(rank: number, cx: number, cy: number, r: number, accentFill: string, login: string): string {

    if (rank === 0) {
        // code-style avatar for the top contributor
        return `
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="#111827" stroke="${accentFill}" stroke-width="2" />
            <text x="${cx}" y="${cy + r * 0.32}" text-anchor="middle" font-family="'Consolas', 'Courier New', monospace" font-size="${r * 0.85}" font-weight="700" fill="${accentFill}">&lt;/&gt;</text>
        `
    }

    if (rank === 1) {
        // simple mask silhouette
        return `
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="${accentFill}" />
            <rect x="${cx - r * 0.55}" y="${cy - r * 0.12}" width="${r * 1.1}" height="${r * 0.55}" rx="${r * 0.25}" fill="#0f172a" opacity="0.85" />
            <circle cx="${cx - r * 0.22}" cy="${cy + r * 0.14}" r="${r * 0.08}" fill="#f8fafc" />
            <circle cx="${cx + r * 0.22}" cy="${cy + r * 0.14}" r="${r * 0.08}" fill="#f8fafc" />
        `
    }

    // generic person icon for everyone else
    return `
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="${accentFill}" />
        <circle cx="${cx}" cy="${cy - r * 0.22}" r="${r * 0.32}" fill="#f8fafc" opacity="0.92" />
        <path d="M ${cx - r * 0.5} ${cy + r * 0.55} A ${r * 0.5} ${r * 0.5} 0 0 1 ${cx + r * 0.5} ${cy + r * 0.55} Z" fill="#f8fafc" opacity="0.92" />
    `
}

function buildRows(chartData: any[], cardX: number, cardWidth: number, headerHeight: number, perRow: number, rowHeight: number): string {

    return chartData.map((contributor, index) => {

        const y = headerHeight + index * perRow
        const isTop = index === 0
        const accent = ACCENTS[index % ACCENTS.length]

        const avatarR = isTop ? 34 : 28
        const avatarCx = cardX + 46
        const avatarCy = y + rowHeight / 2

        const barX = avatarCx + avatarR + 26
        const pctReserve = isTop ? 130 : 100
        const barWidth = cardX + cardWidth - barX - pctReserve
        const nameMaxWidth = barWidth
        const barFillWidth = Math.max(4, (contributor.percentage / 100) * barWidth)

        const nameY = isTop ? y + 38 : y + rowHeight / 2 - 6
        const subY = y + 58
        const barY = isTop ? y + 86 : y + rowHeight / 2 + 22
        const pctY = isTop ? y + 44 : y + rowHeight / 2 - 2

        const pctColor = isTop ? GOLD : accent.text
        const barColor = isTop ? 'url(#goldGrad)' : accent.fill
        const nameMaxChars = Math.max(6, Math.floor(nameMaxWidth / (isTop ? 11.5 : 9.5)))

        return `
            <g>
                ${isTop ? `
                <rect x="${cardX - 4}" y="${y - 4}" width="${cardWidth + 8}" height="${rowHeight + 8}" rx="18"
                    fill="rgba(251, 191, 36, 0.07)" stroke="${GOLD}" stroke-width="1.6" filter="url(#goldGlow)" />
                ${vectorCrown(avatarCx, avatarCy - avatarR - 10, 26, 18)}
                ` : `
                <rect x="${cardX - 4}" y="${y - 4}" width="${cardWidth + 8}" height="${rowHeight + 8}" rx="18"
                    fill="rgba(148, 163, 184, 0.06)" stroke="rgba(148,163,184,0.18)" stroke-width="1" />
                `}

                ${avatarIcon(index, avatarCx, avatarCy, avatarR, accent.fill, contributor.login)}

                <circle cx="${avatarCx + avatarR - 4}" cy="${avatarCy + avatarR - 4}" r="12" fill="${isTop ? GOLD : accent.fill}" stroke="#0b1120" stroke-width="2" />
                <text x="${avatarCx + avatarR - 4}" y="${avatarCy + avatarR}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="800" fill="#0b1120">${index + 1}</text>

                <text x="${barX}" y="${nameY}" font-family="'Segoe UI', Arial, sans-serif" font-size="${isTop ? 19 : 16}" font-weight="700" fill="#f8fafc">${escapeXml(truncate(contributor.login, nameMaxChars))}</text>

                ${isTop ? `<text x="${barX}" y="${subY}" font-family="'Segoe UI', Arial, sans-serif" font-size="13" fill="#94a3b8">Top Contributor</text>` : ''}

                <text x="${cardX + cardWidth - 4}" y="${pctY}" text-anchor="end" font-family="'Segoe UI', Arial, sans-serif" font-size="${isTop ? 22 : 16}" font-weight="800" fill="${pctColor}">${contributor.percentage.toFixed(2)}%</text>

                <rect x="${barX}" y="${barY}" width="${barWidth}" height="8" rx="4" fill="rgba(148,163,184,0.15)" />
                <rect x="${barX}" y="${barY}" width="${barFillWidth}" height="8" rx="4" fill="${barColor}" />
            </g>
        `
    }).join('')
}

function escapeXml(value: string): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function truncate(value: string, max: number): string {
    if (!value) return ''
    return value.length > max ? `${value.slice(0, max - 1)}\u2026` : value
}
