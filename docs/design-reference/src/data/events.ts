export interface TicketTier {
  name: string
  price: number
  description: string
  available: number
}

export interface Artist {
  name: string
  role: string
  bio: string
}

export interface Event {
  id: number
  title: string
  category: string
  city: string
  state: string
  date: string
  time?: string
  venue: string
  address?: string
  price: number
  img: string
  gallery?: string[]
  tag?: string
  description: string
  about?: string
  artists?: Artist[]
  ticketTiers?: TicketTier[]
  organizer?: string
  organizerLogo?: string
  duration?: string
  language?: string
}

export const EVENTS: Event[] = [
  {
    id: 1,
    title: "Saptak Music Festival",
    category: "Music",
    city: "Ahmedabad",
    state: "Gujarat",
    date: "Jan 4–13, 2026",
    time: "7:00 PM onwards",
    venue: "Tagore Hall",
    address: "Paldi, Ahmedabad, Gujarat 380007",
    price: 500,
    img: "https://images.unsplash.com/photo-1568219656418-15c329312bf1?w=1400&h=700&fit=crop&auto=format",
    gallery: [
      "https://images.unsplash.com/photo-1568219656418-15c329312bf1?w=600&h=400&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1681731030357-829645dd55b1?w=600&h=400&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1633411988188-6e63354a9019?w=600&h=400&fit=crop&auto=format",
    ],
    tag: "Featured",
    description: "India's most beloved classical music festival, celebrating Hindustani traditions across 10 consecutive nights with the living masters of the raga form.",
    about: `Saptak Music Festival has been India's most celebrated platform for Hindustani classical music since 1980. Founded by Smt. Madhu Bhatt Vatsal in Ahmedabad, it brings together legendary maestros and promising young musicians in an intimate setting that honours the guru-shishya tradition.\n\nEach night unfolds across five to six performances, beginning at sunset and continuing past midnight — mirroring the ancient timetable of the ragas themselves. The Tagore Hall, with its warm acoustics and dedicated audience, creates an atmosphere unlike any modern concert venue.\n\nOver four decades, Saptak has hosted Pandit Ravi Shankar, Ustad Bismillah Khan, Pandit Bhimsen Joshi, and hundreds of other luminaries. This year marks the festival's 46th edition.`,
    artists: [
      {
        name: "Pt. Hariprasad Chaurasia",
        role: "Bansuri Flute",
        bio: "Padma Vibhushan awardee and one of the greatest bansuri players of our era, known for his ability to translate deep emotion through the bamboo flute.",
      },
      {
        name: "Ustad Rashid Khan",
        role: "Hindustani Vocal",
        bio: "Representing the Rampur-Sahaswan gharana, Ustad Rashid Khan is celebrated for his extraordinary range and emotional depth across khayal and thumri.",
      },
      {
        name: "Pt. Shivkumar Sharma",
        role: "Santoor",
        bio: "The pioneer who elevated santoor from a folk instrument to a classical stage presence. His concerts have defined generations of Indian music lovers.",
      },
      {
        name: "Rakesh Chaurasia",
        role: "Bansuri Flute",
        bio: "Disciple and nephew of Pt. Hariprasad Chaurasia, Rakesh brings a contemporary sensibility to classical bansuri performance.",
      },
    ],
    ticketTiers: [
      { name: "Gallery", price: 500, description: "Upper gallery seating with clear sightlines", available: 180 },
      { name: "Stalls", price: 1200, description: "Ground floor seating, closer to the stage", available: 60 },
      { name: "Patron Circle", price: 3500, description: "Reserved front rows + post-concert meet & greet", available: 15 },
    ],
    organizer: "Saptak School of Music",
    duration: "3–4 hours per night",
    language: "Hindustani / Carnatic",
  },
  {
    id: 2,
    title: "Khajuraho Dance Festival",
    category: "Dance",
    city: "Khajuraho",
    state: "Madhya Pradesh",
    date: "Feb 20–26, 2026",
    time: "6:30 PM",
    venue: "Western Group of Temples",
    address: "Khajuraho, Chhatarpur, Madhya Pradesh 471606",
    price: 0,
    img: "https://images.unsplash.com/photo-1463592177119-bab2a00f3ccb?w=1400&h=700&fit=crop&auto=format",
    gallery: [
      "https://images.unsplash.com/photo-1463592177119-bab2a00f3ccb?w=600&h=400&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1756370256926-e48ca54c5efe?w=600&h=400&fit=crop&auto=format",
    ],
    tag: "Free",
    description: "Seven nights of classical Indian dance against the illuminated backdrop of the UNESCO World Heritage Khajuraho temples. All eight major classical forms represented.",
    about: `The Khajuraho Dance Festival, inaugurated in 1975, transforms the stone-carved temples of the UNESCO World Heritage Site into a living stage for India's classical dance traditions. The carved figures that adorn the temple walls — frozen mid-gesture in the ancient mudras — seem to come alive as performers mirror their postures on the open-air stage.\n\nAll eight classical dance forms — Bharatanatyam, Kathak, Odissi, Kuchipudi, Manipuri, Mohiniattam, Sattriya, and Chhau — are performed across seven evenings. The Madhya Pradesh Kala Parishad curates the festival with the dual goal of preservation and accessibility: entry is free for all, and the temple backdrop ensures the performances are inseparable from their cultural origin.\n\nPerformers travel from every corner of India. The festival has featured Sonal Mansingh, Birju Maharaj, Yamini Krishnamurthy, and Mrinalini Sarabhai over its storied history.`,
    artists: [
      {
        name: "Sonal Mansingh",
        role: "Bharatanatyam & Odissi",
        bio: "Padma Vibhushan recipient and one of the most celebrated exponents of both Bharatanatyam and Odissi. Her abhinaya is considered unparalleled in contemporary classical dance.",
      },
      {
        name: "Aditi Mangaldas",
        role: "Kathak",
        bio: "Disciple of Pandit Birju Maharaj, Aditi is known for her bold reinterpretations of Kathak that remain rooted in Lucknow gharana technique.",
      },
      {
        name: "Aruna Mohanty",
        role: "Odissi",
        bio: "Director of Odissi Research Centre, Bhubaneswar. Her Odissi draws on the full spectrum of the form from mangalacharan to moksha.",
      },
    ],
    ticketTiers: [
      { name: "Open Seating", price: 0, description: "Free entry — arrive early for best spots", available: 1200 },
    ],
    organizer: "Madhya Pradesh Kala Parishad",
    duration: "2.5 hours",
    language: "Sanskrit / multiple regional",
  },
  {
    id: 3,
    title: "Jaipur Literature Festival",
    category: "Literature",
    city: "Jaipur",
    state: "Rajasthan",
    date: "Jan 29 – Feb 2, 2026",
    time: "9:00 AM – 7:00 PM",
    venue: "Hotel Diggi Palace",
    address: "Shivaji Marg, Diggi House, Jaipur, Rajasthan 302004",
    price: 0,
    img: "https://images.unsplash.com/photo-1524228529766-4d7fe5dc55ca?w=1400&h=700&fit=crop&auto=format",
    tag: "Free",
    description: "The world's largest free literary festival. Five days, 250+ sessions, authors from 50 countries — all set in the courtyard of a 17th-century palace.",
    about: `The Jaipur Literature Festival, which Oprah Winfrey called "the greatest literary show on earth," draws over 400,000 attendees across five days to the sun-washed courtyards of Diggi Palace. Founded in 2006 by authors Namita Gokhale and William Dalrymple, it has since become both India's largest cultural gathering and a genuinely global literary event.\n\nSessions run simultaneously across six stages — from intimate conversations to packed debates — covering fiction, non-fiction, poetry, politics, translation, and oral traditions. The festival's commitment to free entry means that students from small-town Rajasthan sit beside Nobel laureates and Booker Prize winners.\n\nThe food courts, the bookshop (stocked by Bahrisons), the evening music performances, and the pink-city backdrop make JLF a total sensory experience beyond just the sessions.`,
    artists: [
      { name: "Amitav Ghosh", role: "Author", bio: "Booker Prize shortlisted author of the Ibis Trilogy and Sea of Poppies. One of India's most important living prose stylists." },
      { name: "Arundhati Roy", role: "Author & Activist", bio: "Booker Prize winner for The God of Small Things. Essayist and one of the most provocative voices in Indian public life." },
      { name: "William Dalrymple", role: "Author & Co-Director", bio: "Scottish historian and author of The Anarchy and City of Djinns. Co-founder and curatorial spirit of JLF." },
    ],
    ticketTiers: [
      { name: "Festival Pass", price: 0, description: "Free — register online to receive your digital pass", available: 50000 },
      { name: "Front Seat (Digital)", price: 200, description: "Reserved front seating across all stages", available: 500 },
    ],
    organizer: "Teamwork Arts",
    duration: "Full day (5 days)",
    language: "English, Hindi, Urdu, and 40+ languages",
  },
  {
    id: 4,
    title: "Chennai Music Season",
    category: "Music",
    city: "Chennai",
    state: "Tamil Nadu",
    date: "Dec 1 – Jan 15, 2026",
    time: "Various (morning & evening concerts)",
    venue: "Various Sabhas",
    address: "Mylapore, T. Nagar, and Alwarpet, Chennai",
    price: 200,
    img: "https://images.unsplash.com/photo-1681731030357-829645dd55b1?w=1400&h=700&fit=crop&auto=format",
    description: "The world's largest Carnatic music festival — six weeks, 3,000+ concerts, and 800 sabhas. The season that defines classical music in South India.",
    about: `The Chennai Music Season, also called the Margazhi Season, is the world's largest gathering of Carnatic music and dance performances. Each December, Chennai's cultural sabhas host morning and evening concerts simultaneously across the city's heritage neighbourhoods of Mylapore and Alwarpet.\n\nWith over 3,000 concerts and 800 venues participating, the season draws musicians from across India and the global Tamil diaspora. Legends and debutants perform on the same circuit — it is the most democratic and most demanding proving ground in Indian classical music.\n\nThe season culminates in the Music Academy's prestigious December Festival, where stalwarts and emerging artists receive the institution's renowned awards.`,
    artists: [
      { name: "T.M. Krishna", role: "Carnatic Vocal", bio: "Radical and celebrated Carnatic vocalist known for taking the art form to new audiences and challenging its caste exclusions. Ramon Magsaysay Award winner." },
      { name: "Bombay Jayashri", role: "Carnatic Vocal", bio: "Golden Globe nominated vocalist celebrated for her meditative rendering of krithis and bhajans across traditions." },
      { name: "Mandolin U. Rajesh", role: "Mandolin", bio: "Carrying forward the tradition of his father, U. Srinivas, Rajesh has established himself as a brilliant young voice in Carnatic instrumental music." },
    ],
    ticketTiers: [
      { name: "Single Concert", price: 200, description: "Per concert ticket at participating sabhas", available: 800 },
      { name: "Season Pass", price: 2500, description: "Unlimited entry to all concerts at a single sabha for the full season", available: 100 },
    ],
    organizer: "Madras Music Academy & Partner Sabhas",
    duration: "45–90 minutes per concert",
    language: "Tamil / Sanskrit",
  },
  {
    id: 5,
    title: "Kashi Utsav",
    category: "Folk",
    city: "Varanasi",
    state: "Uttar Pradesh",
    date: "Nov 14–18, 2025",
    time: "Sunrise to late night",
    venue: "Ghats of Varanasi",
    address: "Dashashwamedh Ghat to Assi Ghat, Varanasi, UP 221001",
    price: 0,
    img: "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?w=1400&h=700&fit=crop&auto=format",
    tag: "Free",
    description: "Five days of uninterrupted performance on Varanasi's ancient ghats — folk music, Ganga aarti, Banarasi thumri, and devotional song at dawn and dusk.",
    about: `Kashi Utsav is Varanasi's celebration of its own timeless cultural identity. The festival unfolds on the ghats themselves — stone steps that descend to the Ganga and have served as performance spaces for centuries.\n\nEach morning begins with a Ganga aarti at Dashashwamedh Ghat, the most elaborate ritual worship in the Hindu world. The days fill with performances of Banarasi thumri, dadra, chaiti, and kajri — the folk-classical forms uniquely associated with Varanasi. Evenings bring classical concerts, nautanki theatre, and traditional storytelling.\n\nThe final night is a massive gathering at Assi Ghat where folk performers from UP, Bihar, and Jharkhand perform until dawn. Participation is free: the city itself is the venue.`,
    artists: [
      { name: "Girija Devi (tribute)", role: "Thumri & Dadra", bio: "The late Girija Devi, the Thumri Queen of Varanasi, is honoured each year at Kashi Utsav with a tribute performance by her disciples." },
      { name: "Rajan & Sajan Mishra", role: "Hindustani Vocal", bio: "Brothers and disciples of Pandit Hanuman Prasad Mishra, representing the Benaras gharana's rich vocal tradition." },
    ],
    ticketTiers: [
      { name: "Open Festival", price: 0, description: "All performances are free and open to the public", available: 10000 },
    ],
    organizer: "UP Tourism & Kashi Vishwanath Temple Trust",
    duration: "Continuous — sunrise to past midnight",
    language: "Bhojpuri / Hindi / Sanskrit",
  },
  {
    id: 6,
    title: "Kolkata International Film Festival",
    category: "Film",
    city: "Kolkata",
    state: "West Bengal",
    date: "Nov 8–15, 2025",
    time: "10:00 AM – 9:00 PM",
    venue: "Nandan & Rabindra Sadan",
    address: "1/1 AJC Bose Road, Kolkata, West Bengal 700020",
    price: 50,
    img: "https://images.unsplash.com/photo-1592843997881-cab3860b1067?w=1400&h=700&fit=crop&auto=format",
    description: "Asia's second oldest film festival. Eight days of world cinema, retrospectives of Bengali masters, and competition screenings at Nandan.",
    about: `The Kolkata International Film Festival, established in 1995, is Asia's second oldest film festival after Tokyo. It is the definitive showcase for Bengali cinema and a serious platform for world cinema in India.\n\nThe festival runs retrospectives dedicated to the great Bengali filmmakers — Satyajit Ray, Mrinal Sen, Ritwik Ghatak — alongside competition sections for Indian and international features. Nandan, the main venue, was built specifically as a film centre by the West Bengal government and has hosted the festival since its founding.\n\nScreenings are affordable and attract a deeply cinephile audience — students, academics, and ordinary film lovers fill the halls from morning to night across all eight days.`,
    artists: [
      { name: "Aparna Sen", role: "Director & Actor", bio: "One of the most prominent voices in Bengali cinema. Her films 36 Chowringhee Lane and Mr. and Mrs. Iyer remain landmarks of Indian art cinema." },
      { name: "Rituparno Ghosh (retrospective)", role: "Director", bio: "A retrospective of Rituparno Ghosh's complete works is presented, including Utsab, Dahan, and Chokher Bali." },
    ],
    ticketTiers: [
      { name: "Single Screening", price: 50, description: "Per-film ticket at Nandan or Rabindra Sadan", available: 600 },
      { name: "Festival Delegate", price: 800, description: "All-access pass for the full 8-day festival", available: 200 },
    ],
    organizer: "West Bengal Film Centre",
    duration: "90–150 minutes per film",
    language: "Bengali / Hindi / International (English subtitles)",
  },
  {
    id: 7,
    title: "Rajasthani Folk Night at Amer",
    category: "Folk",
    city: "Jaipur",
    state: "Rajasthan",
    date: "Mar 15, 2026",
    time: "7:30 PM",
    venue: "Amer Fort Amphitheatre",
    address: "Amer Fort, Amer, Jaipur, Rajasthan 302028",
    price: 800,
    img: "https://images.unsplash.com/photo-1681731030409-c4448f48a701?w=1400&h=700&fit=crop&auto=format",
    tag: "Popular",
    description: "Manganiyar and Langa musicians perform at the illuminated Amer Fort — the most atmospheric folk music event in Rajasthan.",
    about: `The Manganiyar and Langa communities of Rajasthan are hereditary musician castes whose traditions stretch back over a thousand years. The Manganiyars play for the Muslim communities of Barmer and Jaisalmer; the Langas are associated with the Sindhi-Sipahi community. Both traditions were deeply intertwined with Rajput court culture.\n\nThis one-night event brings together ensembles from both communities for a performance at the illuminated Amer Fort — one of the most photogenic historical sites in India. The combination of the 16th-century amber-lit fort walls and the piercing, emotional call of the khamaycha and sindhi sarangi creates an atmosphere of extraordinary cultural depth.\n\nThe performance is curated by the Jodhpur RIFF team and runs from 7:30 PM until midnight.`,
    artists: [
      { name: "Ghewar Khan Manganiyar", role: "Khamaycha", bio: "Third-generation khamaycha player from the Manganiyar community of Barmer. His instrument is a bowed lute unique to the tradition." },
      { name: "Lakha Khan Manganiyar", role: "Satara / Vocal", bio: "Among the most celebrated vocalists of the Manganiyar tradition, known for his powerful interpretation of Sufi and devotional folk music." },
      { name: "Darra Khan Langa", role: "Sarangi", bio: "A leading exponent of Sindhi Sarangi from the Langa community, Darra Khan's playing is considered among the most sophisticated in the folk tradition." },
    ],
    ticketTiers: [
      { name: "General Seating", price: 800, description: "Seated lawn in front of the fort stage", available: 300 },
      { name: "Premium Terrace", price: 2000, description: "Elevated terrace seating with full fort view + dinner", available: 60 },
    ],
    organizer: "Jodhpur RIFF & Rajasthan Tourism",
    duration: "4 hours",
    language: "Rajasthani / Sindhi",
  },
  {
    id: 8,
    title: "Odissi Dance Mahotsav",
    category: "Dance",
    city: "Bhubaneswar",
    state: "Odisha",
    date: "Jan 15–19, 2026",
    time: "6:00 PM",
    venue: "Mukteswar Temple",
    address: "Mukteswar Temple Complex, Bhubaneswar, Odisha 751001",
    price: 300,
    img: "https://images.unsplash.com/photo-1756370256926-e48ca54c5efe?w=1400&h=700&fit=crop&auto=format",
    description: "Five evenings of Odissi against the carved stone of Bhubaneswar's 10th-century Mukteswar Temple — the most intimate classical dance festival in India.",
    about: `Odissi is one of the oldest surviving dance forms in the world, with direct lineage from the devadasi traditions of the Jagannath Temple at Puri. The Odissi Dance Mahotsav, held annually in Bhubaneswar, presents the form in its most authentic setting — the stone-carved temples of the Ekamra Kshetra (the forest of temples) that give Bhubaneswar its ancient identity.\n\nThe Mukteswar Temple, built in the 10th century, has an intimate kund (tank) courtyard that serves as a natural amphitheatre. Performances by senior gurus and young soloists over five evenings trace the full arc of Odissi — from mangalacharan invocation through pallavi, abhinaya expressiveness, and the closing moksha.\n\nThe festival is organised by the Odissi Research Centre, which also maintains the largest archive of Odissi manuscripts, stone inscriptions, and palm-leaf records.`,
    artists: [
      { name: "Aruna Mohanty", role: "Odissi", bio: "Director of the Odissi Research Centre, Aruna Mohanty is one of the foremost authorities on the form's classical repertoire." },
      { name: "Ratikant Mohapatra", role: "Odissi", bio: "Son of Guru Kelucharan Mohapatra, who codified modern Odissi. Ratikant continues his father's lineage with technical rigour and expressive depth." },
    ],
    ticketTiers: [
      { name: "Temple Courtyard", price: 300, description: "Seated in the intimate Mukteswar kund courtyard", available: 120 },
      { name: "Patron Seating", price: 900, description: "Reserved stone seating close to the performance space", available: 30 },
    ],
    organizer: "Odissi Research Centre, Bhubaneswar",
    duration: "2.5 hours",
    language: "Sanskrit / Odia",
  },
  {
    id: 9,
    title: "Hornbill Festival",
    category: "Folk",
    city: "Kisama",
    state: "Nagaland",
    date: "Dec 1–10, 2025",
    time: "9:00 AM",
    venue: "Naga Heritage Village",
    address: "Kisama Heritage Village, Kohima, Nagaland 797001",
    price: 0,
    img: "https://images.unsplash.com/photo-1577083753695-e010191bacb5?w=1400&h=700&fit=crop&auto=format",
    tag: "Free",
    description: "The Festival of Festivals — ten days of Naga tribal culture, traditional music, warrior dance, indigenous food, and inter-tribal gathering at Kisama.",
    about: `The Hornbill Festival, initiated in 2000 by the Government of Nagaland, was designed as a platform for the 16+ tribes of Nagaland to showcase their traditions to each other and to the world. The hornbill — sacred to most Naga tribes and emblazoned on their traditional warriors' headgear — gives the festival its name.\n\nEach tribe maintains a traditional morung (bachelor's dormitory) at the Kisama Heritage Village, where tribal members live during the festival and perform their specific folk songs, dances, and warrior traditions. The experience is genuinely immersive: visitors eat tribal food, watch traditional games like the Naga wrestling and stone-pulling, and hear songs that have no written notation — passed orally for centuries.\n\nThe festival has done more to preserve Naga cultural traditions than any other government initiative, and has drawn international ethnomusicologists, photographers, and travellers from over 60 countries.`,
    artists: [
      { name: "Tetseo Sisters", role: "Chakhesang Folk Vocal", bio: "Four sisters whose a cappella vocal harmonies draw from Chakhesang Naga folk traditions. Their performances have been featured at global festivals." },
    ],
    ticketTiers: [
      { name: "Day Pass", price: 0, description: "Free entry for Indian nationals with a government ID", available: 5000 },
      { name: "International Visitor", price: 500, description: "Entry fee for international visitors", available: 1000 },
    ],
    organizer: "Government of Nagaland, Department of Art & Culture",
    duration: "Full day",
    language: "Multiple Naga dialects / English",
  },
  {
    id: 10,
    title: "Purab Meets Paschim — Jazz & Hindustani",
    category: "Music",
    city: "Mumbai",
    state: "Maharashtra",
    date: "Aug 3, 2026",
    time: "8:00 PM",
    venue: "NCPA Tata Theatre",
    address: "NCPA Marg, Nariman Point, Mumbai 400021",
    price: 1500,
    img: "https://images.unsplash.com/photo-1756382616831-998e8baf9675?w=1400&h=700&fit=crop&auto=format",
    tag: "New",
    description: "A single night of improvised conversation between Hindustani masters and a world-class jazz ensemble — at the NCPA's most prestigious stage.",
    about: `Purab Meets Paschim is a one-night collaboration between two musical traditions that share a philosophical core: the grammar of improvisation. Jazz and Hindustani music both centre on the relationship between a fixed structure and the performer's spontaneous response to it — the raga and the standard, the tala and the bar.\n\nThis performance brings together a Hindustani vocalist and sarangi player with an internationally acclaimed jazz quartet for a single night of structured improvisation. There is no pre-set setlist. The musicians will navigate a shared vocabulary developed over two weeks of residency, but every performance is irreproducible.\n\nThe NCPA Tata Theatre, with its 1,000-seat capacity and world-class acoustics, provides the ideal setting for this encounter.`,
    artists: [
      { name: "Kaushiki Chakraborty", role: "Hindustani Vocal", bio: "Daughter of Pandit Ajoy Chakraborty, Kaushiki is one of the most adventurous and technically accomplished vocalists of her generation." },
      { name: "Iyer Trio (USA)", role: "Jazz Piano / Bass / Drums", bio: "New York-based trio with three Grammy nominations and a recording on ECM Records. Known for their integration of South Asian rhythmic structures into jazz." },
    ],
    ticketTiers: [
      { name: "Rear Stalls", price: 1500, description: "Rear stalls, excellent acoustics", available: 300 },
      { name: "Mid Stalls", price: 2500, description: "Centre stalls with optimal acoustics", available: 200 },
      { name: "Front Stalls", price: 4000, description: "First 10 rows + pre-show cocktail reception", available: 60 },
    ],
    organizer: "NCPA Mumbai & Jazz India Circuit",
    duration: "2.5 hours (no interval)",
    language: "Instrumental / English",
  },
  {
    id: 11,
    title: "Dilli Haat Theatre Weekend",
    category: "Theatre",
    city: "Delhi",
    state: "Delhi",
    date: "Sep 12–14, 2025",
    time: "6:00 PM & 8:30 PM",
    venue: "Dilli Haat Open-Air Theatre",
    address: "Dilli Haat, INA, Sri Aurobindo Marg, New Delhi 110016",
    price: 150,
    img: "https://images.unsplash.com/photo-1716534133678-4eb3eee6e098?w=1400&h=700&fit=crop&auto=format",
    description: "Three days, six productions from Delhi's most inventive theatre companies — folk, physical, Hindi-language, and Urdu theatre under the open sky.",
    about: `The Dilli Haat Theatre Weekend is a micro-festival that concentrates Delhi's remarkable theatre scene into a single open-air venue over three evenings. Dilli Haat's craft market atmosphere — the smell of street food, the sight of artisans at work — provides a cultural backdrop that indoor venues cannot replicate.\n\nSix productions from Delhi's most interesting theatre companies perform in repertory: two shows each evening. The programme spans folk theatre forms (Nautanki, Tamasha), contemporary Hindi-language work, Urdu theatre from the NSD tradition, and physical theatre that bridges performance disciplines.\n\nTickets are priced to be accessible: ₹150 per show or ₹600 for the full weekend pass covering all six productions.`,
    artists: [
      { name: "M.K. Raina", role: "Director & Actor", bio: "Veteran of the National School of Drama and one of the most influential figures in Hindi theatre. Known for his productions of Brecht and folk-theatre adaptations." },
    ],
    ticketTiers: [
      { name: "Single Show", price: 150, description: "One performance of your choice", available: 250 },
      { name: "Weekend Pass", price: 600, description: "All six productions across three evenings", available: 80 },
    ],
    organizer: "Delhi Arts & Theatre Foundation",
    duration: "80–120 minutes per show",
    language: "Hindi / Urdu / English",
  },
  {
    id: 12,
    title: "Diwali Craft & Textile Mela",
    category: "Craft",
    city: "Delhi",
    state: "Delhi",
    date: "Oct 18–20, 2025",
    time: "10:00 AM – 9:00 PM",
    venue: "Pragati Maidan",
    address: "Pragati Maidan, Mathura Road, New Delhi 110001",
    price: 0,
    tag: "Free",
    img: "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?w=1400&h=700&fit=crop&auto=format",
    description: "Three days of India's finest craft traditions — Banarasi silk, Kutchi embroidery, Channapatna toys, Kondapalli dolls — ahead of Diwali.",
    about: `The Diwali Craft & Textile Mela brings together 300 artisans from 22 states to Pragati Maidan for the three days before Diwali. The mela focuses specifically on traditional craft forms threatened by industrial manufacturing — handwoven textiles, hand-painted objects, natural-dye work, and regional toy traditions.\n\nEach artisan is accompanied by a documentation team that records the making process and the community context. The mela is therefore as much an archive as a market. Live demonstrations run throughout the day: visitors can watch a weaver at a handloom, a kalamkari painter preparing natural dyes, or a Channapatna toy-maker turning lacquered wood.\n\nEntry is free. Purchases directly support the artisan families.`,
    artists: [
      { name: "Master Weavers Collective, Varanasi", role: "Banarasi Handloom", bio: "A cooperative of 40 handloom weavers from the Julaha community of Varanasi presenting their full range of katan silk, tanchoi, and brocade work." },
      { name: "Qasim Khan", role: "Kutchi Embroidery", bio: "Third-generation embroiderer from Bhuj whose work has been acquired by the Victoria & Albert Museum in London." },
    ],
    ticketTiers: [
      { name: "Free Entry", price: 0, description: "Open to all — no registration required", available: 20000 },
    ],
    organizer: "Crafts Council of India & DSIDC",
    duration: "All day",
    language: "Hindi / English / Regional",
  },
]

export const CATEGORIES = ["All", "Music", "Dance", "Theatre", "Folk", "Film", "Literature", "Craft"]

export const CAT_ICONS: Record<string, string> = {
  All: "✦",
  Music: "♪",
  Dance: "◈",
  Theatre: "◎",
  Folk: "❧",
  Film: "◉",
  Literature: "◆",
  Craft: "⬡",
}

export const CITIES = [
  { name: "Mumbai", count: 142, color: "#E8334A" },
  { name: "Delhi", count: 218, color: "#F4A01C" },
  { name: "Jaipur", count: 87, color: "#9B59B6" },
  { name: "Chennai", count: 95, color: "#1ABC9C" },
  { name: "Kolkata", count: 113, color: "#3498DB" },
  { name: "Varanasi", count: 64, color: "#FF6B00" },
  { name: "Bengaluru", count: 131, color: "#E91E8C" },
  { name: "Bhubaneswar", count: 48, color: "#F39C12" },
]
