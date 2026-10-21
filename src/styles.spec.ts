import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * Drift guard for the deliberately duplicated dark palette.
 *
 * styles.css declares the dark tokens twice: once under
 * `@media (prefers-color-scheme: dark)` for the OS preference, once under
 * `:root[data-theme='dark']` for an explicit choice. `light-dark()` would
 * collapse them, but an unsupported browser would invalidate every token and
 * render the page unstyled, so duplication is the deliberate trade.
 *
 * Duplication only stays safe if something notices when the copies diverge.
 * That is this file. Without it, someone tunes a contrast ratio in one block
 * and ships a page whose OS-dark and toggle-dark look different.
 */
function declarations(block: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const [, name, value] of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    found.set(name!, value!.trim());
  }
  return found;
}

describe('styles.css dark palette', () => {
  const css = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');

  const systemDark = css.match(
    /@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme='light'\]\) \{([\s\S]*?)\n {2}\}/,
  )?.[1];
  const explicitDark = css.match(/:root\[data-theme='dark'\] \{([\s\S]*?)\n\}/)?.[1];

  it('should declare both dark blocks', () => {
    // If either regex stops matching, the blocks were restructured and the
    // comparison below would vacuously pass. Fail loudly instead.
    expect(systemDark).toBeDefined();
    expect(explicitDark).toBeDefined();
  });

  it('should keep the two dark blocks identical', () => {
    const system = declarations(systemDark ?? '');
    const explicit = declarations(explicitDark ?? '');

    expect(system.size).toBeGreaterThan(10);
    expect([...explicit.keys()].sort()).toEqual([...system.keys()].sort());
    for (const [name, value] of system) {
      expect(`${name}: ${explicit.get(name)}`).toBe(`${name}: ${value}`);
    }
  });

  it('should guard the system-dark block against an explicit light choice', () => {
    // Without :not([data-theme='light']) the media query beats an explicit
    // light choice, and a visitor who picked light on a dark OS gets dark.
    expect(css).toContain(":root:not([data-theme='light'])");
  });
});
