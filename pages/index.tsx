import { NextPage } from "next"

interface Endpoint {
  name: string
  path: string
  description: string
}

const endpoints: Endpoint[] = [
  { name: "Repository View Count", path: "/ghrvc", description: "Shows total repository view count as a badge." },
  { name: "Profile View Count", path: "/ghpvc", description: "Displays your GitHub profile visit count." },
  { name: "Followers Count", path: "/ghflwcnt", description: "Returns your total GitHub followers count." },
  { name: "Fork Count", path: "/ghfc", description: "Displays total fork count for a repository." },
  { name: "Star Count", path: "/ghsc", description: "Displays total star count for a repository." },
]

const Home: NextPage = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            ⚙️ GitHub Function Index
          </h1>
          <p className="text-gray-600">
            A list of available GitHub-based endpoints deployed on Vercel.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {endpoints.map((ep) => (
            <a
              key={ep.path}
              href={ep.path}
              className="p-5 bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col group"
            >
              <h2 className="text-lg font-semibold mb-2 text-blue-600 group-hover:text-blue-700">
                {ep.name}
              </h2>
              <p className="text-sm text-gray-600 flex-grow">{ep.description}</p>
              <code className="mt-3 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {ep.path}
              </code>
            </a>
          ))}
        </section>

        <footer className="text-center text-sm text-gray-500 mt-10">
          Built with ❤️ using TypeScript & Vercel •{" "}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            GitHub
          </a>
        </footer>
      </div>
    </main>
  )
}

export default Home
