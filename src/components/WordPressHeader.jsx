import { useEffect, useState } from 'react';

/**
 * WordPress Header Component for React
 * Fetches navigation links from robostem.org and displays them in a clean header
 */
export default function WordPressHeader() {
    const [navLinks, setNavLinks] = useState([]);
    const [logoUrl, setLogoUrl] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAndRefresh = async () => {
            // 1. Try to load from cache first
            const cachedData = localStorage.getItem('wordpress_nav_cache');
            let cacheParsed = null;

            if (cachedData) {
                try {
                    cacheParsed = JSON.parse(cachedData);
                    setNavLinks(cacheParsed.navLinks);
                    setLogoUrl(cacheParsed.logoUrl);
                    setLoading(false); // Show cached content immediately
                } catch (e) {
                    console.error('Error parsing nav cache', e);
                }
            }

            // 2. Check if we need to refresh (once per day)
            const today = new Date().toISOString().split('T')[0];
            const lastFetched = cacheParsed?.timestamp || '';

            if (!cacheParsed || lastFetched !== today) {
                // Background fetch
                await fetchWordPressNav();
            } else {
                setLoading(false);
            }
        };

        loadAndRefresh();
    }, []);

    const fetchWordPressNav = async () => {
        try {
            // Keep current loading state if we have cached data to avoid flash
            const hasCache = !!localStorage.getItem('wordpress_nav_cache');
            if (!hasCache) setLoading(true);

            // Use CORS proxy to avoid CORS issues
            const corsProxy = 'https://api.allorigins.win/raw?url=';
            const targetUrl = encodeURIComponent('https://robostem.org');

            const response = await fetch(`${corsProxy}${targetUrl}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }

            const html = await response.text();

            // Parse the HTML to extract navigation links
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Extract logo
            let newLogoUrl = '';
            const logoImg = doc.querySelector('header img, .logo img, nav img');
            if (logoImg) {
                let logoSrc = logoImg.getAttribute('src');
                // Convert relative URL to absolute
                if (logoSrc && logoSrc.startsWith('/')) {
                    logoSrc = `https://robostem.org${logoSrc}`;
                }
                newLogoUrl = logoSrc;
                setLogoUrl(logoSrc);
            }

            // Extract navigation links - try multiple selectors
            const links = [];

            // Try to find nav menu items
            const navItems = doc.querySelectorAll('nav a, header a, .menu a');
            navItems.forEach(link => {
                const text = link.textContent.trim();
                const href = link.getAttribute('href');

                // Filter out only the main navigation links
                if (text && href &&
                    (text.toUpperCase() === 'HOW' ||
                        text.toUpperCase() === 'WHAT' ||
                        text.toUpperCase() === 'WHO' ||
                        text.includes('Contact') ||
                        text.includes('Join'))) {

                    // Convert relative URLs to absolute
                    let absoluteHref = href;
                    if (href.startsWith('/')) {
                        absoluteHref = `https://robostem.org${href}`;
                    } else if (href.startsWith('#')) {
                        absoluteHref = `https://robostem.org${href}`;
                    }

                    links.push({ text, href: absoluteHref });
                }
            });

            // Deduplicate links by text
            const uniqueLinks = [];
            const seen = new Set();
            links.forEach(link => {
                if (!seen.has(link.text)) {
                    seen.add(link.text);
                    uniqueLinks.push(link);
                }
            });

            setNavLinks(uniqueLinks);

            // 3. Save to cache
            const cacheData = {
                navLinks: uniqueLinks,
                logoUrl: newLogoUrl,
                timestamp: new Date().toISOString().split('T')[0]
            };
            localStorage.setItem('wordpress_nav_cache', JSON.stringify(cacheData));

        } catch (err) {
            console.error('Error fetching WordPress navigation:', err);
            // Only fallback if we don't have anything at all
            if (navLinks.length === 0) {
                const fallback = [
                    { text: 'HOW', href: 'https://robostem.org/#how' },
                    { text: 'WHAT', href: 'https://robostem.org/#what' },
                    { text: 'WHO', href: 'https://robostem.org/#who' },
                    { text: 'Join Us / Contact', href: 'https://robostem.org/contact/' }
                ];
                setNavLinks(fallback);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full h-16 flex items-center justify-center">
                <div className="text-gray-400 text-sm">Loading...</div>
            </div>
        );
    }

    return (
        <nav className="w-full px-4 sm:px-8 py-4 flex items-center justify-between">
            {/* Logo */}
            <a
                href="https://robostem.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center hover:opacity-80 transition-opacity"
            >
                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt="robostem"
                        className="h-8 w-auto"
                    />
                ) : (
                    <span className="text-lg font-bold text-white">robostem</span>
                )}
            </a>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-8">
                {navLinks.map((link, index) => {
                    // Style the last link (Contact) as a button
                    const isContactLink = link.text.includes('Contact') || link.text.includes('Join');

                    if (isContactLink) {
                        return (
                            <a
                                key={index}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all border border-white/20"
                            >
                                {link.text}
                            </a>
                        );
                    }

                    return (
                        <a
                            key={index}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-[#4FCEEC] font-medium transition-colors uppercase text-sm tracking-wide"
                        >
                            {link.text}
                        </a>
                    );
                })}
            </nav>
        </nav>
    );
}
