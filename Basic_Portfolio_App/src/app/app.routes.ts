import { Routes } from '@angular/router';
import { SearchLayoutComponent } from './public/search-layout/search-layout.component';
import { PortfolioLayoutComponent } from './public/portfolio-layout/portfolio-layout.component';

export const routes: Routes = [
    { path: '', redirectTo: '/search', pathMatch: 'full' },
    { path: 'search', component: SearchLayoutComponent },
    { path: 'home', redirectTo: '/portfolio', pathMatch: 'full' },
    { path: 'portfolio', component: PortfolioLayoutComponent }
];