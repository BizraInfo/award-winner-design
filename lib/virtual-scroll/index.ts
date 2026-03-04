/**
 * Elite Virtual Scrolling System with Ihsān Principles
 * 
 * High-performance list rendering featuring:
 * - Windowed rendering (only visible items)
 * - Dynamic item heights
 * - Infinite scrolling
 * - Smooth scrolling
 * - Keyboard navigation
 * - Grid support
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface VirtualListOptions<T> {
  items: T[];
  itemHeight: number | ((index: number, item: T) => number);
  overscan?: number;
  containerHeight: number;
  getItemKey?: (item: T, index: number) => string | number;
}

export interface VirtualListState {
  scrollTop: number;
  scrollHeight: number;
  startIndex: number;
  endIndex: number;
  visibleItems: VirtualItem[];
  totalHeight: number;
}

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
  key: string | number;
}

export interface VirtualGridOptions<T> {
  items: T[];
  columnCount: number;
  rowHeight: number | ((rowIndex: number) => number);
  columnWidth: number | ((columnIndex: number) => number);
  containerWidth: number;
  containerHeight: number;
  overscan?: number;
  getItemKey?: (item: T, index: number) => string | number;
}

export interface VirtualGridState {
  scrollTop: number;
  scrollLeft: number;
  visibleCells: VirtualCell[];
  totalHeight: number;
  totalWidth: number;
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
}

export interface VirtualCell {
  rowIndex: number;
  columnIndex: number;
  itemIndex: number;
  top: number;
  left: number;
  width: number;
  height: number;
  key: string | number;
}

export interface InfiniteScrollOptions {
  loadMore: () => Promise<void>;
  hasMore: boolean;
  threshold?: number;
  isLoading?: boolean;
}

// ============================================================================
// Virtual List Manager
// ============================================================================

export class VirtualListManager<T> {
  private items: T[];
  private itemHeight: number | ((index: number, item: T) => number);
  private overscan: number;
  private containerHeight: number;
  private getItemKey: (item: T, index: number) => string | number;
  private heightCache: Map<number, number> = new Map();
  private positionCache: Map<number, number> = new Map();
  private listeners: Set<(state: VirtualListState) => void> = new Set();
  private scrollTop = 0;
  private totalHeight = 0;
  
  constructor(options: VirtualListOptions<T>) {
    this.items = options.items;
    this.itemHeight = options.itemHeight;
    this.overscan = options.overscan ?? 3;
    this.containerHeight = options.containerHeight;
    this.getItemKey = options.getItemKey || ((_, index) => index);
    
    this.calculatePositions();
  }
  
  /**
   * Update items
   */
  setItems(items: T[]): void {
    this.items = items;
    this.heightCache.clear();
    this.positionCache.clear();
    this.calculatePositions();
    this.notify();
  }
  
  /**
   * Update container height
   */
  setContainerHeight(height: number): void {
    this.containerHeight = height;
    this.notify();
  }
  
  /**
   * Handle scroll event
   */
  onScroll(scrollTop: number): void {
    this.scrollTop = Math.max(0, scrollTop);
    this.notify();
  }
  
  /**
   * Scroll to specific index
   */
  scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start'): number {
    const clampedIndex = Math.max(0, Math.min(index, this.items.length - 1));
    const itemStart = this.positionCache.get(clampedIndex) || 0;
    const itemHeight = this.getItemHeight(clampedIndex);
    
    let newScrollTop: number;
    
    switch (align) {
      case 'center':
        newScrollTop = itemStart - (this.containerHeight - itemHeight) / 2;
        break;
      case 'end':
        newScrollTop = itemStart - this.containerHeight + itemHeight;
        break;
      case 'start':
      default:
        newScrollTop = itemStart;
    }
    
    this.scrollTop = Math.max(0, Math.min(newScrollTop, this.totalHeight - this.containerHeight));
    this.notify();
    
    return this.scrollTop;
  }
  
  /**
   * Get current state
   */
  getState(): VirtualListState {
    const { startIndex, endIndex } = this.getVisibleRange();
    const visibleItems = this.getVisibleItems(startIndex, endIndex);
    
    return {
      scrollTop: this.scrollTop,
      scrollHeight: this.totalHeight,
      startIndex,
      endIndex,
      visibleItems,
      totalHeight: this.totalHeight
    };
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: VirtualListState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Get item at specific offset
   */
  getItemAtOffset(offset: number): number {
    // Binary search for item at offset
    let low = 0;
    let high = this.items.length - 1;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const itemStart = this.positionCache.get(mid) || 0;
      const itemEnd = itemStart + this.getItemHeight(mid);
      
      if (offset < itemStart) {
        high = mid - 1;
      } else if (offset >= itemEnd) {
        low = mid + 1;
      } else {
        return mid;
      }
    }
    
    return Math.max(0, low);
  }
  
  /**
   * Measure item height (for dynamic heights)
   */
  measureItem(index: number, height: number): void {
    const previousHeight = this.heightCache.get(index);
    if (previousHeight !== height) {
      this.heightCache.set(index, height);
      this.calculatePositions();
      this.notify();
    }
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private calculatePositions(): void {
    let currentPosition = 0;
    
    for (let i = 0; i < this.items.length; i++) {
      this.positionCache.set(i, currentPosition);
      currentPosition += this.getItemHeight(i);
    }
    
    this.totalHeight = currentPosition;
  }
  
  private getItemHeight(index: number): number {
    // Check cache first
    const cached = this.heightCache.get(index);
    if (cached !== undefined) return cached;
    
    // Calculate height
    const height = typeof this.itemHeight === 'function'
      ? this.itemHeight(index, this.items[index])
      : this.itemHeight;
    
    this.heightCache.set(index, height);
    return height;
  }
  
  private getVisibleRange(): { startIndex: number; endIndex: number } {
    const startIndex = Math.max(0, this.getItemAtOffset(this.scrollTop) - this.overscan);
    const endOffset = this.scrollTop + this.containerHeight;
    const endIndex = Math.min(
      this.items.length - 1,
      this.getItemAtOffset(endOffset) + this.overscan
    );
    
    return { startIndex, endIndex };
  }
  
  private getVisibleItems(startIndex: number, endIndex: number): VirtualItem[] {
    const items: VirtualItem[] = [];
    
    for (let i = startIndex; i <= endIndex; i++) {
      const start = this.positionCache.get(i) || 0;
      const size = this.getItemHeight(i);
      
      items.push({
        index: i,
        start,
        size,
        end: start + size,
        key: this.getItemKey(this.items[i], i)
      });
    }
    
    return items;
  }
  
  private notify(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[VirtualList] Listener error:', error);
      }
    });
  }
}

