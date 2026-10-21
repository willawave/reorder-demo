import { TestBed } from '@angular/core/testing';
import { ThemeToggle } from './theme-toggle';
import { Theme } from './theme';

describe('ThemeToggle', () => {
  const root = document.documentElement;

  async function render() {
    await TestBed.configureTestingModule({ imports: [ThemeToggle] }).compileComponents();
    const fixture = TestBed.createComponent(ThemeToggle);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host, button: host.querySelector('button') };
  }

  beforeEach(() => {
    root.removeAttribute('data-theme');
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    root.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('should render the same markup regardless of the stored theme', async () => {
    // This is the regression guard. The previous version chose its icon from a
    // signal, so prerendered HTML shipped the "system" branch to everyone --
    // verified in the built output: the auto icon plus
    // aria-label="Switch to light theme". Returning visitors then saw the icon
    // and the accessible name change under them after hydration, with no
    // Angular diagnostic. Identical markup means nothing can swap.
    const { host: neutral } = await render();
    const withoutTheme = neutral.innerHTML;

    TestBed.resetTestingModule();
    root.setAttribute('data-theme', 'dark');
    const { host: dark } = await render();

    expect(dark.innerHTML).toBe(withoutTheme);
  });

  it('should carry both icons for CSS to choose between', async () => {
    const { host } = await render();
    expect(host.querySelector('svg.when-light')).not.toBeNull();
    expect(host.querySelector('svg.when-dark')).not.toBeNull();
  });

  it('should name the action in both directions, without an aria-label', async () => {
    const { host, button } = await render();
    // No aria-label: `display: none` excludes the hidden span from the
    // accessible-name computation, so the name is whichever span CSS shows.
    expect(button?.hasAttribute('aria-label')).toBe(false);
    expect(host.querySelector('.sr-only.when-light')?.textContent).toBe('Switch to dark theme');
    expect(host.querySelector('.sr-only.when-dark')?.textContent).toBe('Switch to light theme');
  });

  it('should hide the icons from assistive tech, since the spans carry the name', async () => {
    const { host } = await render();
    for (const svg of host.querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('should toggle the theme when pressed', async () => {
    const { button } = await render();
    button?.click();
    expect(TestBed.inject(Theme).override()).not.toBeNull();
    expect(root.getAttribute('data-theme')).not.toBeNull();
  });

  it('should render enabled, because event replay covers the pre-hydration gap', async () => {
    const { button } = await render();
    // Live in prerendered markup: hydration's event replay queues a press that
    // lands before hydration finishes.
    expect(button?.disabled).toBe(false);
    expect(button?.getAttribute('type')).toBe('button');
  });
});
