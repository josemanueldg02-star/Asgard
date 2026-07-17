export const GRID_DIVISIONS = 40;
export const MIN_BLOCK_FRACTION = 0.01;

export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

export const VIRTUAL_GRID_WIDTH = 1920;
export const VIRTUAL_GRID_HEIGHT = 1080;
export const PRICE_PER_PIXEL_CENTS = 100;

export function calculatePriceCents(rect: Rect): number {
    const pixels = rect.width * VIRTUAL_GRID_WIDTH * rect.height * VIRTUAL_GRID_HEIGHT;
    return Math.round(pixels * PRICE_PER_PIXEL_CENTS);
}

export function formatPrice(cents: number): string {
    return (cents / 100).toLocaleString("es-ES", {
        style: "currency",
        currency: "EUR",
    });
}
