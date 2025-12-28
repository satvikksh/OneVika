export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  title: string;
  description?: string;
  category: string;
  width: number;
  height: number;
  tags: string[];
  createdAt: Date;
  featured?: boolean;
}

export type GalleryCategory = {
  id: string;
  name: string;
  count: number;
};

export interface GalleryFilter {
  category: string;
  tags: string[];
  search: string;
}