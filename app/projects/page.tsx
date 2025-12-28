export const metadata = {
  title: "Projects | Skimagination",
  description:
    "Explore our featured projects including system design, analytics platforms, AI-based solutions, and full-stack web applications.",
};

const projects = [
  {
    title: "SMART – Smart Monitoring & Response System",
    category: "AI + Safety Platform",
    description:
      "SMART is an intelligent monitoring and response system designed to enhance tourist safety using real-time tracking, AI-based risk detection, and verified service providers.",
    features: [
      "Real-time location monitoring",
      "AI-based emergency prediction",
      "Identity-verified guides and agents",
      "Secure and encrypted data handling",
      "SOS and rapid response mechanism",
    ],
    tech: ["Next.js", "MongoDB", "NextAuth", "AI Models"],
    status: "Active Development",
  },
  {
    title: "Analytics Dashboard Platform",
    category: "Data Analytics",
    description:
      "A comprehensive analytics platform that visualizes system performance, user engagement, and growth metrics to support data-driven decisions.",
    features: [
      "User growth tracking",
      "Engagement and retention metrics",
      "Performance monitoring",
      "Security and risk insights",
      "Predictive analytics",
    ],
    tech: ["React", "Next.js", "Tailwind CSS"],
    status: "Completed",
  },
  {
    title: "User Profile & Content System",
    category: "Full Stack Web App",
    description:
      "A modular user management and content platform with authentication, profile customization, and media upload capabilities.",
    features: [
      "Secure authentication (JWT)",
      "Profile editing and privacy controls",
      "Image upload support",
      "Role-based access readiness",
    ],
    tech: ["Next.js", "MongoDB", "Cloudinary"],
    status: "Live",
  },
  {
    title: "AI Behavior Analysis Engine",
    category: "Artificial Intelligence",
    description:
      "An experimental AI engine designed to analyze user behavior patterns and predict potential risks or anomalies in real-time.",
    features: [
      "Behavior pattern analysis",
      "Anomaly detection",
      "Predictive alerts",
      "Scalable model architecture",
    ],
    tech: ["Python", "Machine Learning", "Data Analytics"],
    status: "Research Phase",
  },
];

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-slate-100 px-6 py-16">
      <div className="max-w-7xl mx-auto space-y-16">

        {/* ================= HEADER ================= */}
        <section className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Our Projects
          </h1>
          <p className="text-gray-400 max-w-3xl mx-auto text-lg">
            This page highlights the major projects developed under
            Skimagination, showcasing system design, technical implementation,
            and innovative problem-solving approaches.
          </p>
        </section>

        {/* ================= PROJECT LIST ================= */}
        <section className="space-y-10">
          {projects.map((project, index) => (
            <div
              key={index}
              className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-lg shadow-lg"
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
                <h2 className="text-2xl font-bold text-blue-400">
                  {project.title}
                </h2>
                <span className="text-sm px-3 py-1 rounded-full bg-white/10 text-gray-300">
                  {project.status}
                </span>
              </div>

              <p className="text-sm text-purple-400 mb-3">
                {project.category}
              </p>

              <p className="text-gray-300 leading-relaxed mb-4">
                {project.description}
              </p>

              {/* Features */}
              <div className="mb-4">
                <h3 className="font-semibold text-emerald-400 mb-2">
                  Key Features
                </h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  {project.features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>
              </div>

              {/* Technologies */}
              <div>
                <h3 className="font-semibold text-cyan-400 mb-2">
                  Technologies Used
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((tech, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* ================= FOOTER ================= */}
        <footer className="text-center text-sm text-gray-500 pt-8">
          © {new Date().getFullYear()} Skimagination. Projects Overview.
        </footer>

      </div>
    </div>
  );
}
