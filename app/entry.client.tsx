import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

console.log('Client hydration starting...');

startTransition(() => {
  try {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>
    );
    console.log('Client hydration completed successfully');
  } catch (error) {
    console.error('Client hydration failed:', error);
  }
});
