"use client";

import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { Search, Download, ExternalLink, Clock, Eye } from 'lucide-react';
import styles from './styles.module.css';

// Real screenshot data structure that matches the API response
interface Screenshot {
  id: string;
  site: string;
  domain: string;
  path: string;
  breakpoint: string;
  capturedAt: string;
  updated: boolean;
  thumbUrl: string;
  url: string;
  status: string;
}

// Initial screenshots with real URLs that would be captured
const initialScreenshots: Screenshot[] = [
  {
    id: '1',
    site: 'Apple',
    domain: 'apple.com',
    path: '/store',
    breakpoint: 'desktop',
    capturedAt: '2024-01-15T10:30:00Z',
    updated: true,
    thumbUrl: '/playground/apple-store-placeholder.html',
    url: 'https://www.apple.com/store',
    status: 'captured'
  },
  {
    id: '2',
    site: 'Airbnb',
    domain: 'airbnb.com',
    path: '/rooms/123',
    breakpoint: 'mobile',
    capturedAt: '2024-01-14T15:45:00Z',
    updated: false,
    thumbUrl: '/playground/airbnb-room-placeholder.html',
    url: 'https://www.airbnb.com/rooms/123',
    status: 'captured'
  },
  {
    id: '3',
    site: 'Ticketmaster',
    domain: 'ticketmaster.com',
    path: '/event/456',
    breakpoint: 'desktop',
    capturedAt: '2024-01-13T09:15:00Z',
    updated: true,
    thumbUrl: '/playground/ticketmaster-event-placeholder.html',
    url: 'https://www.ticketmaster.com/event/456',
    status: 'captured'
  },
  {
    id: '4',
    site: 'StubHub',
    domain: 'stubhub.com',
    path: '/checkout',
    breakpoint: 'mobile',
    capturedAt: '2024-01-12T14:20:00Z',
    updated: true,
    thumbUrl: '/playground/stubhub-checkout-placeholder.html',
    url: 'https://www.stubhub.com/checkout',
    status: 'captured'
  },
  {
    id: '5',
    site: 'SeatGeek',
    domain: 'seatgeek.com',
    path: '/event/789',
    breakpoint: 'desktop',
    capturedAt: '2024-01-11T11:10:00Z',
    updated: false,
    thumbUrl: '/playground/seatgeek-event-placeholder.html',
    url: 'https://www.seatgeek.com/event/789',
    status: 'captured'
  },
  {
    id: '6',
    site: 'Gametime',
    domain: 'gametime.co',
    path: '/tickets/transfer',
    breakpoint: 'mobile',
    capturedAt: '2024-01-10T16:30:00Z',
    updated: true,
    thumbUrl: '/playground/gametime-transfer-placeholder.html',
    url: 'https://www.gametime.co/tickets/transfer',
    status: 'captured'
  }
];

const allowedSites = [
  { name: 'Apple', domain: 'apple.com' },
  { name: 'Airbnb', domain: 'airbnb.com' },
  { name: 'Ticketmaster', domain: 'ticketmaster.com' },
  { name: 'StubHub', domain: 'stubhub.com' },
  { name: 'SeatGeek', domain: 'seatgeek.com' },
  { name: 'Gametime', domain: 'gametime.co' }
];

