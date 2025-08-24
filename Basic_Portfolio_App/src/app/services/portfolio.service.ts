import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StockService } from './stock.service';

export interface PortfolioStock {
  symbol: string;
  name: string;
  currentPrice: number;
  currency: string;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  exchange: string;
  addedDate: Date;
  shares?: number;
  avgCost?: number;
  isCash?: boolean; // Flag to identify cash position
}

@Injectable({
  providedIn: 'root'
})

export class PortfolioService {
  private readonly STORAGE_KEY = 'portfolio-stocks';
  private portfolioSubject = new BehaviorSubject<PortfolioStock[]>([]);
  private stockService: StockService;

  constructor(stockService: StockService) {
    this.stockService = stockService;
    this.loadPortfolioFromStorage();
    this.ensureCashPosition();
  }

  /**
   * Ensure cash position exists in portfolio
   */
  private ensureCashPosition(): void {
    const currentPortfolio = this.getCurrentPortfolio();
    const cashExists = currentPortfolio.some(item => item.isCash);
    
    if (!cashExists) {
      const cashPosition: PortfolioStock = {
        symbol: 'CASH',
        name: 'Cash Position',
        currentPrice: 1.0,
        currency: 'USD',
        dayHigh: 1.0,
        dayLow: 1.0,
        fiftyTwoWeekHigh: 1.0,
        fiftyTwoWeekLow: 1.0,
        volume: 0,
        exchange: 'N/A',
        addedDate: new Date(),
        shares: 0,
        avgCost: 1.0,
        isCash: true
      };
      
      const updatedPortfolio = [cashPosition, ...currentPortfolio];
      this.updatePortfolio(updatedPortfolio);
    }
  }

  /**
   * Get portfolio stocks as an observable
   */
  getPortfolio(): Observable<PortfolioStock[]> {
    return this.portfolioSubject.asObservable();
  }

  /**
   * Get current portfolio value
   */
  getCurrentPortfolio(): PortfolioStock[] {
    return this.portfolioSubject.value;
  }

  getLiveValue(): void {
    const currentPortfolio = this.getCurrentPortfolio();
    currentPortfolio.forEach(stock => {
      if (stock.isCash) return; // Skip cash position
      // Fetch live StockData for each stock
      this.stockService.searchStock(stock.symbol).subscribe({
        next: (data: any) => {
          const metrics = this.stockService.extractStockMetrics(data);
          stock.currentPrice = metrics.currentPrice;
          this.updatePortfolio([...currentPortfolio]);
        },
        error: (error: Error) => {
          console.error(`Error fetching live data for ${stock.symbol}:`, error);
        }
      });
    });
  }

  /**
   * Add a stock to the portfolio
   */
  addToPortfolio(stockMetrics: any, shares: number = 0, avgCost: number = 0): boolean {
    const currentPortfolio = this.getCurrentPortfolio();
    
    // Check if stock already exists
    const existingStock = currentPortfolio.find(stock => stock.symbol === stockMetrics.symbol);
    if (existingStock) {
      return false; // Stock already in portfolio
    }

    const portfolioStock: PortfolioStock = {
      symbol: stockMetrics.symbol,
      name: stockMetrics.name,
      currentPrice: stockMetrics.currentPrice,
      currency: stockMetrics.currency,
      dayHigh: stockMetrics.dayHigh,
      dayLow: stockMetrics.dayLow,
      fiftyTwoWeekHigh: stockMetrics.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: stockMetrics.fiftyTwoWeekLow,
      volume: stockMetrics.volume,
      exchange: stockMetrics.exchange,
      addedDate: new Date(),
      shares,
      avgCost
    };

    const updatedPortfolio = [...currentPortfolio, portfolioStock];
    this.updatePortfolio(updatedPortfolio);
    return true;
  }

  /**
   * Remove a stock from the portfolio (but not cash)
   */
  removeFromPortfolio(symbol: string): void {
    if (symbol === 'CASH') return; // Prevent cash removal
    
    const currentPortfolio = this.getCurrentPortfolio();
    const updatedPortfolio = currentPortfolio.filter(stock => stock.symbol !== symbol);
    this.updatePortfolio(updatedPortfolio);
  }