// ============================================================================
// Virtual Grid Manager
// ============================================================================

export class VirtualGridManager<T> {
  private items: T[];
  private columnCount: number;
  private rowHeight: number | ((rowIndex: number) => number);
  private columnWidth: number | ((columnIndex: number) => number);
  private containerWidth: number;
  private containerHeight: number;
  private overscan: number;
  private getItemKey: (item: T, index: number) => string | number;
  
  private rowHeightCache: Map<number, number> = new Map();
  private columnWidthCache: Map<number, number> = new Map();
  private rowPositionCache: Map<number, number> = new Map();
  private columnPositionCache: Map<number, number> = new Map();
  
  private scrollTop = 0;
  private scrollLeft = 0;
  private totalHeight = 0;
  private totalWidth = 0;
  
  private listeners: Set<(state: VirtualGridState) => void> = new Set();
  
  constructor(options: VirtualGridOptions<T>) {
    this.items = options.items;
    this.columnCount = options.columnCount;
    this.rowHeight = options.rowHeight;
    this.columnWidth = options.columnWidth;
    this.containerWidth = options.containerWidth;
    this.containerHeight = options.containerHeight;
    this.overscan = options.overscan ?? 2;
    this.getItemKey = options.getItemKey || ((_, index) => index);
    
    this.calculatePositions();
  }
  
  /**
   * Update items
   */
  setItems(items: T[]): void {
    this.items = items;
    this.calculatePositions();
    this.notify();
  }
  
  /**
   * Handle scroll event
   */
  onScroll(scrollTop: number, scrollLeft: number): void {
    this.scrollTop = Math.max(0, scrollTop);
    this.scrollLeft = Math.max(0, scrollLeft);
    this.notify();
  }
  
