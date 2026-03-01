const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

/**
 * Scrapes a company website to extract business information.
 * Uses cheerio for HTML parsing - works for static/SSR sites.
 * @param {string} url - The company website URL
 * @returns {Promise<Object>} Extracted company data
 */
const scrapeCompanyWebsite = async (url) => {
    try {
        // Normalize URL
        if (!url.startsWith('http')) url = 'https://' + url;
        const baseUrl = new URL(url).origin;

        // 1. Scrape Homepage
        const homeData = await scrapeSinglePage(url);

        // 2. Look for internal links to follow
        const internalLinks = findInternalLinks(homeData.$, baseUrl);

        // Target pages to scrape deep (max 3 additional pages to keep it fast)
        const targets = ['about', 'service', 'faq', 'contact'];
        const pagesToVisit = [];

        for (const link of internalLinks) {
            const linkLower = link.toLowerCase();
            if (targets.some(t => linkLower.includes(t)) && !pagesToVisit.includes(link)) {
                pagesToVisit.push(link);
            }
            if (pagesToVisit.length >= 3) break;
        }

        // 3. Scrape additional pages and aggregate
        let aggregatedData = { ...homeData.data };
        aggregatedData.faq = [];

        for (const pageUrl of pagesToVisit) {
            try {
                const pageData = await scrapeSinglePage(pageUrl);
                // Merge data
                if (!aggregatedData.description || aggregatedData.description.length < pageData.data.description.length) {
                    aggregatedData.description = pageData.data.description;
                }

                // Merge services
                if (pageData.data.services.length > 0) {
                    aggregatedData.services = [...new Set([...aggregatedData.services, ...pageData.data.services])];
                }

                // Extract FAQ from this page specifically
                const pageFaq = extractFAQ(pageData.$);
                if (pageFaq.length > 0) {
                    aggregatedData.faq = [...aggregatedData.faq, ...pageFaq];
                }

                // Append any missing contact info
                aggregatedData.contact = { ...pageData.data.contact, ...aggregatedData.contact };

            } catch (pErr) {
                logger.warn(`Failed to scrape sub-page ${pageUrl}:`, pErr.message);
            }
        }

        // Clean up aggregated data
        aggregatedData.faq = aggregatedData.faq.slice(0, 8); // Limit to top 8 FAQs
        aggregatedData.services = aggregatedData.services.slice(0, 15); // Limit to top 15 services

        return aggregatedData;
    } catch (err) {
        logger.error(`Error scraping ${url}:`, err.message);
        throw new Error(`Impossible de récupérer les informations de ${url}: ${err.message}`);
    }
};

/**
 * Scrapes a single page and returns both the parsed $ and extracted data
 */
async function scrapeSinglePage(pageUrl) {
    const response = await axios.get(pageUrl, {
        timeout: 8000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'fr-CA,fr;q=0.9,en;q=0.8'
        }
    });

    const $ = cheerio.load(response.data);

    return {
        $,
        data: {
            name: extractName($, pageUrl),
            description: extractDescription($),
            services: extractServices($),
            contact: extractContactInfo($),
            logo: extractLogo($, pageUrl),
            socials: extractSocials($),
            hours: extractBusinessHours($),
            sourceUrl: pageUrl
        }
    };
}

function findInternalLinks($, baseUrl) {
    const links = [];
    $('a[href]').each((_, el) => {
        let href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

        try {
            const absoluteUrl = new URL(href, baseUrl).href;
            if (absoluteUrl.startsWith(baseUrl) && absoluteUrl !== baseUrl && absoluteUrl !== baseUrl + '/') {
                if (!links.includes(absoluteUrl)) links.push(absoluteUrl);
            }
        } catch (e) { }
    });
    return links;
}

function extractName($, url) {
    // Try og:site_name, og:title, then title tag
    const ogSiteName = $('meta[property="og:site_name"]').attr('content');
    if (ogSiteName) return ogSiteName.trim();

    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) return ogTitle.split('|')[0].split('-')[0].trim();

    const title = $('title').text();
    if (title) return title.split('|')[0].split('-')[0].trim();

    // Fallback: derive from URL
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
    } catch {
        return 'Entreprise';
    }
}

