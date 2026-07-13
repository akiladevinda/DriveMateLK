-- DriveMate LK seed data

-- expense_categories
insert into public.expense_categories (slug, label, sort_order) values
  ('fuel', 'Fuel', 1),
  ('service', 'Service', 2),
  ('repair', 'Repair', 3),
  ('insurance', 'Insurance', 4),
  ('revenue_licence', 'Revenue Licence', 5),
  ('emission_test', 'Emission Test', 6),
  ('tires', 'Tires', 7),
  ('battery', 'Battery', 8),
  ('parking', 'Parking', 9),
  ('highway_toll', 'Highway Toll', 10),
  ('cleaning', 'Cleaning', 11),
  ('accessories', 'Accessories', 12),
  ('modification', 'Modification', 13),
  ('leasing', 'Leasing', 14),
  ('inspection', 'Inspection', 15),
  ('roadside_assistance', 'Roadside Assistance', 16),
  ('other', 'Other', 99)
on conflict (slug) do nothing;

-- maintenance_templates
insert into public.maintenance_templates (
  maintenance_type, title, description, default_interval_months, default_interval_km, priority
) values
  ('engine_oil', 'Engine Oil Change', 'Replace engine oil and oil filter per manufacturer interval.', 6, 5000, 'high'),
  ('oil_filter', 'Oil Filter Replacement', 'Replace oil filter during oil change or as recommended.', 6, 5000, 'medium'),
  ('air_filter', 'Air Filter Replacement', 'Inspect and replace engine air filter for fuel economy and performance.', 12, 15000, 'medium'),
  ('cabin_filter', 'Cabin / AC Filter', 'Replace cabin filter for AC airflow and air quality.', 12, 15000, 'low'),
  ('brake_inspection', 'Brake Inspection', 'Inspect pads, discs, and brake fluid condition.', 12, 20000, 'high'),
  ('brake_fluid', 'Brake Fluid Service', 'Replace brake fluid to maintain stopping performance.', 24, 40000, 'high'),
  ('tires', 'Tire Rotation & Inspection', 'Rotate tires and check tread depth and pressure.', 6, 10000, 'medium'),
  ('wheel_alignment', 'Wheel Alignment', 'Check alignment after pothole damage or uneven tire wear.', 12, null, 'medium'),
  ('battery', 'Battery Check', 'Test battery health; tropical heat reduces lifespan in Sri Lanka.', 12, null, 'medium'),
  ('coolant', 'Coolant / Radiator Service', 'Inspect coolant level and condition; flush per schedule.', 24, 40000, 'medium'),
  ('transmission_fluid', 'Transmission Fluid', 'Inspect or replace automatic transmission fluid.', 36, 60000, 'medium'),
  ('spark_plugs', 'Spark Plugs', 'Replace spark plugs on petrol engines as per service book.', 36, 60000, 'medium'),
  ('timing_belt', 'Timing Belt / Chain Inspection', 'Critical on many Japanese re-imports; follow manufacturer km limit.', 60, 100000, 'critical'),
  ('general_service', 'General Periodic Service', 'Full periodic service per manufacturer schedule.', 6, 5000, 'high')
on conflict (maintenance_type) do nothing;

-- inspection checklist
insert into public.inspection_checklists (slug, title, description, inspection_purpose, is_demo)
values (
  'owner-annual-check',
  'Annual Owner Inspection',
  'Practical checklist for Sri Lankan owners covering documents, fluids, brakes, tires, and lights.',
  'owner_check',
  true
)
on conflict (slug) do nothing;

