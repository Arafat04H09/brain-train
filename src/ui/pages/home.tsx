import { A } from '@solidjs/router';

export function Home() {
  return (
    <div class="container">
      <h1 class="hero">Intellect Forge</h1>
      <p class="muted">Evidence-based cognitive training. Personal build.</p>
      <p><A href="/today">Start today's session →</A></p>
      <p class="muted"><A href="/stimulus-debug">stimulus debug</A></p>
    </div>
  );
}