function extractDescription($) {
    // Try meta description, og:description, then first paragraph
    const metaDesc = $('meta[name="description"]').attr('content');
    if (metaDesc) return metaDesc.trim();

    const ogDesc = $('meta[property="og:description"]').attr('content');
    if (ogDesc) return ogDesc.trim();

    // Find the most descriptive paragraph (longest in hero/main section)
    let bestParagraph = '';
    $('main p, .hero p, .about p, section p, article p').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > bestParagraph.length && text.length < 500) {
            bestParagraph = text;
        }
    });

    if (bestParagraph) return bestParagraph;

    // Last resort: first long paragraph
    $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 50 && !bestParagraph) {
            bestParagraph = text;
        }
    });

    return bestParagraph || 'Aucune description trouvée';
}

function extractServices($) {
    const services = [];
    const serviceSelectors = [
        '.services li, .services h3, .services h4',
        '.service-item h3, .service-card h3, .service-title',
        '[class*="service"] h3, [class*="service"] h4',
        '.offerings li, .features li',
        'ul.services li, .our-services li'
    ];

    for (const selector of serviceSelectors) {
        $(selector).each((_, el) => {
            const text = $(el).text().trim();
            if (text && text.length < 100 && services.length < 10) {
                services.push(text);
            }
        });
        if (services.length > 0) break;
    }

    // Fallback: look for h3/h4 in main content
    if (services.length === 0) {
        $('main h3, section h3').slice(0, 6).each((_, el) => {
            const text = $(el).text().trim();
            if (text && text.length < 80) services.push(text);
        });
    }

    return services;
}

function extractContactInfo($) {
    const contact = {};

    // Phone
    const phoneRegex = /(\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/;
    $('a[href^="tel:"]').each((_, el) => {
        if (!contact.phone) contact.phone = $(el).attr('href').replace('tel:', '').trim();
    });
    if (!contact.phone) {
        const bodyText = $('body').text();
        const phoneMatch = bodyText.match(phoneRegex);
        if (phoneMatch) contact.phone = phoneMatch[1].trim();
    }

    // Email
    $('a[href^="mailto:"]').each((_, el) => {
        if (!contact.email) contact.email = $(el).attr('href').replace('mailto:', '').split('?')[0].trim();
    });

    // Address
    $('address, .address, [class*="address"], [itemprop="address"]').each((_, el) => {
        if (!contact.address) contact.address = $(el).text().trim().replace(/\s+/g, ' ');
    });

    return contact;
}

function extractLogo($, url) {
    // Try common logo selectors
    const logoSelectors = [
        'img.logo, .logo img, #logo img, [class*="logo"] img',
        'header img:first-of-type',
        'a[class*="brand"] img, .navbar-brand img',
        'link[rel="icon"]'
    ];

    for (const selector of logoSelectors) {
        const el = $(selector).first();
        if (el.length) {
            let src = el.attr('src') || el.attr('href');
            if (src) {
                // Make absolute URL
                if (src.startsWith('//')) src = 'https:' + src;
                else if (src.startsWith('/')) {
                    try {
                        const base = new URL(url);
                        src = `${base.protocol}//${base.host}${src}`;
                    } catch { }
                }
                return src;
            }
        }
    }

    // Fallback: og:image
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) return ogImage;

    return null;
}

function extractSocials($) {
    const socials = {};
    const platforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'];

    $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        for (const platform of platforms) {
            if (href.includes(platform + '.com') && !socials[platform]) {
                socials[platform] = href;
            }
        }
    });

    return socials;
}

function extractBusinessHours($) {
    const hoursText = [];
    const hourSelectors = [
        '.hours, .business-hours, .opening-hours, [class*="hours"]',
        '[itemprop="openingHours"]',
        'table:contains("Lundi"), table:contains("Monday")'
    ];

    for (const selector of hourSelectors) {
        $(selector).each((_, el) => {
            const text = $(el).text().trim().replace(/\s+/g, ' ');
            if (text && text.length < 300) hoursText.push(text);
        });
        if (hoursText.length > 0) break;
    }

    return hoursText.length > 0 ? hoursText.join('; ') : null;
}

