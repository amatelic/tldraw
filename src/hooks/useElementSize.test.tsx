import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { useElementSize } from './useElementSize';

interface ResizeObserverEntryLike {
  target: Element;
  contentRect: DOMRectReadOnly;
}

let resizeObserverCallback: ((
  entries: ResizeObserverEntryLike[],
  observer: ResizeObserver
) => void) | null = null;

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(
    callback: (entries: ResizeObserverEntryLike[], observer: ResizeObserver) => void
  ) {
    resizeObserverCallback = callback;
  }
}

interface TestHarnessProps {
  width: number;
  height: number;
}

function TestHarness({ width, height }: TestHarnessProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const size = useElementSize(ref);

  return (
    <>
      <div ref={ref} data-testid="target" data-width={width} data-height={height} />
      <output data-testid="size">{`${size.width}x${size.height}`}</output>
    </>
  );
}

function triggerObservedResize(target: Element) {
  if (!resizeObserverCallback) {
    throw new Error('ResizeObserver callback not registered');
  }

  resizeObserverCallback(
    [
      {
        target,
        contentRect: target.getBoundingClientRect(),
      },
    ],
    new ResizeObserverMock(() => {}) as unknown as ResizeObserver
  );
}

describe('useElementSize', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      const element = this as HTMLElement;
      const width = Number(element.dataset.width ?? 0);
      const height = Number(element.dataset.height ?? 0);

      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: height,
        right: width,
        width,
        height,
        toJSON: () => ({}),
      } as DOMRect;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resizeObserverCallback = null;
  });

  it('reads the initial element size after mount', () => {
    render(<TestHarness width={640} height={480} />);

    expect(screen.getByTestId('size')).toHaveTextContent('640x480');
  });

  it('updates when the observed element is resized', () => {
    const { rerender } = render(<TestHarness width={640} height={480} />);
    const target = screen.getByTestId('target');

    rerender(<TestHarness width={960} height={540} />);

    act(() => {
      triggerObservedResize(target);
    });

    expect(screen.getByTestId('size')).toHaveTextContent('960x540');
  });

  it('falls back to window resize events when ResizeObserver is unavailable', () => {
    vi.unstubAllGlobals();
    resizeObserverCallback = null;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      const element = this as HTMLElement;
      const width = Number(element.dataset.width ?? 0);
      const height = Number(element.dataset.height ?? 0);

      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: height,
        right: width,
        width,
        height,
        toJSON: () => ({}),
      } as DOMRect;
    });

    const { rerender } = render(<TestHarness width={300} height={200} />);

    rerender(<TestHarness width={500} height={320} />);

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByTestId('size')).toHaveTextContent('500x320');
  });
});
