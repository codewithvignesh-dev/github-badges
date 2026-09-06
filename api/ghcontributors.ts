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
        `https://api.github.com/repos/${user}/${repo}/contributors?per_page=100&anon=true`

    const headers = {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${ghToken}`,
        'X-GitHub-Api-Version': '2026-03-10',
    }

    const escapeXml = (value: string) =>
        String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;')

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
                'Someone'

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

        mergedData.sort(
            (a, b) =>
                b.contributions - a.contributions
        )

        const total = mergedData.reduce(
            (sum: number, contributor: any) =>
                sum + contributor.contributions,
            0
        )

        if (total === 0) {
            res.status(404).send('No contribution data found')
            return
        }

        const MAX_CONTRIBUTORS = 7

        let chartData = mergedData
            .slice(0, MAX_CONTRIBUTORS)
            .map((contributor: any) => ({
                ...contributor,
                percentage:
                    (contributor.contributions / total) * 100,
            }))

        if (mergedData.length > MAX_CONTRIBUTORS) {
            const visibleContributions =
                mergedData
                    .slice(0, MAX_CONTRIBUTORS)
                    .reduce(
                        (sum: number, contributor: any) =>
                            sum + contributor.contributions,
                        0
                    )

            const othersContributions =
                total - visibleContributions

            chartData.push({
                login: 'Others',
                avatar: '',
                url: '#',
                contributions: othersContributions,
                percentage:
                    (othersContributions / total) * 100,
            })
        }

        const width = 900
        const height = 560

        const chartColors = [
            '#0ea5ff',
            '#a855f7',
            '#22c55e',
            '#f59e0b',
            '#ef4444',
            '#06b6d4',
            '#ec4899',
            '#64748b',
        ]

        const polarToCartesian = (
            centerX: number,
            centerY: number,
            radius: number,
            angle: number
        ) => {
            const angleInRadians =
                (angle - 90) * Math.PI / 180

            return {
                x:
                    centerX +
                    radius * Math.cos(angleInRadians),
                y:
                    centerY +
                    radius * Math.sin(angleInRadians),
            }
        }

        const describeArc = (
            centerX: number,
            centerY: number,
            radius: number,
            startAngle: number,
            endAngle: number
        ) => {
            const start =
                polarToCartesian(
                    centerX,
                    centerY,
                    radius,
                    endAngle
                )

            const end =
                polarToCartesian(
                    centerX,
                    centerY,
                    radius,
                    startAngle
                )

            const largeArcFlag =
                endAngle - startAngle <= 180
                    ? '0'
                    : '1'

            return [
                `M ${centerX} ${centerY}`,
                `L ${start.x} ${start.y}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
                'Z'
            ].join(' ')
        }

        const chartX = 205
        const chartY = 315
        const radius = 145
        const innerRadius = 91

        let currentAngle = 0

        const slices = chartData
            .map((contributor: any, index: number) => {
                const startAngle = currentAngle

                const sliceAngle =
                    contributor.percentage * 3.6

                const endAngle =
                    currentAngle + sliceAngle

                currentAngle = endAngle

                const path =
                    describeArc(
                        chartX,
                        chartY,
                        radius,
                        startAngle,
                        endAngle
                    )

                return `
<path
    d="${path}"
    fill="url(#chartGradient${index})"
    stroke="#08152f"
    stroke-width="4"
>
    <title>${escapeXml(contributor.login)}: ${contributor.percentage.toFixed(2)}%</title>
</path>
`
            })
            .join('')

        const cards = chartData
            .slice(0, 3)
            .map((contributor: any, index: number) => {
                const cardX = 390
                const cardY = 145 + index * 112
                const cardWidth = 465
                const cardHeight = 92

                const percentage =
                    contributor.percentage.toFixed(2)

                const progressWidth =
                    Math.max(
                        8,
                        (contributor.percentage / 100) * 400
                    )

                const isFirst = index === 0
                const isSecond = index === 1
                const isThird = index === 2

                const border =
                    isFirst
                        ? '#fbbf24'
                        : '#1e335b'

                const avatarGradient =
                    isFirst
                        ? 'url(#goldAvatar)'
                        : isSecond
                            ? 'url(#purpleAvatar)'
                            : 'url(#greenAvatar)'

                const accent =
                    isFirst
                        ? '#fbbf24'
                        : isSecond
                            ? '#c084fc'
                            : '#34d399'

                const avatarIcon =
                    contributor.avatar
                        ? `
<clipPath id="avatarClip${index}">
    <circle
        cx="${cardX + 48}"
        cy="${cardY + 46}"
        r="28"
    />
</clipPath>

<image
    href="${escapeXml(contributor.avatar)}"
    x="${cardX + 20}"
    y="${cardY + 18}"
    width="56"
    height="56"
    preserveAspectRatio="xMidYMid slice"
    clip-path="url(#avatarClip${index})"
/>
`
                        : `
<circle
    cx="${cardX + 48}"
    cy="${cardY + 46}"
    r="28"
    fill="${avatarGradient}"
/>

<circle
    cx="${cardX + 48}"
    cy="${cardY + 38}"
    r="9"
    fill="#ffffff"
    opacity="0.9"
/>

<path
    d="M ${cardX + 32} ${cardY + 61}
       Q ${cardX + 48} ${cardY + 45}
       ${cardX + 64} ${cardY + 61}"
    fill="#ffffff"
    opacity="0.9"
/>
`

                const rankBadge = `
<circle
    cx="${cardX + 70}"
    cy="${cardY + 70}"
    r="13"
    fill="${accent}"
/>

<text
    x="${cardX + 70}"
    y="${cardY + 75}"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="12"
    font-weight="700"
    fill="#071326"
>
    ${index + 1}
</text>
`

                const crown =
                    isFirst
                        ? `
<text
    x="${cardX + 28}"
    y="${cardY + 10}"
    font-size="23"
>
    👑
</text>
`
                        : ''

                const label =
                    isFirst
                        ? 'TOP CONTRIBUTOR'
                        : isSecond
                            ? 'CONTRIBUTOR'
                            : 'CONTRIBUTOR'

                return `
<defs>
    <linearGradient
        id="cardGradient${index}"
        x1="0"
        y1="0"
        x2="1"
        y2="1"
    >
        <stop
            offset="0%"
            stop-color="${isFirst ? '#211d13' : '#101f3c'}"
        />
        <stop
            offset="100%"
            stop-color="#0b1830"
        />
    </linearGradient>
</defs>

<rect
    x="${cardX}"
    y="${cardY}"
    width="${cardWidth}"
    height="${cardHeight}"
    rx="18"
    fill="url(#cardGradient${index})"
    stroke="${border}"
    stroke-width="${isFirst ? 2 : 1.5}"
/>

${crown}

<circle
    cx="${cardX + 48}"
    cy="${cardY + 46}"
    r="31"
    fill="#071326"
    stroke="${accent}"
    stroke-width="2"
    opacity="0.95"
/>

${avatarIcon}

${rankBadge}

<text
    x="${cardX + 92}"
    y="${cardY + 32}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="16"
    font-weight="700"
    fill="#f8fafc"
>
    ${escapeXml(contributor.login)}
</text>

<text
    x="${cardX + 92}"
    y="${cardY + 52}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="10"
    font-weight="600"
    letter-spacing="1"
    fill="${accent}"
>
    ${label}
</text>

<rect
    x="${cardX + 92}"
    y="${cardY + 65}"
    width="315"
    height="7"
    rx="4"
    fill="#243653"
/>

<rect
    x="${cardX + 92}"
    y="${cardY + 65}"
    width="${progressWidth * 0.79}"
    height="7"
    rx="4"
    fill="${accent}"
/>

<text
    x="${cardX + 430}"
    y="${cardY + 38}"
    text-anchor="end"
    font-family="Arial, Helvetica, sans-serif"
    font-size="18"
    font-weight="700"
    fill="${accent}"
>
    ${percentage}%
</text>
`
            })
            .join('')

        const totalContributions =
            chartData.reduce(
                (sum: number, contributor: any) =>
                    sum + contributor.percentage,
                0
            )

        const svg = `
<svg
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    width="${width}"
    height="${height}"
    viewBox="0 0 ${width} ${height}"
    role="img"
    aria-label="GitHub Contributors"
>

<defs>

    <linearGradient
        id="background"
        x1="0"
        y1="0"
        x2="1"
        y2="1"
    >
        <stop
            offset="0%"
            stop-color="#07142d"
        />
        <stop
            offset="48%"
            stop-color="#0b1b38"
        />
        <stop
            offset="100%"
            stop-color="#10184a"
        />
    </linearGradient>

    <radialGradient
        id="glow"
        cx="50%"
        cy="50%"
        r="50%"
    >
        <stop
            offset="0%"
            stop-color="#2563eb"
            stop-opacity="0.28"
        />
        <stop
            offset="100%"
            stop-color="#2563eb"
            stop-opacity="0"
        />
    </radialGradient>

    <linearGradient
        id="goldAvatar"
        x1="0"
        y1="0"
        x2="1"
        y2="1"
    >
        <stop
            offset="0%"
            stop-color="#fde68a"
        />
        <stop
            offset="100%"
            stop-color="#f59e0b"
        />
    </linearGradient>

    <linearGradient
        id="purpleAvatar"
        x1="0"
        y1="0"
        x2="1"
        y2="1"
    >
        <stop
            offset="0%"
            stop-color="#e9d5ff"
        />
        <stop
            offset="100%"
            stop-color="#9333ea"
        />
    </linearGradient>

    <linearGradient
        id="greenAvatar"
        x1="0"
        y1="0"
        x2="1"
        y2="1"
    >
        <stop
            offset="0%"
            stop-color="#a7f3d0"
        />
        <stop
            offset="100%"
            stop-color="#059669"
        />
    </linearGradient>

    ${chartData
        .map(
            (_: any, index: number) => `
