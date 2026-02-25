const CDN_BASE = 'https://cdn.y3c.kr';

export class ImageUrlResolver {
  static resolve(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${CDN_BASE}/${cleanPath}`;
  }
}