insert into public.inspection_checklist_items (checklist_id, category, item, sort_order, guidance)
select c.id, v.category, v.item, v.sort_order, v.guidance
from public.inspection_checklists c
cross join (
  values
    ('Documents', 'Registration certificate present and readable', 1, 'Match reg number with windscreen sticker.'),
    ('Documents', 'Insurance valid', 2, 'Check expiry against policy document.'),
    ('Documents', 'Revenue licence current', 3, 'Confirm sticker on windscreen.'),
    ('Exterior', 'Body panels and paint', 10, 'Look for rust near wheel arches and door sills.'),
    ('Exterior', 'Windscreen and wipers', 11, 'Check cracks and wiper rubber condition.'),
    ('Lights', 'Headlights and indicators', 20, 'Test low/high beam and hazard lights.'),
    ('Engine Bay', 'Engine oil level and leaks', 30, 'Check on level ground after engine off 5 min.'),
    ('Engine Bay', 'Coolant level', 31, 'Never open radiator cap when hot.'),
    ('Brakes', 'Pad/disc wear and pedal feel', 40, 'Spongy pedal needs immediate professional check.'),
    ('Tires', 'Tread depth and sidewalls', 50, 'Legal minimum 1.6 mm; replace sooner in wet season.'),
    ('Underbody', 'Exhaust and suspension', 60, 'Listen for clunks on bumps.'),
    ('Interior', 'Dashboard warning lights at startup', 70, 'Note any lights that stay on after start.'),
    ('Road Test', 'Steering vibration and braking', 80, 'Test at low speed in safe area first.')
) as v(category, item, sort_order, guidance)
where c.slug = 'owner-annual-check'
  and not exists (
    select 1 from public.inspection_checklist_items i
    where i.checklist_id = c.id and i.item = v.item
  );

-- demo garages (Colombo / Kandy / Galle)
with garage_seed as (
  insert into public.garages (
    business_name, description, verification_status, phone, email,
    supported_vehicle_types, supported_makes, service_categories,
    rating, review_count, emergency_support, mobile_service,
    price_range, is_demo, is_published, is_active
  ) values
    (
      'Colombo City Auto Care (Demo)',
      'Full-service workshop for Japanese and European cars in Colombo 05. Demo listing for DriveMate LK.',
      'demo', '+94112345678', 'demo.colombo.auto@drivemate.lk',
      array['car','suv','van','hybrid'], array['Toyota','Honda','Nissan','Suzuki'],
      array['general_service','diagnostics','brakes','ac_repair'],
      4.50, 128, true, false, 'mid', true, true, true
    ),
    (
      'Wellawatta Hybrid Specialists (Demo)',
      'Hybrid battery checks, inverter cooling, and Toyota Aqua/Axio service. Demo listing.',
      'demo', '+94112345679', 'demo.wellawatta.hybrid@drivemate.lk',
      array['car','hybrid','ev'], array['Toyota','Honda'],
      array['hybrid_service','diagnostics','engine_oil'],
      4.70, 96, false, true, 'premium', true, true, true
    ),
    (
      'Nugegoda Express Lube (Demo)',
      'Quick oil changes, filters, and AC gas top-ups. Demo listing.',
      'demo', '+94112345680', 'demo.nugegoda.lube@drivemate.lk',
      array['car','suv','van','three_wheeler'], array['Toyota','Suzuki','Tata'],
      array['engine_oil','filters','ac_repair'],
      4.20, 54, false, false, 'budget', true, true, true
    ),
    (
      'Kandy Hill Motor Works (Demo)',
      'Brake, suspension, and hill-country vehicle prep. Demo listing in Kandy.',
      'demo', '+94812345681', 'demo.kandy.motor@drivemate.lk',
      array['car','suv','van','truck'], array['Toyota','Mitsubishi','Isuzu'],
      array['brakes','suspension','general_service','diagnostics'],
      4.60, 73, true, false, 'mid', true, true, true
    ),
    (
      'Peradeniya Tyre & Alignment Hub (Demo)',
      'Tyres, wheel alignment, and balancing for central province drivers. Demo listing.',
      'demo', '+94812345682', 'demo.peradeniya.tyre@drivemate.lk',
      array['car','suv','van','motorcycle'], array['Toyota','Nissan','BMW'],
      array['tires','wheel_alignment'],
      4.40, 41, false, true, 'mid', true, true, true
    ),
    (
      'Galle Coastal Car Clinic (Demo)',
      'Rust prevention, AC, and salt-air corrosion checks for southern drivers. Demo listing.',
      'demo', '+94912345683', 'demo.galle.clinic@drivemate.lk',
      array['car','suv','van'], array['Toyota','Honda','Mazda'],
      array['general_service','bodywork','ac_repair','diagnostics'],
      4.30, 62, false, false, 'mid', true, true, true
    ),
    (
      'Unawatuna Beachside Garage (Demo)',
      'Tourist-area friendly service with pickup options. Demo listing.',
      'demo', '+94912345684', 'demo.unawatuna.garage@drivemate.lk',
      array['car','suv','van','motorcycle'], array['Toyota','Suzuki','Hyundai'],
      array['general_service','engine_oil','brakes'],
      4.10, 29, false, true, 'budget', true, true, true
    )
  returning id, business_name
)
insert into public.garage_locations (garage_id, address, district, latitude, longitude, is_primary)
select g.id, l.address, l.district, l.latitude, l.longitude, true
from garage_seed g
join (
  values
    ('Colombo City Auto Care (Demo)', '45 Havelock Road, Colombo 05', 'Colombo', 6.8920, 79.8650),
    ('Wellawatta Hybrid Specialists (Demo)', '210 Galle Road, Wellawatta', 'Colombo', 6.8720, 79.8570),
    ('Nugegoda Express Lube (Demo)', '12 Stanley Thilakarathna Mawatha, Nugegoda', 'Colombo', 6.8650, 79.9000),
    ('Kandy Hill Motor Works (Demo)', '88 Peradeniya Road, Kandy', 'Kandy', 7.2906, 80.6337),
    ('Peradeniya Tyre & Alignment Hub (Demo)', '5 New Town, Peradeniya', 'Kandy', 7.2690, 80.5950),
    ('Galle Coastal Car Clinic (Demo)', '33 Wakwella Road, Galle', 'Galle', 6.0535, 80.2210),
    ('Unawatuna Beachside Garage (Demo)', 'Station Road, Unawatuna', 'Galle', 6.0090, 80.2500)
) as l(name, address, district, latitude, longitude)
  on l.name = g.business_name;