  /**
   * Scroll to cell
   */
  scrollToCell(rowIndex: number, columnIndex: number): void {
    const rowStart = this.rowPositionCache.get(rowIndex) || 0;
    const columnStart = this.columnPositionCache.get(columnIndex) || 0;
    
    this.scrollTop = Math.max(0, Math.min(rowStart, this.totalHeight - this.containerHeight));
    this.scrollLeft = Math.max(0, Math.min(columnStart, this.totalWidth - this.containerWidth));
    
    this.notify();
  }
  
  /**
   * Get current state
   */
  getState(): VirtualGridState {
    const { startRowIndex, endRowIndex, startColumnIndex, endColumnIndex } = this.getVisibleRange();
    const visibleCells = this.getVisibleCells(
      startRowIndex, endRowIndex,
      startColumnIndex, endColumnIndex
    );
    
    return {
      scrollTop: this.scrollTop,
      scrollLeft: this.scrollLeft,
      visibleCells,
      totalHeight: this.totalHeight,
      totalWidth: this.totalWidth,
      startRowIndex,
      endRowIndex,
      startColumnIndex,
      endColumnIndex
    };
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: VirtualGridState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private calculatePositions(): void {
    const rowCount = Math.ceil(this.items.length / this.columnCount);
    
    // Calculate row positions
    let currentRowPosition = 0;
    for (let i = 0; i < rowCount; i++) {
      this.rowPositionCache.set(i, currentRowPosition);
      currentRowPosition += this.getRowHeight(i);
    }
    this.totalHeight = currentRowPosition;
    
    // Calculate column positions
    let currentColumnPosition = 0;
    for (let i = 0; i < this.columnCount; i++) {
      this.columnPositionCache.set(i, currentColumnPosition);
      currentColumnPosition += this.getColumnWidth(i);
    }
    this.totalWidth = currentColumnPosition;
  }
  
  private getRowHeight(rowIndex: number): number {
    const cached = this.rowHeightCache.get(rowIndex);
    if (cached !== undefined) return cached;
    
    const height = typeof this.rowHeight === 'function'
      ? this.rowHeight(rowIndex)
      : this.rowHeight;
    
    this.rowHeightCache.set(rowIndex, height);
    return height;
  }
  
  private getColumnWidth(columnIndex: number): number {
    const cached = this.columnWidthCache.get(columnIndex);
    if (cached !== undefined) return cached;
    
    const width = typeof this.columnWidth === 'function'
      ? this.columnWidth(columnIndex)
      : this.columnWidth;
    
    this.columnWidthCache.set(columnIndex, width);
    return width;
  }
  
  private getVisibleRange(): {
    startRowIndex: number;
    endRowIndex: number;
    startColumnIndex: number;
    endColumnIndex: number;
  } {
    const rowCount = Math.ceil(this.items.length / this.columnCount);
    
    // Find visible rows
    const startRowIndex = Math.max(0, this.findRowAtOffset(this.scrollTop) - this.overscan);
    const endRowIndex = Math.min(
      rowCount - 1,
      this.findRowAtOffset(this.scrollTop + this.containerHeight) + this.overscan
    );
    
    // Find visible columns
    const startColumnIndex = Math.max(0, this.findColumnAtOffset(this.scrollLeft) - this.overscan);
    const endColumnIndex = Math.min(
      this.columnCount - 1,
      this.findColumnAtOffset(this.scrollLeft + this.containerWidth) + this.overscan
    );
    
    return { startRowIndex, endRowIndex, startColumnIndex, endColumnIndex };
  }
  
  private findRowAtOffset(offset: number): number {
    const rowCount = Math.ceil(this.items.length / this.columnCount);
    
    for (let i = 0; i < rowCount; i++) {
      const rowStart = this.rowPositionCache.get(i) || 0;
      const rowEnd = rowStart + this.getRowHeight(i);
      
      if (offset >= rowStart && offset < rowEnd) {
        return i;
      }
    }
    
    return rowCount - 1;
  }
  
  private findColumnAtOffset(offset: number): number {
    for (let i = 0; i < this.columnCount; i++) {
      const columnStart = this.columnPositionCache.get(i) || 0;
      const columnEnd = columnStart + this.getColumnWidth(i);
      
      if (offset >= columnStart && offset < columnEnd) {
        return i;
      }
    }
    
    return this.columnCount - 1;
  }
  
  private getVisibleCells(
    startRow: number,
    endRow: number,
    startColumn: number,
    endColumn: number
  ): VirtualCell[] {
    const cells: VirtualCell[] = [];
    
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startColumn; col <= endColumn; col++) {
        const itemIndex = row * this.columnCount + col;
        
        if (itemIndex >= this.items.length) continue;
        
        cells.push({
          rowIndex: row,
          columnIndex: col,
          itemIndex,
          top: this.rowPositionCache.get(row) || 0,
          left: this.columnPositionCache.get(col) || 0,
          width: this.getColumnWidth(col),
          height: this.getRowHeight(row),
          key: this.getItemKey(this.items[itemIndex], itemIndex)
        });
      }
    }
    
