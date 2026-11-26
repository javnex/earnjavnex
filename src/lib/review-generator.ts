/**
 * Dynamic AI Review Text Generator
 * Generates natural, human-sounding 5-star reviews tailored to the shop title and category.
 * Generates unique variations per user so each reviewer receives a distinct text.
 */

const SPA_REVIEWS = [
  "Had an exceptionally rejuvenating session at {shop}. The therapists are courteous and well-trained, and the ambiance is calm and hygienic. Highly recommended!",
  "Best experience at {shop}! The deep relaxation massage relieved all my muscle stiffness. Very clean environment and professional staff. Will definitely visit again.",
  "Outstanding service at {shop}. Peaceful atmosphere, fragrant therapy oils, and extremely attentive staff. Deserves a solid 5-star rating for their hospitality.",
  "Visited {shop} on a friend's recommendation and it exceeded all expectations. Very polite therapists and genuine traditional techniques. Truly 5/5 stars!",
  "Extremely therapeutic and relaxing experience at {shop}. Great value for money and immaculate cleanliness. Staff makes you feel welcomed and comfortable throughout.",
  "The ambiance at {shop} instantly puts you at ease. Thoroughly enjoyed the therapy session, very relaxing and refreshing. Top-tier service in town!",
];

const CAFE_REVIEWS = [
  "Fantastic ambiance and delicious offerings at {shop}! The staff is warm and courteous, and service was remarkably prompt. A wonderful spot to unwind.",
  "Loved visiting {shop}! Top-notch quality, fresh ingredients, and great attention to customer satisfaction. 5 stars all the way!",
  "Great atmosphere, prompt service, and delicious taste at {shop}. The staff was very attentive and welcoming. Will visit again soon!",
];

const STORE_REVIEWS = [
  "Excellent customer experience at {shop}. Well-organized collection, fair pricing, and very helpful staff who guided me promptly. Highly recommended!",
  "Great shopping experience at {shop}. The team was extremely polite and cooperative, and product quality is top-grade. Truly 5 stars!",
  "Very impressed with the service and professionalism at {shop}. Clean layout, authentic products, and swift billing. 5-star experience!",
];

const GENERAL_REVIEWS = [
  "Outstanding experience with {shop}! From start to finish, the staff was courteous, professional, and delivered top-tier service. 5 stars well deserved!",
  "Highly satisfied with the prompt and professional service at {shop}. The team genuinely cares about customer satisfaction. Keep up the great work!",
  "Exceptional quality and genuine hospitality at {shop}. Very impressed by their attention to detail and friendly approach. Truly recommended!",
  "One of the best experiences I have had at {shop}. Friendly staff, quick assistance, and seamless service. Deserves full 5 stars!",
];

export function generateAiReviewText(shopTitle: string, userSeed: string): string {
  const cleanTitle = shopTitle.trim();
  const lower = cleanTitle.toLowerCase();

  let pool = GENERAL_REVIEWS;
  if (lower.includes("spa") || lower.includes("massage") || lower.includes("thai") || lower.includes("salon") || lower.includes("wellness")) {
    pool = SPA_REVIEWS;
  } else if (lower.includes("cafe") || lower.includes("coffee") || lower.includes("chai") || lower.includes("tea") || lower.includes("restaurant") || lower.includes("food") || lower.includes("bakery")) {
    pool = CAFE_REVIEWS;
  } else if (lower.includes("store") || lower.includes("shop") || lower.includes("mart") || lower.includes("bazaar") || lower.includes("jewel") || lower.includes("cloth")) {
    pool = STORE_REVIEWS;
  }

  // Generate deterministic index based on user seed and title
  let hash = 0;
  const combined = `${userSeed}-${cleanTitle}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }

  const selectedIndex = Math.abs(hash) % pool.length;
  const template = pool[selectedIndex];

  return template.replace(/\{shop\}/g, cleanTitle);
}
