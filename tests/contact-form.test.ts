/**
 * The contact form's behaviour is frozen: the same state, the same payload to
 * the same endpoint, the same response handling and messages, the same field
 * names, ids and validation attributes. The redesign may restyle the form and
 * change copy around it, nothing inside its logic.
 *
 * tests/fixtures/contact-form-logic.txt is copied verbatim from origin/main.
 * A deliberate behaviour change (e.g. PR #1 adding a Turnstile token to the
 * payload) updates that fixture in the same commit, so the change is explicit.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { count, read, render, tags } from './helpers'
import Contact from '../app/(app)/contact/page'

const source = read('app/(app)/contact/page.tsx')

function logicBlock(src: string): string {
  const start = src.indexOf('  const [formData, setFormData] = useState({')
  const change = src.indexOf('  const handleChange', start)
  const end = src.indexOf('\n  }\n', change)
  assert.ok(start > -1 && change > start && end > change, 'contact page logic block not found')
  return src.slice(start, end + '\n  }'.length)
}

test('state, submit and change handlers are byte-for-byte identical to main', () => {
  const frozen = read('tests/fixtures/contact-form-logic.txt').replace(/\n$/, '')
  assert.equal(logicBlock(source), frozen)
})

test('the frozen block posts JSON to /api/contact and keeps every message', () => {
  // Guards the fixture itself against being edited into something meaningless.
  const frozen = read('tests/fixtures/contact-form-logic.txt')
  for (const snippet of [
    "fetch('/api/contact', {",
    "method: 'POST',",
    "'Content-Type': 'application/json',",
    'body: JSON.stringify(formData),',
    "_gotcha: ''",
    "setErrorMessage(body?.error ?? 'Failed to send message. Please try again.')",
    "setErrorMessage('Could not reach the server. Please try again.')",
    "setFormData({ name: '', email: '', message: '', _gotcha: '' })",
  ]) {
    assert.ok(frozen.indexOf(snippet) > -1, 'fixture missing: ' + snippet)
  }
})

test('status messages and the submit label are unchanged', () => {
  for (const snippet of [
    'Message sent successfully!',
    "{isSubmitting ? 'Sending...' : 'Send Message'}",
    "{submitStatus === 'success' && (",
    "{submitStatus === 'error' && (",
    '{errorMessage}',
    'onSubmit={handleSubmit}',
    'disabled={isSubmitting}',
  ]) {
    assert.ok(source.indexOf(snippet) > -1, 'missing: ' + snippet)
  }
})

test('renders the same controls: ids, names, types, required, autocomplete, honeypot', () => {
  const html = render(createElement(Contact), '/contact')
  assert.equal(count(html, '<form'), 1, 'exactly one form')

  const byName: Record<string, Record<string, string>> = {}
  tags(html, 'input').forEach((attrs) => {
    byName[attrs.name] = attrs
  })
  assert.deepEqual(Object.keys(byName).sort(), ['_gotcha', 'email', 'name'])

  assert.equal(byName.name.id, 'name')
  assert.equal(byName.name.type, 'text')
  assert.equal(byName.name.autocomplete, 'name')
  assert.ok('required' in byName.name)

  assert.equal(byName.email.id, 'email')
  assert.equal(byName.email.type, 'email')
  assert.equal(byName.email.autocomplete, 'email')
  assert.ok('required' in byName.email)

  assert.equal(byName._gotcha.type, 'text')
  assert.equal(byName._gotcha.tabindex, '-1')
  assert.equal(byName._gotcha['aria-hidden'], 'true')
  assert.equal(byName._gotcha.autocomplete, 'off')

  const textareas = tags(html, 'textarea')
  assert.equal(textareas.length, 1, 'exactly one textarea')
  assert.equal(textareas[0].id, 'message')
  assert.equal(textareas[0].name, 'message')
  assert.equal(textareas[0].rows, '6')
  assert.ok('required' in textareas[0])

  for (const id of ['name', 'email', 'message']) {
    assert.ok(html.indexOf('for="' + id + '"') > -1, 'label for ' + id)
  }

  const submit = tags(html, 'button').filter((b) => b.type === 'submit')
  assert.equal(submit.length, 1, 'one submit button')
  assert.ok(html.indexOf('>Send Message</button>') > -1)
})

test('the form keeps its JSX skeleton so PR #1 (Turnstile) merges cleanly', () => {
  // Same wrapper order as main: honeypot, three label+control groups, submit div, two status lines.
  const form = source.slice(source.indexOf('<form'), source.indexOf('</form>'))
  const order = ['name="_gotcha"', 'htmlFor="name"', 'id="name"', 'htmlFor="email"', 'id="email"', 'htmlFor="message"', 'id="message"', 'type="submit"', "submitStatus === 'success'", "submitStatus === 'error'"]
  let last = -1
  for (const marker of order) {
    const at = form.indexOf(marker)
    assert.ok(at > last, marker + ' out of order')
    last = at
  }
})
