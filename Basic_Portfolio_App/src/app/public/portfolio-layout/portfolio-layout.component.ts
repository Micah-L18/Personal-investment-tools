import { Component, inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { PortfolioService, PortfolioStock } from '../../services/portfolio.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-portfolio-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatTooltipModule,
    RouterModule
  ],
  templateUrl: './portfolio-layout.component.html',
  styleUrl: './portfolio-layout.component.scss'
})
export class PortfolioLayoutComponent implements OnInit, AfterViewInit {
  private portfolioService = inject(PortfolioService);
  private snackBar = inject(MatSnackBar);

  @ViewChild(MatSort) sort!: MatSort;

  portfolio$: Observable<PortfolioStock[]>;
  portfolioStats: any = {};
  displayedColumns: string[] = ['symbol', 'name', 'currentPrice', 'quantity', 'avgCost', 'equity', 'percentChange', 'actions'];
  editingStock: string | null = null;
  dataSource = new MatTableDataSource<PortfolioStock>([]);
  isUpdatingPrices = false;

  constructor() {
    this.portfolio$ = this.portfolioService.getPortfolio();
  }

  ngOnInit() {
    this.updateStats();
    this.portfolio$.subscribe((portfolio) => {
      this.updateStats();
      this.dataSource.data = portfolio;
    });
    
    // Update live prices when the page loads with feedback
    const currentPortfolio = this.portfolioService.getCurrentPortfolio();
    const hasStocks = currentPortfolio.some(stock => !stock.isCash);
    
    if (hasStocks) {
      this.isUpdatingPrices = true;
      this.snackBar.open(
        'Loading current stock prices...', 
        'Close', 
        { duration: 2000 }
      );
      
      this.portfolioService.getLiveValue();
      
      // Reset loading state after fetching
      setTimeout(() => {
        this.isUpdatingPrices = false;
      }, 3000);
    }
  }  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    
    // Set default sort to equity descending
    this.sort.sort({ id: 'equity', start: 'desc', disableClear: false });
    
    // Custom sorting function that always keeps cash at the top
    this.dataSource.sortData = (data: PortfolioStock[], sort: MatSort) => {
      if (!sort.active || sort.direction === '') {
        return data;
      }

      return data.sort((a, b) => {
        // Always keep cash at the top
        if (a.isCash && !b.isCash) return -1;
        if (!a.isCash && b.isCash) return 1;
        if (a.isCash && b.isCash) return 0;

        // For non-cash items, sort normally
        const isAsc = sort.direction === 'asc';
        let valueA = this.getSortValue(a, sort.active);
        let valueB = this.getSortValue(b, sort.active);

        return this.compare(valueA, valueB, isAsc);
      });
    };
  }

  private getSortValue(item: PortfolioStock, property: string): any {
    switch (property) {
      case 'equity':
        return this.calculateEquity(item);
      case 'percentChange':
        return this.calculatePercentChange(item);
      case 'symbol':
        return item.symbol;
      case 'currentPrice':
        return item.currentPrice;
      case 'quantity':
        return item.shares || 0;
      case 'avgCost':
        return item.avgCost || 0;
      case 'name':
        return item.name;
      default:
        return (item as any)[property];
    }
  }

  private compare(a: number | string, b: number | string, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  removeFromPortfolio(symbol: string, name: string) {
    if (symbol === 'CASH') {
      this.snackBar.open(
        'Cash position cannot be removed!', 
        'Close', 
        { duration: 3000 }
      );
      return;
    }
    
    this.portfolioService.removeFromPortfolio(symbol);
    this.snackBar.open(
      `${symbol} removed from portfolio!`, 
      'Close', 
      { duration: 3000 }
    );
  }

  clearPortfolio() {
    this.portfolioService.clearPortfolio();
    this.snackBar.open(
      'Portfolio cleared!', 
      'Close', 
      { duration: 3000 }
    );
  }

  startEditing(symbol: string) {
    this.editingStock = symbol;
  }

  cancelEditing() {
    this.editingStock = null;
  }

  saveStock(stock: PortfolioStock) {
    if (stock.isCash) {
      // For cash, only update the amount (shares field represents cash amount)
      const success = this.portfolioService.updateCashPosition(stock.shares || 0);
      if (success) {
        this.editingStock = null;
        this.snackBar.open(
          'Cash position updated successfully!', 
          'Close', 
          { duration: 3000 }
        );
      }
    } else {
      // For stocks, update shares and average cost
      if (stock.shares !== undefined && stock.avgCost !== undefined) {
        const success = this.portfolioService.updateStockPosition(
          stock.symbol, 
          stock.shares, 
          stock.avgCost
        );
        
        if (success) {
          this.editingStock = null;
          this.snackBar.open(
            `${stock.symbol} updated successfully!`, 
            'Close', 
            { duration: 3000 }
          );
        }
      }
    }
  }

  calculateEquity(stock: PortfolioStock): number {
    if (!stock.shares || stock.shares === 0) return 0;
    if (stock.isCash) return stock.shares; // For cash, equity equals the amount
    return stock.currentPrice * stock.shares;
  }

  calculatePercentChange(stock: PortfolioStock): number {
    if (stock.isCash) return 0; // Cash doesn't have price changes
    if (!stock.avgCost || stock.avgCost === 0) return 0;
    return ((stock.currentPrice - stock.avgCost) / stock.avgCost) * 100;
  }

  getPercentChangeColor(percentChange: number): string {
    if (percentChange > 0) return 'green';
    if (percentChange < 0) return 'red';
    return 'black';
  }

  isEditing(symbol: string): boolean {
    return this.editingStock === symbol;
  }

  calculateDayChange(stock: PortfolioStock): number {
    const changePercent = ((stock.currentPrice - stock.dayLow) / stock.dayLow) * 100;
    return isNaN(changePercent) ? 0 : changePercent;
  }

  refreshPrices() {
    this.isUpdatingPrices = true;
    this.portfolioService.getLiveValue();
    
    // Show loading feedback
    this.snackBar.open(
      'Updating stock prices...', 
      'Close', 
      { duration: 2000 }
    );
    
    // Reset loading state after a delay (since getLiveValue is async but doesn't return a promise)
    setTimeout(() => {
      this.isUpdatingPrices = false;
      this.snackBar.open(
        'Stock prices updated!', 
        'Close', 
        { duration: 3000 }
      );
    }, 3000);
  }

  private updateStats() {
    this.portfolioStats = this.portfolioService.getPortfolioStats();
  }
}