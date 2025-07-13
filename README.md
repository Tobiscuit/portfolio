# SageScale Portfolio

A modern portfolio website built with Next.js, TypeScript, and Tailwind CSS.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **Modern Stack**: Next.js 14 with TypeScript and Tailwind CSS
- **Responsive Design**: Mobile-first approach with beautiful layouts
- **Contact Form**: Functional contact form with API integration
- **Project Gallery**: Showcase of design projects
- **SEO Optimized**: Built-in Next.js SEO features

## Project Structure

```
├── app/
│   ├── components/     # Reusable components
│   ├── api/           # API routes
│   ├── about/         # About page
│   ├── projects/      # Projects page
│   ├── contact/       # Contact page
│   └── globals.css    # Global styles
├── public/            # Static assets
└── ...config files
```

## Deployment

Deploy easily on Vercel:

```bash
npm run build
```

## Customization

- Update colors in `tailwind.config.ts`
- Modify global styles in `app/globals.css`
- Add new pages in the `app/` directory
- Customize components in `app/components/`