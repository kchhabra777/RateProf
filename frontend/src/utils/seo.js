/**
 * SEO & Structured Data Utility for RateProf
 * Dynamically updates document title, meta tags, and JSON-LD schema.
 */

export function updatePageSEO({
  title,
  description,
  url = window.location.href,
  image = 'https://www.rateprof.tech/tiet-navbar-logo.png',
  schema = null
}) {
  // 1. Document Title
  if (title) {
    document.title = title;
  }

  // Helper to set or create meta tag
  const setMeta = (nameAttr, nameVal, content) => {
    if (!content) return;
    let element = document.querySelector(`meta[${nameAttr}="${nameVal}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(nameAttr, nameVal);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  // 2. Standard Meta Description
  if (description) {
    setMeta('name', 'description', description);
  }

  // 3. Open Graph
  setMeta('property', 'og:title', title || document.title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:image', image);

  // 4. Twitter Card
  setMeta('name', 'twitter:title', title || document.title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', image);

  // 5. Canonical Link
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', url);

  // 6. JSON-LD Structured Data for Google Rich Results
  let scriptTag = document.getElementById('rateprof-jsonld-schema');
  if (schema) {
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'rateprof-jsonld-schema';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(schema);
  } else if (scriptTag) {
    scriptTag.remove();
  }
}

/**
 * Builds Schema.org Person & AggregateRating schema for a faculty member
 */
export function buildTeacherSchema(teacher, ratings = null) {
  if (!teacher) return null;

  // Only publish an aggregate rating backed by real reviews
  const count = ratings?.totalReviews ? Number(ratings.totalReviews) : 0;
  const ratingVal = count > 0 && ratings?.overallRating ? Number(ratings.overallRating).toFixed(1) : null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: teacher.fullName || 'Faculty Member',
    jobTitle: teacher.designation || 'Professor',
    worksFor: {
      '@type': 'CollegeOrUniversity',
      name: 'Thapar Institute of Engineering and Technology',
      sameAs: 'https://www.thapar.edu'
    },
    department: teacher.department || 'Engineering',
    url: `https://www.rateprof.tech/teacher/${encodeURIComponent(teacher.id || teacher.userId || '')}`,
    ...(ratingVal ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: ratingVal,
        reviewCount: count,
        bestRating: '5',
        worstRating: '1'
      }
    } : {})
  };
}
