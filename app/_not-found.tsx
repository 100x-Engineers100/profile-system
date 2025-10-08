'use client';

import { Suspense } from 'react';

export default function NotFound() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>
        <h2>Not Found</h2>
        <p>Could not find requested resource</p>
      </div>
    </Suspense>
  );
}