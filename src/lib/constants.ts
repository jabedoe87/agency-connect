export const BUSINESS_TYPES = [
  'Real Estate',
  'Beauty Salon / Hairdresser',
  'Coach / Consultant',
  'Gym / Fitness',
  'Restaurant',
  'Contractor',
  'Other',
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const LEAD_SOURCES = ['Website', 'Referral', 'Social Media', 'Walk-in', 'Other'] as const;

export const PIPELINE_STAGES: Record<string, string[]> = {
  'Real Estate': ['New Lead', 'Contacted', 'Visit Planned', 'Offer Made', 'Won', 'Lost'],
  'Beauty Salon / Hairdresser': ['New', 'Contacted', 'Appointment', 'Returning', 'Lost'],
  'Coach / Consultant': ['New', 'Discovery Call', 'Program Sent', 'Enrolled', 'Lost'],
  'Gym / Fitness': ['New', 'Trial Session', 'Follow-up', 'Member', 'Lost'],
  'Restaurant': ['New', 'Reservation', 'Visited', 'Regular', 'Lost'],
  'Contractor': ['New', 'Site Visit', 'Quote Sent', 'Project Won', 'Lost'],
  'Other': ['New', 'Contacted', 'Appointment', 'Won', 'Lost'],
};

export const APPOINTMENT_TYPES: Record<string, string[]> = {
  'Real Estate': ['Property Viewing', 'Offer Meeting', 'Follow-up'],
  'Beauty Salon / Hairdresser': ['Haircut', 'Color', 'Treatment', 'Consultation'],
  'Coach / Consultant': ['Discovery Call', 'Coaching Session', 'Check-in'],
  'Gym / Fitness': ['Trial Session', 'PT Session', 'Consultation'],
  'Restaurant': ['Lunch', 'Dinner', 'Event Reservation'],
  'Contractor': ['Site Visit', 'Quote Meeting', 'Project Review'],
  'Other': ['Consultation', 'Follow-up', 'Demo', 'Other'],
};

export const CUSTOM_FIELDS_CONFIG: Record<string, { name: string; label: string; type: 'text' | 'select'; options?: string[] }[]> = {
  'Real Estate': [
    { name: 'buyer_or_seller', label: 'Buyer or Seller', type: 'select', options: ['Buyer', 'Seller'] },
    { name: 'property_address', label: 'Property Address', type: 'text' },
    { name: 'budget', label: 'Budget', type: 'text' },
    { name: 'location_preference', label: 'Location Preference', type: 'text' },
  ],
  'Beauty Salon / Hairdresser': [
    { name: 'treatment_type', label: 'Treatment Type', type: 'text' },
    { name: 'preferred_day_time', label: 'Preferred Day/Time', type: 'text' },
  ],
  'Coach / Consultant': [
    { name: 'session_type', label: 'Session Type', type: 'text' },
    { name: 'program_interest', label: 'Program Interest', type: 'text' },
  ],
  'Gym / Fitness': [
    { name: 'membership_type', label: 'Membership Type', type: 'text' },
    { name: 'trial_session_date', label: 'Trial Session Date', type: 'text' },
  ],
  'Restaurant': [
    { name: 'reservation_date', label: 'Reservation Date', type: 'text' },
    { name: 'party_size', label: 'Party Size', type: 'text' },
  ],
  'Contractor': [
    { name: 'project_type', label: 'Project Type', type: 'text' },
    { name: 'estimated_budget', label: 'Estimated Budget', type: 'text' },
  ],
};

export const PLANS = [
  {
    name: 'Starter',
    price: 49,
    badge: '',
    features: ['Dashboard', 'Leads', 'Clients', 'Booking'],
  },
  {
    name: 'Pro',
    price: 99,
    badge: 'Most Popular',
    features: ['Dashboard', 'Leads', 'Clients', 'Booking', 'AI Content', 'Reviews', 'Automations'],
  },
  {
    name: 'Business',
    price: 149,
    badge: '',
    features: ['Everything in Pro', 'WhatsApp Integration', 'Priority Support', 'Multi-user Access'],
  },
];