<linearGradient
    id="chartGradient${index}"
    x1="0"
    y1="0"
    x2="1"
    y2="1"
>
    <stop
        offset="0%"
        stop-color="${chartColors[index % chartColors.length]}"
    />
    <stop
        offset="100%"
        stop-color="${chartColors[index % chartColors.length]}"
        stop-opacity="0.65"
    />
</linearGradient>
`
        )
        .join('')}

    <filter
        id="shadow"
        x="-30%"
        y="-30%"
        width="160%"
        height="160%"
    >
        <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="12"
            flood-color="#000000"
            flood-opacity="0.35"
        />
    </filter>

    <filter
        id="softGlow"
        x="-50%"
        y="-50%"
        width="200%"
        height="200%"
    >
        <feGaussianBlur
            stdDeviation="8"
            result="blur"
        />
        <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
        </feMerge>
    </filter>

</defs>

<rect
    width="${width}"
    height="${height}"
    rx="28"
    fill="url(#background)"
/>

<circle
    cx="80"
    cy="120"
    r="180"
    fill="url(#glow)"
/>

<circle
    cx="850"
    cy="510"
    r="200"
    fill="url(#glow)"
/>

<path
    d="M0 475
       C180 430 290 520 430 485
       C610 440 700 510 900 430
       L900 560
       L0 560 Z"
    fill="#111b52"
    opacity="0.5"
/>

<circle
    cx="48"
    cy="54"
    r="22"
    fill="#f8fafc"
    opacity="0.95"
/>

<path
    d="M35 50
       C35 39 61 38 62 50
       C62 60 51 67 48 69
       C45 67 35 60 35 50 Z"
    fill="#0b1830"
/>

<text
    x="84"
    y="58"
    font-family="Arial, Helvetica, sans-serif"
    font-size="30"
    font-weight="700"
    fill="#f8fafc"
>
    Contributors
</text>

<text
    x="86"
    y="83"
    font-family="Arial, Helvetica, sans-serif"
    font-size="12"
    fill="#8fa7cf"
>
    Amazing people who make this project better
</text>

<text
    x="820"
    y="55"
    text-anchor="end"
    font-family="Arial, Helvetica, sans-serif"
    font-size="11"
    font-weight="700"
    letter-spacing="1"
    fill="#8fa7cf"
>
    TOGETHER
</text>

<text
    x="820"
    y="76"
    text-anchor="end"
    font-family="Arial, Helvetica, sans-serif"
    font-size="14"
    font-weight="700"
    fill="#a78bfa"
>
    WE BUILD ✦
</text>

<circle
    cx="${chartX}"
    cy="${chartY}"
    r="${radius + 8}"
    fill="none"
    stroke="#14294b"
    stroke-width="4"
/>

${slices}

<circle
    cx="${chartX}"
    cy="${chartY}"
    r="${innerRadius}"
    fill="#09172f"
    stroke="#14294b"
    stroke-width="3"
/>

<text
    x="${chartX}"
    y="${chartY - 12}"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="11"
    font-weight="600"
    fill="#8fa7cf"
>
    TOTAL
</text>

<text
    x="${chartX}"
    y="${chartY + 17}"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="27"
    font-weight="700"
    fill="#f8fafc"
>
    ${totalContributions.toFixed(0)}%
</text>

<text
    x="${chartX}"
    y="${chartY + 39}"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="10"
    fill="#7188ad"
>
    contribution share
</text>

${cards}

<text
    x="48"
    y="526"
    font-family="Arial, Helvetica, sans-serif"
    font-size="11"
    fill="#7f96bb"
>
    Open Source
</text>

<circle
    cx="126"
    cy="522"
    r="2"
    fill="#64748b"
/>

<text
    x="138"
    y="526"
    font-family="Arial, Helvetica, sans-serif"
    font-size="11"
    fill="#7f96bb"
>
    Build Together
</text>

<text
    x="850"
    y="526"
    text-anchor="end"
    font-family="Arial, Helvetica, sans-serif"
    font-size="10"
    font-weight="600"
    letter-spacing="1"
    fill="#516a94"
>
    GITHUB CONTRIBUTORS
</text>

<path
    d="M820 500 l6 12 l12 6 l-12 6 l-6 12 l-6-12 l-12-6 l12-6 Z"
    fill="#38bdf8"
    filter="url(#softGlow)"
/>

<path
    d="M785 510 l4 8 l8 4 l-8 4 l-4 8 l-4-8 l-8-4 l8-4 Z"
    fill="#a855f7"
/>

</svg>
`

        res.setHeader(
            'Content-Type',
            'image/svg+xml; charset=utf-8'
        )

        res.setHeader(
            'Cache-Control',
            'public, max-age=3600'
        )

        res.status(200).send(svg)

    } catch (error) {
        console.error(error)

        res
            .status(500)
            .send('Failed to fetch contributor data')
    }
}
