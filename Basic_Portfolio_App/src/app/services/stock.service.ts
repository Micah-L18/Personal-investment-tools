import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export interface StockData {
  chart: {
    result: Array<{
      meta: {
        currency: string;
        symbol: string;
        exchangeName: string;
        fullExchangeName: string;
        instrumentType: string;
        regularMarketPrice: number;
        fiftyTwoWeekHigh: number;
        fiftyTwoWeekLow: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        regularMarketVolume: number;
        longName: string;
        shortName: string;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          high: number[];
          low: number[];
          open: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private http = inject(HttpClient);
  private readonly API_BASE_URL = 'http://localhost:3001/api';

  /**
   * Search for stock data by ticker symbol
   * @param ticker - Stock ticker symbol (e.g., 'AAPL', 'TSLA')
   * @returns Observable<StockData>
   */
  searchStock(ticker: string): Observable<StockData> {
    if (!ticker || !ticker.trim()) {
      return throwError(() => new Error('Ticker symbol is required'));
    }

    const apiUrl = `${this.API_BASE_URL}/stock?ticker=${ticker.trim().toUpperCase()}`;
    
    return this.http.get<StockData>(apiUrl).pipe(
      catchError((error) => {
        console.error('Stock API Error:', error);
        let errorMessage = 'Failed to fetch stock data';
        
        if (error.status === 404) {
          errorMessage = 'Stock not found';
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to server';
        } else if (error.status >= 500) {
          errorMessage = 'Server error occurred';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Extract key stock metrics from the API response
   * @param stockData - Raw stock data from API
   * @returns Formatted stock metrics
   */
  extractStockMetrics(stockData: StockData) {
    const result = stockData.chart.result[0];
    const meta = result.meta;
    
    return {
      symbol: meta.symbol,
      name: meta.longName || meta.shortName,
      currentPrice: meta.regularMarketPrice,
      currency: meta.currency,
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      volume: meta.regularMarketVolume,
      exchange: meta.exchangeName
    };
  }
}
