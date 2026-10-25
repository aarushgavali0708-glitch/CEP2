import confetti from 'canvas-confetti';

export function triggerConfetti() {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: [getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()],
    });
  } catch (err) {
    console.error('Confetti error:', err);
  }
}
