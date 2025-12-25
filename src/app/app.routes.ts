import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'incidents', pathMatch: 'full' },
  {
    path: 'incidents',
    loadComponent: () =>
      import('./features/incidents/incidents.component').then((m) => m.IncidentsComponent),
  },
  {
    path: 'map',
    loadComponent: () =>
      import('./features/map/kitchen-map.component').then((m) => m.KitchenMapComponent),
  },
];
