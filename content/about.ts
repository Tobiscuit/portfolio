/**
 * The about page's narrative (spec 003, section 8). Plain data, reviewed in
 * PRs. Sources for each fact: specs/003-juanramirez-codes/plan.md section 6.
 * Decisions that shape it: D6 (the employer is not named), D7 (only verified
 * credentials; coursework, never a degree), D8 (no résumé link yet).
 */

export const ABOUT = {
  lede: "I'm a self-taught software engineer. I don't have a degree; I learned by building and by reading the books the field is built on, and I'm looking for a software engineering role.",
  story: [
    "I work as a technology specialist at a computer repair shop. I started on the bench and ended up writing the shop's tools: a check-in that starts from a USB stick, and an agent that lets an AI model propose diagnostics while a technician approves every step.",
    "Before that I built websites for small businesses as an independent contractor. Most of those engagements ended before launch. Proprietor Systems grew out of that work: one platform that runs a business's site, blog, inquiries and inbox.",
    "Underneath all of it is a server I run myself: Kubernetes, reconciled from git, with its secrets in Vault and its backups off the machine.",
  ],
  howIBuild: [
    {
      title: "Spec first",
      body: "Each feature starts as a written spec: what and why, the domain model, the decisions with my recommendation, then test-first slices. Proprietor's engine has 28 of them.",
    },
    {
      title: "Private by default",
      body: "The engine and its AI agents have no public address. Sites and the dashboard reach them only over service bindings: Cloudflare's version of application servers in a private network.",
    },
    {
      title: "Honest limits",
      body: "Five locks keep one business's data from another's, and all five trust the first: the docs say so. The encrypted inbox's README states what the operator can still see.",
    },
    {
      title: "Models inside fences",
      body: "Model output arrives as schema-checked blocks the platform renders and escapes. An agent's tool list is the ceiling of what it can do, and a person approves each step that touches a customer's machine.",
    },
  ],
  credentials: {
    earned: ["AWS Certified Cloud Practitioner"],
    studying: ["AWS Certified Solutions Architect – Professional", "CompTIA CySA+, PenTest+ and SecurityX", "Discrete mathematics"],
  },
  education: [
    { where: "University of Houston", what: "Coursework in Computer Information Systems", when: "2016–2018" },
    { where: "Houston Community College", what: "Coursework in computer systems and network administration", when: "2013–2015" },
    { where: "Zero To Mastery", what: "Software engineering courses", when: "2020–2021" },
  ],
  reading: [
    { title: "Fundamentals of Software Architecture", author: "Mark Richards and Neal Ford" },
    { title: "Software Architecture: The Hard Parts", author: "Neal Ford, Mark Richards, Pramod Sadalage and Zhamak Dehghani" },
    { title: "Designing Data-Intensive Applications", author: "Martin Kleppmann" },
    { title: "Advanced Algorithms and Data Structures", author: "Marcello La Rocca" },
    { title: "AI Engineering", author: "Chip Huyen" },
    { title: "Grokking Algorithms", author: "Aditya Bhargava" },
  ],
} as const;