function extractFAQ($) {
    const faq = [];
    // Common FAQ patterns: dt/dd, accordion headers/content, h3 + p

    // Pattern 1: FAQ specific sections
    const faqContainers = $('.faq, [class*="faq"], #faq');
    if (faqContainers.length) {
        faqContainers.find('dt, h3, .question').each((i, el) => {
            const question = $(el).text().trim();
            const answer = $(el).next().text().trim();
            if (question.length > 10 && answer.length > 10 && faq.length < 10) {
                faq.push({ question, answer });
            }
        });
    }

    // Pattern 2: Accordions
    if (faq.length === 0) {
        $('[class*="accordion"] h3, [class*="accordion"] button').each((i, el) => {
            const question = $(el).text().trim();
            const answer = $(el).parent().next().text().trim() || $(el).next().text().trim();
            if (question.length > 10 && answer.length > 10 && faq.length < 10) {
                faq.push({ question, answer });
            }
        });
    }

    return faq;
}

/**
 * Generates a specialized AI agent prompt from scraped company data
 * @param {Object} companyData - Data from scrapeCompanyWebsite
 * @param {string} customInstructions - Additional user-provided instructions
 * @returns {string} Generated prompt template
 */
const generateAgentPrompt = (companyData, customInstructions = '') => {
    const { name, description, services, contact, hours, faq } = companyData;

    const servicesList = Array.isArray(services)
        ? services.map(s => `  - ${s}`).join('\n')
        : (services || '  - Services généraux');

    const hoursInfo = hours || 'Lundi-Vendredi 8h à 18h';

    // Format FAQ section
    let faqSection = '';
    if (faq && faq.length > 0) {
        faqSection = '\nQUESTIONS FRÉQUENTES (FAQ) :\n' +
            faq.map(item => `Q: ${item.question}\nR: ${item.answer}`).join('\n\n') + '\n';
    }

    const prompt = `Tu es l'assistante virtuelle de ${name}. Ton ton est chaleureux, professionnel et surtout TRÈS NATUREL.
    
CONTEXTE DE L'ENTREPRISE :
${description}

NOS SERVICES PHARES :
${servicesList}
${faqSection}
INFORMATIONS PRATIQUES :
- Horaires : ${hoursInfo}
- Contact : ${contact.phone || 'Non spécifié'} / ${contact.email || 'Non spécifié'}
- Adresse : ${contact.address || 'Non spécifié'}

TA MISSION :
1. Accueil Humain — Salue, demande le NOM et surtout comment va le client aujourd'hui.
2. Découverte — Pose des questions pour bien comprendre le besoin. Montre que tu connais nos services.
3. Renseignement — Réponds précisément en utilisant les infos ci-dessus.
4. Coordonnées — Récupère le TÉLÉPHONE pour le suivi.
5. Engagement — Fixe un rendez-vous (date/heure).

STYLE ET PERSONNALITÉ :
- Ton : Chaleureux, empathique et expert. Tu n'es pas un robot.
- Fluidité : Utilise des hésitations naturelles ('Euh', 'Alors...', 'Voyons', 'Bah') et des marqueurs d'écoute ('D'accord', 'Je vois', 'C'est parfait').
- Empathie : Réagis aux émotions du client. S'il est pressé, sois concise. S'il est inquiet (ex: urgence dentaire), sois très rassurante.
- Rythme : Ne coupe jamais le client. Laisse des silences s'il réfléchit.
- Variété : Varie tes phrases d'accueil et de transition.

RÈGLES D'EXTRACTION (JSON) :
- client_name, client_phone, client_email, category, details, appointment_date, appointment_time`;

    return prompt;
};

module.exports = {
    scrapeCompanyWebsite,
    generateAgentPrompt
};
