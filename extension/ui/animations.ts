// Animation utilities for the Ollama Assistant extension
import { tweened } from "svelte/motion";
import { cubicOut, elasticOut, quintOut } from "svelte/easing";

// Slide transitions
export function slideIn(
  node: HTMLElement,
  { duration = 300, easing = cubicOut } = {}
) {
  return {
    duration,
    easing,
    css: (t: number) => {
      const eased = easing(t);
      return `
        transform: translateY(${(1 - eased) * 20}px);
        opacity: ${eased};
      `;
    },
  };
}

export function slideOut(
  node: HTMLElement,
  { duration = 200, easing = quintOut } = {}
) {
  return {
    duration,
    easing,
    css: (t: number) => {
      const eased = easing(t);
      return `
        transform: translateY(${(1 - eased) * -10}px);
        opacity: ${eased};
      `;
    },
  };
}

// Fade transitions with scale
export function fadeScale(
  node: HTMLElement,
  { duration = 250, easing = cubicOut, scale = 0.95 } = {}
) {
  return {
    duration,
    easing,
    css: (t: number) => {
      const eased = easing(t);
      const currentScale = scale + (1 - scale) * eased;
      return `
        transform: scale(${currentScale});
        opacity: ${eased};
      `;
    },
  };
}

// Bounce in animation for success states
export function bounceIn(
  node: HTMLElement,
  { duration = 400, easing = elasticOut } = {}
) {
  return {
    duration,
    easing,
    css: (t: number) => {
      const eased = easing(t);
      return `
        transform: scale(${eased});
        opacity: ${eased};
      `;
    },
  };
}

// Shake animation for errors
export function shake(node: HTMLElement, { duration = 500 } = {}) {
  return {
    duration,
    css: (t: number) => {
      const shake = Math.sin(t * 10) * (1 - t) * 5;
      return `transform: translateX(${shake}px);`;
    },
  };
}

// Smooth height transition
export function expandHeight(
  node: HTMLElement,
  { duration = 300, easing = cubicOut } = {}
) {
  const originalHeight = node.offsetHeight;

  return {
    duration,
    easing,
    css: (t: number) => {
      const eased = easing(t);
      return `
        height: ${eased * originalHeight}px;
        opacity: ${eased};
        overflow: hidden;
      `;
    },
  };
}

// Typing animation for text
export function typewriter(node: HTMLElement, { duration = 1000 } = {}) {
  const text = node.textContent || "";
  const length = text.length;

  return {
    duration,
    tick: (t: number) => {
      const index = Math.round(length * t);
      node.textContent = text.slice(0, index);
    },
  };
}

// Progress bar animation
export function progressBar(
  node: HTMLElement,
  { duration = 300, easing = cubicOut, from = 0, to = 100 } = {}
) {
  return {
    duration,
    easing,
    css: (t: number) => {
      const eased = easing(t);
      const width = from + (to - from) * eased;
      return `width: ${width}%;`;
    },
  };
}

// Pulse animation for loading states
export function pulse(node: HTMLElement) {
  return {
    duration: 1000,
    css: (t: number) => {
      const opacity = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
      return `opacity: ${opacity};`;
    },
  };
}

// Glow effect for focus states
export function glow(
  node: HTMLElement,
  { color = "#6366f1", intensity = 0.5 } = {}
) {
  return {
    duration: 200,
    css: (t: number) => {
      const glowIntensity = intensity * t;
      return `
        box-shadow: 0 0 ${glowIntensity * 20}px ${color}${Math.round(
        glowIntensity * 255
      ).toString(16)};
        border-color: ${color};
      `;
    },
  };
}

// Stagger animation for lists
export function stagger(
  node: HTMLElement,
  { delay = 50, duration = 300 } = {}
) {
  const children = Array.from(node.children) as HTMLElement[];

  children.forEach((child, i) => {
    child.style.animation = `slideInStagger ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${
      i * delay
    }ms both`;
  });

  // Add keyframes if not already added
  if (!document.querySelector("#stagger-keyframes")) {
    const style = document.createElement("style");
    style.id = "stagger-keyframes";
    style.textContent = `
      @keyframes slideInStagger {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  return {
    duration: duration + (children.length - 1) * delay,
    tick: () => {},
  };
}

// Tweened stores for smooth value changes
export const createProgressStore = (initial = 0) =>
  tweened(initial, { duration: 300, easing: cubicOut });

export const createOpacityStore = (initial = 1) =>
  tweened(initial, { duration: 200, easing: cubicOut });

export const createScaleStore = (initial = 1) =>
  tweened(initial, { duration: 250, easing: elasticOut });
