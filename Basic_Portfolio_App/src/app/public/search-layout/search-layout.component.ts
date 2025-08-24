import { Component, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StockService, StockData } from '../../services/stock.service';
import { PortfolioService } from '../../services/portfolio.service';

@Component({
  selector: 'app-search-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './search-layout.component.html',
  styleUrl: './search-layout.component.scss'
})
export class SearchLayoutComponent {
  private stockService = inject(StockService);
  private portfolioService = inject(PortfolioService);
  private snackBar = inject(MatSnackBar);
  
  searchQuery: string = '';
  isLoading: boolean = false;
  searchResults: StockData | null = null;
  stockMetrics: any = null;
  error: string = '';

  onSearch() {
    if (!this.searchQuery.trim()) {
      this.error = 'Please enter a search term';
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.searchResults = null;
    this.stockMetrics = null;

    this.stockService.searchStock(this.searchQuery).subscribe({
      next: (data: StockData) => {
        this.searchResults = data;
        this.stockMetrics = this.stockService.extractStockMetrics(data);
        this.isLoading = false;
      },
      error: (error: Error) => {
        this.error = error.message || 'Failed to fetch data. Please try again.';
        this.isLoading = false;
        console.error('Search error:', error);
      }
    });
  }

  addToPortfolio() {
    if (!this.stockMetrics) {
      return;
    }

    const success = this.portfolioService.addToPortfolio(this.stockMetrics);
    
    if (success) {
      this.snackBar.open(
        `${this.stockMetrics.symbol} added to portfolio!`, 
        'Close', 
        { duration: 3000 }
      );
    } else {
      this.snackBar.open(
        `${this.stockMetrics.symbol} is already in your portfolio!`, 
        'Close', 
        { duration: 3000 }
      );
    }
  }

  isInPortfolio(): boolean {
    return this.stockMetrics ? 
      this.portfolioService.isInPortfolio(this.stockMetrics.symbol) : 
      false;
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = null;
    this.stockMetrics = null;
    this.error = '';
  }
}