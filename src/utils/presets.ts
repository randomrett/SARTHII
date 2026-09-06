import type { SchedulePreset } from '../types';

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: 'high-rise',
    title: 'High-Rise Commercial Tower',
    description: 'Multi-story office tower with foundation, structural frame, MEP, and facade work across Zones A, B, & C.',
    activities: [
      {
        id: 'ACT-101',
        name: 'Excavation & Piling',
        zone: 'Zone A',
        plannedStart: '2026-08-01',
        plannedEnd: '2026-08-20',
        progress: 100,
        status: 'completed',
        category: 'Earthworks'
      },
      {
        id: 'ACT-102',
        name: 'Raft Foundation Concrete Pour',
        zone: 'Zone A',
        plannedStart: '2026-08-15',
        plannedEnd: '2026-09-05',
        progress: 85,
        status: 'in_progress',
        category: 'Concrete'
      },
      {
        id: 'ACT-103',
        name: 'Column Rebar & Shuttering',
        zone: 'Zone B',
        plannedStart: '2026-09-01',
        plannedEnd: '2026-09-20',
        progress: 40,
        status: 'in_progress',
        category: 'Structure'
      },
      {
        id: 'ACT-104',
        name: 'Floor 1 Slab Casting',
        zone: 'Zone B',
        plannedStart: '2026-09-15',
        plannedEnd: '2026-10-05',
        progress: 0,
        status: 'not_started',
        category: 'Concrete'
      },
      {
        id: 'ACT-105',
        name: 'MEP Chase Cutting & Conduit Framing',
        zone: 'Zone C',
        plannedStart: '2026-09-20',
        plannedEnd: '2026-10-20',
        progress: 0,
        status: 'not_started',
        category: 'MEP'
      },
      {
        id: 'ACT-106',
        name: 'Curtain Wall Facade Glazing',
        zone: 'Zone C',
        plannedStart: '2026-10-01',
        plannedEnd: '2026-11-15',
        progress: 0,
        status: 'not_started',
        category: 'Facade'
      }
    ]
  },
  {
    id: 'highway-bridge',
    title: 'Highway Overpass & Flyover',
    description: 'Infrastructure project comprising pier foundation casting, precast girder erection, and asphalt paving.',
    activities: [
      {
        id: 'HW-201',
        name: 'Abutment A1 Foundation Excavation',
        zone: 'Pier 1 - North',
        plannedStart: '2026-08-10',
        plannedEnd: '2026-08-28',
        progress: 100,
        status: 'completed',
        category: 'Civil'
      },
      {
        id: 'HW-202',
        name: 'Pier Pier-2 Reinforcement Cage Bending',
        zone: 'Pier 2 - Central',
        plannedStart: '2026-08-25',
        plannedEnd: '2026-09-12',
        progress: 60,
        status: 'in_progress',
        category: 'Steelwork'
      },
      {
        id: 'HW-203',
        name: 'PSC Girder Launching & Erection',
        zone: 'Span 1-2',
        plannedStart: '2026-09-10',
        plannedEnd: '2026-09-30',
        progress: 10,
        status: 'delayed',
        category: 'Heavy Lift'
      },
      {
        id: 'HW-204',
        name: 'Deck Slab Concrete Pouring',
        zone: 'Span 1-2',
        plannedStart: '2026-10-01',
        plannedEnd: '2026-10-20',
        progress: 0,
        status: 'not_started',
        category: 'Concrete'
      },
      {
        id: 'HW-205',
        name: 'Bituminous Asphalt Wearing Course',
        zone: 'Section 1',
        plannedStart: '2026-10-25',
        plannedEnd: '2026-11-10',
        progress: 0,
        status: 'not_started',
        category: 'Paving'
      }
    ]
  },
  {
    id: 'metro-station',
    title: 'Metro Underground Station',
    description: 'Deep underground station box, TBM breakthrough, concourse level structural slabs, and track laying.',
    activities: [
      {
        id: 'MT-301',
        name: 'Diaphragm Wall Trenching & Guidewall',
        zone: 'North Shaft',
        plannedStart: '2026-07-15',
        plannedEnd: '2026-08-15',
        progress: 100,
        status: 'completed',
        category: 'Geotechnical'
      },
      {
        id: 'MT-302',
        name: 'Station Box Deep Excavation',
        zone: 'Central Concourse',
        plannedStart: '2026-08-10',
        plannedEnd: '2026-09-15',
        progress: 75,
        status: 'in_progress',
        category: 'Earthworks'
      },
      {
        id: 'MT-303',
        name: 'Concourse Level Concrete Slab Framing',
        zone: 'Level -1',
        plannedStart: '2026-09-05',
        plannedEnd: '2026-10-10',
        progress: 25,
        status: 'in_progress',
        category: 'Structure'
      },
      {
        id: 'MT-304',
        name: 'TBM Tunnel Ring Segment Lining',
        zone: 'Tunnel South',
        plannedStart: '2026-09-15',
        plannedEnd: '2026-11-01',
        progress: 0,
        status: 'not_started',
        category: 'Tunneling'
      }
    ]
  }
];