  /**
   * Update shares and average cost for a stock
   */
  updateStockPosition(symbol: string, shares: number, avgCost: number): boolean {
    const currentPortfolio = this.getCurrentPortfolio();
    const stockIndex = currentPortfolio.findIndex(stock => stock.symbol === symbol);
    
    if (stockIndex === -1) {
      return false;
    }

    currentPortfolio[stockIndex] = {
      ...currentPortfolio[stockIndex],
      shares,
      avgCost
    };

    this.updatePortfolio(currentPortfolio);
    return true;
  }

  /**
   * Check if a stock is already in the portfolio
   */
  isInPortfolio(symbol: string): boolean {
    const currentPortfolio = this.getCurrentPortfolio();
    return currentPortfolio.some(stock => stock.symbol === symbol);
  }

  /**
   * Update cash position
   */
  updateCashPosition(amount: number): boolean {
    const currentPortfolio = this.getCurrentPortfolio();
    const cashIndex = currentPortfolio.findIndex(stock => stock.isCash);
    
    if (cashIndex === -1) {
      this.ensureCashPosition();
      return this.updateCashPosition(amount);
    }

    currentPortfolio[cashIndex] = {
      ...currentPortfolio[cashIndex],
      shares: amount
    };

    this.updatePortfolio(currentPortfolio);
    return true;
  }

  /**
   * Add cash to position
   */
  addCash(amount: number): boolean {
    const currentPortfolio = this.getCurrentPortfolio();
    const cashPosition = currentPortfolio.find(stock => stock.isCash);
    const currentCash = cashPosition?.shares || 0;
    return this.updateCashPosition(currentCash + amount);
  }

  /**
   * Remove cash from position (if sufficient funds)
   */
  removeCash(amount: number): boolean {
    const currentPortfolio = this.getCurrentPortfolio();
    const cashPosition = currentPortfolio.find(stock => stock.isCash);
    const currentCash = cashPosition?.shares || 0;
    
    if (currentCash >= amount) {
      return this.updateCashPosition(currentCash - amount);
    }
    return false; // Insufficient funds
  }

  /**
   * Get current cash balance
   */
  getCashBalance(): number {
    const currentPortfolio = this.getCurrentPortfolio();
    const cashPosition = currentPortfolio.find(stock => stock.isCash);
    return cashPosition?.shares || 0;
  }

  /**
   * Clear the entire portfolio (but keep cash position)
   */
  clearPortfolio(): void {
    const currentPortfolio = this.getCurrentPortfolio();
    const cashPosition = currentPortfolio.find(stock => stock.isCash);
    const portfolioWithOnlyCash = cashPosition ? [cashPosition] : [];
    this.updatePortfolio(portfolioWithOnlyCash);
  }

  /**
   * Get portfolio statistics
   */
  getPortfolioStats() {
    const portfolio = this.getCurrentPortfolio();
    const stockPositions = portfolio.filter(stock => !stock.isCash);
    const cashPosition = portfolio.find(stock => stock.isCash);
    
    const stockValue = stockPositions.reduce((sum, stock) => 
      sum + (stock.shares || 0) * stock.currentPrice, 0);
    const stockCost = stockPositions.reduce((sum, stock) => 
      sum + (stock.shares || 0) * (stock.avgCost || 0), 0);
    const cashValue = cashPosition?.shares || 0;
    
    const totalValue = stockValue + cashValue;
    const totalCost = stockCost + cashValue; // Cash cost basis is same as value
    const totalGainLoss = stockValue - stockCost; // Only stocks contribute to gains/losses
    const totalGainLossPercent = stockCost > 0 ? (totalGainLoss / stockCost) * 100 : 0;
    
    return {
      totalStocks: stockPositions.length,
      totalPositions: portfolio.length,
      stockValue,
      cashValue,
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent
    };
  }

  private updatePortfolio(portfolio: PortfolioStock[]): void {
    this.portfolioSubject.next(portfolio);
    this.savePortfolioToStorage(portfolio);
  }

  private loadPortfolioFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const portfolio = JSON.parse(stored);
        // Convert date strings back to Date objects
        portfolio.forEach((stock: any) => {
          stock.addedDate = new Date(stock.addedDate);
        });
        this.portfolioSubject.next(portfolio);
      }
    } catch (error) {
      console.error('Error loading portfolio from storage:', error);
    }
  }

  private savePortfolioToStorage(portfolio: PortfolioStock[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(portfolio));
    } catch (error) {
      console.error('Error saving portfolio to storage:', error);
    }
  }
}