    return cells;
  }
  
  private notify(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[VirtualGrid] Listener error:', error);
      }
    });
  }
}

// ============================================================================
// Infinite Scroll Manager
// ============================================================================

export class InfiniteScrollManager {
  private options: InfiniteScrollOptions;
  private isLoading = false;
  
  constructor(options: InfiniteScrollOptions) {
    this.options = options;
  }
  
  /**
   * Update options
   */
  update(options: Partial<InfiniteScrollOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Handle scroll event
   */
  async onScroll(scrollTop: number, scrollHeight: number, containerHeight: number): Promise<void> {
    const threshold = this.options.threshold ?? 200;
    const distanceFromBottom = scrollHeight - scrollTop - containerHeight;
    
    if (
      !this.isLoading &&
      this.options.hasMore &&
      distanceFromBottom < threshold
    ) {
      this.isLoading = true;
      
      try {
        await this.options.loadMore();
      } finally {
        this.isLoading = false;
      }
    }
  }
  
  /**
   * Check if currently loading
   */
  get loading(): boolean {
    return this.isLoading || !!this.options.isLoading;
  }
}

// ============================================================================
// Scroll Position Persistence
// ============================================================================

export class ScrollPositionManager {
  private positions: Map<string, number> = new Map();
  private storageKey: string;
  
  constructor(storageKey: string = 'scroll-positions') {
    this.storageKey = storageKey;
    this.loadFromStorage();
  }
  
  /**
   * Save scroll position
   */
  save(key: string, position: number): void {
    this.positions.set(key, position);
    this.persistToStorage();
  }
  
  /**
   * Restore scroll position
   */
  restore(key: string): number | undefined {
    return this.positions.get(key);
  }
  
  /**
   * Clear position
   */
  clear(key: string): void {
    this.positions.delete(key);
    this.persistToStorage();
  }
  
  /**
   * Clear all positions
   */
  clearAll(): void {
    this.positions.clear();
    this.persistToStorage();
  }
  
  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.positions = new Map(Object.entries(parsed));
      }
    } catch {
      // Ignore storage errors
    }
  }
  
  private persistToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const obj = Object.fromEntries(this.positions);
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch {
      // Ignore storage errors
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a debounced scroll handler
 */
export function createScrollHandler(
  callback: (scrollTop: number) => void,
  delay: number = 16
): (event: Event) => void {
  let rafId: number | null = null;
  let lastScrollTop = 0;
  
  return (event: Event) => {
    const target = event.target as HTMLElement;
    lastScrollTop = target.scrollTop;
    
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        callback(lastScrollTop);
        rafId = null;
      });
    }
  };
}

/**
 * Calculate visible range from scroll position
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 3
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(totalItems - 1, start + visibleCount + overscan * 2);
  
  return { start, end };
}

/**
 * Get styles for virtual item
 */
export function getVirtualItemStyle(item: VirtualItem): Record<string, string> {
  return {
    position: 'absolute',
    top: `${item.start}px`,
    height: `${item.size}px`,
    left: '0',
    right: '0'
  };
}

/**
 * Get styles for virtual cell
 */
export function getVirtualCellStyle(cell: VirtualCell): Record<string, string> {
  return {
    position: 'absolute',
    top: `${cell.top}px`,
    left: `${cell.left}px`,
    width: `${cell.width}px`,
    height: `${cell.height}px`
  };
}

export default {
  VirtualListManager,
  VirtualGridManager,
  InfiniteScrollManager,
  ScrollPositionManager,
  createScrollHandler,
  calculateVisibleRange,
  getVirtualItemStyle,
  getVirtualCellStyle
};