-- garage services for demo workshops
insert into public.garage_services (garage_id, service_category, description, price_from_minor, currency)
select g.id, s.category, s.description, s.price_from, 'LKR'
from public.garages g
join (
  values
    ('Colombo City Auto Care (Demo)', 'general_service', 'Full periodic service', 850000),
    ('Colombo City Auto Care (Demo)', 'diagnostics', 'OBD scan and report', 350000),
    ('Kandy Hill Motor Works (Demo)', 'brakes', 'Front brake pad replacement', 1200000),
    ('Galle Coastal Car Clinic (Demo)', 'bodywork', 'Underbody anti-rust treatment', 1500000)
) as s(garage_name, category, description, price_from)
  on g.business_name = s.garage_name;

-- demo roadside providers
insert into public.roadside_providers (
  name, description, phone, email, district, latitude, longitude,
  service_types, is_verified, is_demo, rating
) values
  (
    'Lanka Rescue Towing (Demo)',
    '24/7 towing coverage across Western Province. Demo provider for app testing.',
    '+94771234501', 'demo.towing@drivemate.lk', 'Colombo', 6.9271, 79.8612,
    array['towing','mechanical_breakdown','accident'], true, true, 4.5
  ),
  (
    'Central Province Road Assist (Demo)',
    'Battery jump-start and flat tyre help in Kandy district. Demo provider.',
    '+94771234502', 'demo.kandy.assist@drivemate.lk', 'Kandy', 7.2906, 80.6337,
    array['battery_jump','flat_tire','fuel_delivery','lockout'], true, true, 4.3
  ),
  (
    'Southern Coast Breakdown Help (Demo)',
    'Coastal breakdown and accident support Galle to Matara. Demo provider.',
    '+94771234503', 'demo.south.coast@drivemate.lk', 'Galle', 6.0535, 80.2210,
    array['towing','flat_tire','mechanical_breakdown','accident'], true, true, 4.2
  )
on conflict do nothing;

insert into public.roadside_services (provider_id, service_type, description, base_fee_minor, currency)
select p.id, s.service_type, s.description, s.base_fee, 'LKR'
from public.roadside_providers p
join (
  values
    ('Lanka Rescue Towing (Demo)', 'towing', 'Standard light vehicle tow within Colombo', 750000),
    ('Central Province Road Assist (Demo)', 'battery_jump', 'Jump-start with portable booster', 250000),
    ('Southern Coast Breakdown Help (Demo)', 'flat_tire', 'Spare tyre change on-site', 350000)
) as s(provider_name, service_type, description, base_fee)
  on p.name = s.provider_name;

-- demo partner offer
insert into public.partner_offers (
  partner_name, title, description, offer_code, discount_summary,
  valid_until, is_demo
) values (
  'DriveMate LK Partners',
  'Welcome Premium Trial (Demo)',
  'Demo offer shown in subscription upsell screens.',
  'DEMO-PREMIUM-30',
  '30-day premium trial for new users',
  current_date + interval '365 days',
  true
)
on conflict do nothing;
