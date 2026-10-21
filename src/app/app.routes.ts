import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Weather-adjusted reorder demo · WillaWave',
    loadComponent: () => import('./simulator/simulator').then((m) => m.Simulator),
  },
  {
    path: '404',
    title: 'Page not found · WillaWave',
    loadComponent: () => import('./not-found/not-found').then((m) => m.NotFound),
  },
  // Unknown in-app navigation lands on the 404 page. Unknown URLs loaded
  // directly get Hosting's 404.html (see scripts/postbuild.mjs).
  { path: '**', redirectTo: '404' },
];
