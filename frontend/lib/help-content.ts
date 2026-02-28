export interface HelpGuide {
  id: string;
  title: string;
  category: string;
  description: string;
  path: string;
  keywords: string[];
  icon: string;
}

export interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  guides: string[];
}

export const helpGuides: HelpGuide[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    category: 'Getting Started',
    description: 'Learn the basics and create your first trip',
    path: '/help/getting-started',
    keywords: ['beginner', 'first trip', 'tutorial', 'basics', 'new user', 'start'],
    icon: 'BookOpen',
  },
  {
    id: 'trips',
    title: 'Trip Management',
    category: 'Planning',
    description: 'Create and manage your trips',
    path: '/help/trips',
    keywords: ['trip', 'create', 'edit', 'status', 'budget', 'planning'],
    icon: 'MapPinned',
  },
  {
    id: 'destinations',
    title: 'Destinations',
    category: 'Planning',
    description: 'Add and organize trip destinations',
    path: '/help/destinations',
    keywords: ['destination', 'location', 'arrival', 'departure', 'dates', 'places'],
    icon: 'MapPin',
  },
  {
    id: 'journeys',
    title: 'Transport',
    category: 'Travel',
    description: 'Add and manage transport on your day itinerary',
    path: '/help/journeys',
    keywords: ['transport', 'flight', 'train', 'bus', 'drive', 'ferry', 'travel', 'booking', 'carrier', 'reference'],
    icon: 'Plane',
  },
  {
    id: 'activities',
    title: 'Activities',
    category: 'Travel',
    description: 'Schedule activities and to-dos',
    path: '/help/activities',
    keywords: ['activity', 'todo', 'schedule', 'booking', 'things to do', 'itinerary'],
    icon: 'ListTodo',
  },
  {
    id: 'expenses',
    title: 'Budget & Expenses',
    category: 'Budget',
    description: 'Track spending and manage your trip budget',
    path: '/help/expenses',
    keywords: ['expense', 'budget', 'cost', 'money', 'spending', 'tracking', 'warning'],
    icon: 'Wallet',
  },
  {
    id: 'packing',
    title: 'Packing Lists',
    category: 'Preparation',
    description: 'Create and track packing lists',
    path: '/help/packing',
    keywords: ['packing', 'list', 'items', 'luggage', 'checklist', 'pack'],
    icon: 'Package',
  },
  {
    id: 'sharing',
    title: 'Trip Sharing',
    category: 'Collaboration',
    description: 'Share trips with other users',
    path: '/help/sharing',
    keywords: ['share', 'collaborate', 'permission', 'users', 'team', 'access'],
    icon: 'Users',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    category: 'Features',
    description: 'Understand your dashboard and action items',
    path: '/help/dashboard',
    keywords: ['dashboard', 'overview', 'stats', 'action items', 'widgets'],
    icon: 'LayoutDashboard',
  },
  {
    id: 'timeline',
    title: 'Timeline View',
    category: 'Features',
    description: 'View your trip in chronological order',
    path: '/help/timeline',
    keywords: ['timeline', 'chronology', 'schedule', 'order', 'view'],
    icon: 'Calendar',
  },
  {
    id: 'admin',
    title: 'Admin Features',
    category: 'Admin',
    description: 'Manage users and system settings',
    path: '/help/admin',
    keywords: ['admin', 'users', 'management', 'settings', 'permissions'],
    icon: 'Shield',
  },
];

export const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'New to Travel Planner? Start here',
    icon: 'BookOpen',
    guides: ['getting-started'],
  },
  {
    id: 'planning',
    title: 'Planning Your Trip',
    description: 'Create and organize your travel plans',
    icon: 'MapPinned',
    guides: ['trips', 'destinations'],
  },
  {
    id: 'travel',
    title: 'Managing Travel',
    description: 'Transport and activities on your day pages',
    icon: 'Plane',
    guides: ['journeys', 'activities'],
  },
  {
    id: 'budget',
    title: 'Budget & Expenses',
    description: 'Track spending and costs',
    icon: 'Wallet',
    guides: ['expenses'],
  },
  {
    id: 'preparation',
    title: 'Packing & Preparation',
    description: 'Get ready for your trip',
    icon: 'Package',
    guides: ['packing'],
  },
  {
    id: 'collaboration',
    title: 'Collaboration',
    description: 'Share trips with others',
    icon: 'Users',
    guides: ['sharing'],
  },
  {
    id: 'features',
    title: 'Dashboard & Timeline',
    description: 'Explore key features',
    icon: 'LayoutDashboard',
    guides: ['dashboard', 'timeline'],
  },
  {
    id: 'admin',
    title: 'Admin Features',
    description: 'User management and settings',
    icon: 'Shield',
    guides: ['admin'],
  },
];

export interface SearchResult {
  guide: HelpGuide;
  matchType: 'title' | 'description' | 'keyword';
  score: number;
}

export function searchHelpContent(query: string): SearchResult[] {
  if (!query || query.length < 2) return [];

  const searchQuery = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  helpGuides.forEach((guide) => {
    let score = 0;
    let matchType: 'title' | 'description' | 'keyword' = 'keyword';

    // Title match (highest priority)
    if (guide.title.toLowerCase().includes(searchQuery)) {
      score = 100;
      matchType = 'title';
    }
    // Description match (medium priority)
    else if (guide.description.toLowerCase().includes(searchQuery)) {
      score = 50;
      matchType = 'description';
    }
    // Keyword match (lower priority)
    else if (guide.keywords.some((keyword) => keyword.includes(searchQuery))) {
      score = 25;
      matchType = 'keyword';
    }

    if (score > 0) {
      results.push({ guide, matchType, score });
    }
  });

  // Sort by score (highest first)
  return results.sort((a, b) => b.score - a.score);
}

export function getGuideById(id: string): HelpGuide | undefined {
  return helpGuides.find((guide) => guide.id === id);
}

export function getGuidesByCategory(categoryId: string): HelpGuide[] {
  const category = helpCategories.find((cat) => cat.id === categoryId);
  if (!category) return [];

  return category.guides
    .map((guideId) => helpGuides.find((guide) => guide.id === guideId))
    .filter((guide): guide is HelpGuide => guide !== undefined);
}

export function getRelatedGuides(guideId: string): HelpGuide[] {
  const guide = getGuideById(guideId);
  if (!guide) return [];

  // Get guides from the same category
  return helpGuides.filter(
    (g) => g.category === guide.category && g.id !== guideId
  );
}
