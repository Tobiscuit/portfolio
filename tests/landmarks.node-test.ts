/**
 * Every page renders inside one <main> with a skip link, a header and a
 * footer (all from the layout), and has exactly one <h1>.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { count, maxNesting, read, render, tags } from './helpers'
import Header from '../app/components/Header'
import SiteFooter from '../app/components/SiteFooter'
import ProjectDetailsView from '../app/components/ProjectDetailsView'
import ProjectCard from '../app/components/ProjectCard'
import About from '../app/(app)/about/page'
import Contact from '../app/(app)/contact/page'
import type { Project } from '../app/lib/types'

test('root layout owns the landmarks and the skip link', () => {
  const layout = read('app/(app)/layout.tsx')
  assert.ok(layout.indexOf('<main id="main"') > -1, 'main#main')
  assert.ok(layout.indexOf('href="#main"') > -1, 'skip link targets main')
  assert.ok(layout.indexOf('className="skip-link"') > -1)
  assert.ok(layout.indexOf('href="#main"') < layout.indexOf('<Header '), 'skip link comes first')
  assert.ok(layout.indexOf('<Header ') > -1)
  assert.ok(layout.indexOf('<Footer />') > -1, 'the platform footer, which renders SiteFooter')
  assert.ok(layout.indexOf('lang="en"') > -1)
  assert.ok(!/maximumScale\s*:/.test(layout), 'pinch zoom must stay enabled (WCAG 1.4.4)')
  assert.ok(!/userScalable\s*:/.test(layout), 'pinch zoom must stay enabled (WCAG 1.4.4)')
})

test('pages never render their own <main> and declare exactly one h1', () => {
  const files = [
    'app/(app)/page.tsx',
    'app/(app)/about/page.tsx',
    'app/(app)/projects/page.tsx',
    'app/(app)/projects/[id]/page.tsx',
    'app/(app)/contact/page.tsx',
    'app/components/ProjectDetailsView.tsx',
  ]
  for (const file of files) {
    const src = read(file)
    assert.equal(count(src, '<main'), 0, file + ' must not render <main>')
    const h1s = count(src, '<h1') + count(src, 'as="h1"')
    assert.equal(h1s, 1, file + ' should declare exactly one h1 (found ' + h1s + ')')
  }
})

test('header: banner, primary nav with aria-current, popover menu, theme toggle, résumé dialog', () => {
  const html = render(createElement(Header), '/about')
  assert.equal(count(html, '<header'), 1)
  assert.ok(html.indexOf('aria-label="Primary"') > -1)
  const current = tags(html, 'a').filter((a) => a['aria-current'] === 'page')
  assert.ok(current.length >= 1, 'current page is marked')
  assert.ok(current.every((a) => a.href === '/about'), 'only /about is marked current')
  assert.ok(html.indexOf('popover="auto"') > -1, 'mobile menu is a popover')
  // React writes popoverTarget; attribute names are case-insensitive in HTML.
  const menuButton = tags(html, 'button').filter((b) => b.popovertarget === 'site-menu')
  assert.equal(menuButton.length, 1, 'menu button targets the popover')
  assert.ok(menuButton[0]['aria-label'], 'menu button has an accessible name')
  assert.ok(tags(html, 'nav').some((n) => n.id === 'site-menu' && n.popover === 'auto'), 'menu is an auto popover')
  assert.ok(html.indexOf('class="theme-toggle"') > -1)
  assert.ok(html.indexOf('Switch to light theme') > -1 && html.indexOf('Switch to dark theme') > -1)
  assert.ok(html.indexOf('<dialog') > -1, 'résumé viewer is a native dialog')
  assert.ok(html.indexOf('closedby="any"') > -1)
  assert.ok(html.indexOf('<iframe') === -1, 'the PDF is not loaded until the dialog opens')
})

test('header keeps the same destinations as before', () => {
  const html = render(createElement(Header), '/')
  for (const href of ['href="/"', 'href="/projects"', 'href="/about"', 'href="/contact"', 'href="/JuanRamirez-Resume-September-2025.pdf"']) {
    assert.ok(html.indexOf(href) > -1, href)
  }
})

test('footer: contentinfo with footer nav, email and LinkedIn', () => {
  const html = render(createElement(SiteFooter))
  assert.equal(count(html, '<footer'), 1)
  assert.ok(html.indexOf('aria-label="Footer"') > -1)
  assert.ok(html.indexOf('href="mailto:jramirez203@outlook.com"') > -1)
  assert.ok(html.indexOf('https://www.linkedin.com/in/cloud-juan-manuel-ramirez/') > -1)
})

test('about and contact render exactly one h1 and no main', () => {
  const pages: [string, ReturnType<typeof createElement>][] = [
    ['about', createElement(About)],
    ['contact', createElement(Contact)],
  ]
  for (const [name, el] of pages) {
    const html = render(el)
    assert.equal(count(html, '<h1'), 1, name + ': one h1')
    assert.equal(count(html, '<main'), 0, name + ': no main')
    assert.equal(count(html, '<aside'), 0, name + ': no stray complementary landmark')
  }
})

const fixture: Project = {
  id: 1,
  title: 'Fixture project',
  description: 'A project used by the tests.',
  features: ['Feature one', 'Feature two'],
  tech: ['TypeScript', 'Next.js', 'Tailwind CSS', 'Vercel'],
  image: '/images/projects/audify/hero.webp',
  url: 'https://example.com/',
  caseStudy: {
    intro: { title: 'Intro', text: 'Intro <strong>text</strong>', image: '/images/projects/weatherwise/arch_diagram_1.png', imageAlt: 'Diagram one' },
    sections: [{ title: 'Section', text: 'Body', list: ['<em>one</em>', 'two'] }],
    conclusion: { title: 'Conclusion', text: 'Done.' },
  },
}

test('project detail: one h1 inside an article, shared view-transition name, zoomable figures', () => {
  const html = render(createElement(ProjectDetailsView, { project: fixture }), '/projects/1')
  assert.equal(count(html, '<h1'), 1)
  assert.ok(/<article[^>]*aria-labelledby="project-title"/.test(html))
  assert.ok(html.indexOf('id="project-title"') > html.indexOf('<article'), 'h1 is inside the article')
  assert.ok(html.indexOf('view-transition-name:project-1') > -1, 'hero carries the view-transition-name')
  assert.ok(html.indexOf('aria-label="View larger: Diagram one"') > -1, 'figure opens the zoom viewer')
  assert.ok(html.indexOf('<figcaption') > -1, 'alt text becomes a visible caption')
  assert.ok(html.indexOf('Intro <strong>text</strong>') > -1, 'case-study HTML is still rendered')
  assert.ok(html.indexOf('href="https://example.com/"') > -1, 'external link unchanged')
  assert.equal(maxNesting(html, 'a'), 1, 'no nested anchors')
  assert.equal(maxNesting(html, 'button'), 1, 'no nested buttons')
})

test('project card: one link to the detail page, same view-transition name, external link outside it', () => {
  const html = render(createElement('ul', null, createElement(ProjectCard, { project: fixture })), '/projects')
  assert.ok(/<a[^>]*href="\/projects\/1"/.test(html))
  assert.ok(html.indexOf('view-transition-name:project-1') > -1)
  assert.ok(/<a[^>]*href="https:\/\/example.com\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/.test(html))
  assert.equal(maxNesting(html, 'a'), 1, 'no nested anchors')
  assert.ok(html.indexOf('<h2') > -1, 'card title is a heading')
  assert.ok(html.indexOf('+1') > -1, 'extra tech collapses into a +N chip')
})