export default function ScreenPad() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>(initialScreenshots);
  const [loading, setLoading] = useState(false);

  // Command bar keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSearch = async (query: string, sites: string[]) => {
    setLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sites })
      });
      
      if (response.ok) {
        const results = await response.json();
        // Use real screenshots from the API if available, otherwise fall back to initial data
        setScreenshots(results.screenshots && results.screenshots.length > 0 
          ? results.screenshots 
          : initialScreenshots.filter(s => sites.includes(s.domain))
        );
      } else {
        // If API fails, filter initial screenshots by selected sites
        setScreenshots(initialScreenshots.filter(s => sites.includes(s.domain)));
      }
    } catch (error) {
      console.error('Search failed:', error);
      // Fallback to filtering initial screenshots
      setScreenshots(initialScreenshots.filter(s => sites.includes(s.domain)));
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async (url: string) => {
    try {
      const response = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, withContent: true })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Capture job enqueued:', result);
        // In a real implementation, you might want to refresh the screenshots
        // or show a notification that the capture is in progress
      }
    } catch (error) {
      console.error('Capture failed:', error);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>ScreenPad</h1>
        <p>Capture, store, and compare screenshots of industry-leading websites</p>
      </header>

      {/* Command Bar */}
      <div className={styles.commandBar}>
        <button 
          className={styles.commandTrigger}
          onClick={() => setOpen(true)}
        >
          <Search className={styles.searchIcon} />
          Search patterns or journeys...
          <kbd>⌘K</kbd>
        </button>
      </div>

      {/* Command Dialog */}
      <Command.Dialog 
        open={open} 
        onOpenChange={setOpen}
        className={styles.commandDialog}
      >
        <div className={styles.commandInput}>
          <Search className={styles.searchIcon} />
          <Command.Input 
            placeholder="Search for UX patterns (e.g., 'checkout flow', 'ticket transfer')..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
        </div>

        <div className={styles.commandList}>
          <Command.List>
            <Command.Empty>No results found.</Command.Empty>
            
            {/* Site Selection */}
            <Command.Group heading="Select Sites">
              {allowedSites.map((site) => (
                <Command.Item
                  key={site.domain}
                  onSelect={() => {
                    setSelectedSites(prev => 
                      prev.includes(site.domain) 
                        ? prev.filter(s => s !== site.domain)
                        : [...prev, site.domain]
                    );
                  }}
                  className={styles.commandItem}
                >
                  <div className={styles.checkbox}>
                    {selectedSites.includes(site.domain) && '✓'}
                  </div>
                  {site.name} ({site.domain})
                </Command.Item>
              ))}
            </Command.Group>

            {/* Search Action */}
            <Command.Group heading="Actions">
              <Command.Item
                onSelect={() => {
                  if (searchQuery && selectedSites.length > 0) {
                    handleSearch(searchQuery, selectedSites);
                    setOpen(false);
                  }
                }}
                className={styles.commandItem}
              >
                🔍 Search "{searchQuery}" across {selectedSites.length} sites
              </Command.Item>
            </Command.Group>
          </Command.List>
        </div>
      </Command.Dialog>

      {/* Screenshot Grid */}
      <main className={styles.main}>
        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Capturing screenshots...</p>
          </div>
        )}

        <div className={styles.grid}>
          {screenshots.map((screenshot) => (
            <div key={screenshot.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.siteInfo}>
                  <h3>{screenshot.site}</h3>
                  <span className={styles.domain}>{screenshot.domain}</span>
                </div>
                <div className={styles.badge}>
                  {screenshot.breakpoint}
                </div>
              </div>

              <div className={styles.imageContainer}>
                <iframe 
                  src={screenshot.thumbUrl} 
                  title={`${screenshot.site} - ${screenshot.path}`}
                  className={styles.thumbnail}
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to a placeholder if the real screenshot fails to load
                    console.log(`Failed to load screenshot for ${screenshot.site}:`, e);
                  }}
                  sandbox="allow-same-origin"
                  style={{ border: 'none', width: '100%', height: '100%' }}
                />
                {screenshot.updated && (
                  <div className={styles.updatedBadge}>
                    <Clock size={12} />
                    Updated
                  </div>
                )}
                <div className={styles.imageOverlay}>
                  <div className={styles.imageInfo}>
                    <span className={styles.imagePath}>{screenshot.path}</span>
                  </div>
                </div>
                {/* Demo notice for placeholder images */}
                <div className={styles.demoNotice}>
                  Demo: Real screenshots would show actual website content
                </div>
              </div>

              <div className={styles.cardContent}>
                <p className={styles.date}>
                  {new Date(screenshot.capturedAt).toLocaleDateString()}
                </p>
              </div>

              <div className={styles.cardActions}>
                <button 
                  className={styles.actionButton}
                  onClick={() => window.open(screenshot.url, '_blank')}
                >
                  <ExternalLink size={16} />
                  Open URL
                </button>
                <button className={styles.actionButton}>
                  <Download size={16} />
                  Export PNG
                </button>
                <button 
                  className={styles.actionButton}
                  onClick={() => handleCapture(screenshot.url)}
                >
                  <Eye size={16} />
                  Re-capture
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
