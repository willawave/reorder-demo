import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Weather-adjusted reorder demo · WillaWave',
    loadComponent: () => import('./simulator/simulator').then((m) => m.Simulator),
  },
];
