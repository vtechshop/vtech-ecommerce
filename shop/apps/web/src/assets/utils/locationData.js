// Location data for checkout forms

// Countries list
export const COUNTRIES = [
  { value: 'IN', label: 'India' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'SG', label: 'Singapore' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'BD', label: 'Bangladesh' },
  { value: 'PK', label: 'Pakistan' },
  { value: 'LK', label: 'Sri Lanka' },
  { value: 'NP', label: 'Nepal' },
  { value: 'JP', label: 'Japan' },
  { value: 'CN', label: 'China' },
  { value: 'IT', label: 'Italy' },
  { value: 'ES', label: 'Spain' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BR', label: 'Brazil' }
];

export const DEFAULT_COUNTRY = 'IN';

// States/Provinces organized by country
export const STATES_BY_COUNTRY = {
  // India - States and Union Territories
  IN: [
    { value: 'AN', label: 'Andaman and Nicobar Islands' },
    { value: 'AP', label: 'Andhra Pradesh' },
    { value: 'AR', label: 'Arunachal Pradesh' },
    { value: 'AS', label: 'Assam' },
    { value: 'BR', label: 'Bihar' },
    { value: 'CH', label: 'Chandigarh' },
    { value: 'CT', label: 'Chhattisgarh' },
    { value: 'DN', label: 'Dadra and Nagar Haveli' },
    { value: 'DD', label: 'Daman and Diu' },
    { value: 'DL', label: 'Delhi' },
    { value: 'GA', label: 'Goa' },
    { value: 'GJ', label: 'Gujarat' },
    { value: 'HR', label: 'Haryana' },
    { value: 'HP', label: 'Himachal Pradesh' },
    { value: 'JK', label: 'Jammu and Kashmir' },
    { value: 'JH', label: 'Jharkhand' },
    { value: 'KA', label: 'Karnataka' },
    { value: 'KL', label: 'Kerala' },
    { value: 'LA', label: 'Ladakh' },
    { value: 'LD', label: 'Lakshadweep' },
    { value: 'MP', label: 'Madhya Pradesh' },
    { value: 'MH', label: 'Maharashtra' },
    { value: 'MN', label: 'Manipur' },
    { value: 'ML', label: 'Meghalaya' },
    { value: 'MZ', label: 'Mizoram' },
    { value: 'NL', label: 'Nagaland' },
    { value: 'OR', label: 'Odisha' },
    { value: 'PY', label: 'Puducherry' },
    { value: 'PB', label: 'Punjab' },
    { value: 'RJ', label: 'Rajasthan' },
    { value: 'SK', label: 'Sikkim' },
    { value: 'TN', label: 'Tamil Nadu' },
    { value: 'TG', label: 'Telangana' },
    { value: 'TR', label: 'Tripura' },
    { value: 'UP', label: 'Uttar Pradesh' },
    { value: 'UT', label: 'Uttarakhand' },
    { value: 'WB', label: 'West Bengal' }
  ],

  // United States - States
  US: [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' },
    { value: 'DC', label: 'District of Columbia' }
  ],

  // United Kingdom - Countries/Regions
  GB: [
    { value: 'ENG', label: 'England' },
    { value: 'SCT', label: 'Scotland' },
    { value: 'WLS', label: 'Wales' },
    { value: 'NIR', label: 'Northern Ireland' }
  ],

  // Canada - Provinces and Territories
  CA: [
    { value: 'AB', label: 'Alberta' },
    { value: 'BC', label: 'British Columbia' },
    { value: 'MB', label: 'Manitoba' },
    { value: 'NB', label: 'New Brunswick' },
    { value: 'NL', label: 'Newfoundland and Labrador' },
    { value: 'NS', label: 'Nova Scotia' },
    { value: 'ON', label: 'Ontario' },
    { value: 'PE', label: 'Prince Edward Island' },
    { value: 'QC', label: 'Quebec' },
    { value: 'SK', label: 'Saskatchewan' },
    { value: 'NT', label: 'Northwest Territories' },
    { value: 'NU', label: 'Nunavut' },
    { value: 'YT', label: 'Yukon' }
  ],

  // Australia - States and Territories
  AU: [
    { value: 'NSW', label: 'New South Wales' },
    { value: 'QLD', label: 'Queensland' },
    { value: 'SA', label: 'South Australia' },
    { value: 'TAS', label: 'Tasmania' },
    { value: 'VIC', label: 'Victoria' },
    { value: 'WA', label: 'Western Australia' },
    { value: 'ACT', label: 'Australian Capital Territory' },
    { value: 'NT', label: 'Northern Territory' }
  ],

  // France - Regions
  FR: [
    { value: 'ARA', label: 'Auvergne-Rhône-Alpes' },
    { value: 'BFC', label: 'Bourgogne-Franche-Comté' },
    { value: 'BRE', label: 'Bretagne' },
    { value: 'CVL', label: 'Centre-Val de Loire' },
    { value: 'COR', label: 'Corse' },
    { value: 'GES', label: 'Grand Est' },
    { value: 'HDF', label: 'Hauts-de-France' },
    { value: 'IDF', label: 'Île-de-France' },
    { value: 'NOR', label: 'Normandie' },
    { value: 'NAQ', label: 'Nouvelle-Aquitaine' },
    { value: 'OCC', label: 'Occitanie' },
    { value: 'PDL', label: 'Pays de la Loire' },
    { value: 'PAC', label: "Provence-Alpes-Côte d'Azur" }
  ],

  // Germany - States (Bundesländer)
  DE: [
    { value: 'BW', label: 'Baden-Württemberg' },
    { value: 'BY', label: 'Bavaria (Bayern)' },
    { value: 'BE', label: 'Berlin' },
    { value: 'BB', label: 'Brandenburg' },
    { value: 'HB', label: 'Bremen' },
    { value: 'HH', label: 'Hamburg' },
    { value: 'HE', label: 'Hesse (Hessen)' },
    { value: 'MV', label: 'Mecklenburg-Vorpommern' },
    { value: 'NI', label: 'Lower Saxony (Niedersachsen)' },
    { value: 'NW', label: 'North Rhine-Westphalia (Nordrhein-Westfalen)' },
    { value: 'RP', label: 'Rhineland-Palatinate (Rheinland-Pfalz)' },
    { value: 'SL', label: 'Saarland' },
    { value: 'SN', label: 'Saxony (Sachsen)' },
    { value: 'ST', label: 'Saxony-Anhalt (Sachsen-Anhalt)' },
    { value: 'SH', label: 'Schleswig-Holstein' },
    { value: 'TH', label: 'Thuringia (Thüringen)' }
  ],

  // Singapore - No states (city-state)
  SG: [
    { value: 'SG', label: 'Singapore' }
  ],

  // UAE - Emirates
  AE: [
    { value: 'AZ', label: 'Abu Dhabi' },
    { value: 'AJ', label: 'Ajman' },
    { value: 'DU', label: 'Dubai' },
    { value: 'FU', label: 'Fujairah' },
    { value: 'RK', label: 'Ras Al Khaimah' },
    { value: 'SH', label: 'Sharjah' },
    { value: 'UQ', label: 'Umm Al Quwain' }
  ],

  // Malaysia - States
  MY: [
    { value: 'JHR', label: 'Johor' },
    { value: 'KDH', label: 'Kedah' },
    { value: 'KTN', label: 'Kelantan' },
    { value: 'KUL', label: 'Kuala Lumpur' },
    { value: 'LBN', label: 'Labuan' },
    { value: 'MLK', label: 'Malacca' },
    { value: 'NSN', label: 'Negeri Sembilan' },
    { value: 'PHG', label: 'Pahang' },
    { value: 'PNG', label: 'Penang' },
    { value: 'PRK', label: 'Perak' },
    { value: 'PLS', label: 'Perlis' },
    { value: 'PJY', label: 'Putrajaya' },
    { value: 'SBH', label: 'Sabah' },
    { value: 'SWK', label: 'Sarawak' },
    { value: 'SGR', label: 'Selangor' },
    { value: 'TRG', label: 'Terengganu' }
  ],

  // Spain - Autonomous Communities
  ES: [
    { value: 'AN', label: 'Andalusia' },
    { value: 'AR', label: 'Aragon' },
    { value: 'AS', label: 'Asturias' },
    { value: 'IB', label: 'Balearic Islands' },
    { value: 'PV', label: 'Basque Country' },
    { value: 'CN', label: 'Canary Islands' },
    { value: 'CB', label: 'Cantabria' },
    { value: 'CL', label: 'Castile and León' },
    { value: 'CM', label: 'Castile-La Mancha' },
    { value: 'CT', label: 'Catalonia' },
    { value: 'CE', label: 'Ceuta' },
    { value: 'EX', label: 'Extremadura' },
    { value: 'GA', label: 'Galicia' },
    { value: 'RI', label: 'La Rioja' },
    { value: 'MD', label: 'Madrid' },
    { value: 'ML', label: 'Melilla' },
    { value: 'MC', label: 'Murcia' },
    { value: 'NC', label: 'Navarre' },
    { value: 'VC', label: 'Valencian Community' }
  ],

  // Italy - Regions
  IT: [
    { value: 'ABR', label: 'Abruzzo' },
    { value: 'BAS', label: 'Basilicata' },
    { value: 'CAL', label: 'Calabria' },
    { value: 'CAM', label: 'Campania' },
    { value: 'EMR', label: 'Emilia-Romagna' },
    { value: 'FVG', label: 'Friuli-Venezia Giulia' },
    { value: 'LAZ', label: 'Lazio' },
    { value: 'LIG', label: 'Liguria' },
    { value: 'LOM', label: 'Lombardy' },
    { value: 'MAR', label: 'Marche' },
    { value: 'MOL', label: 'Molise' },
    { value: 'PMN', label: 'Piedmont' },
    { value: 'PUG', label: 'Apulia' },
    { value: 'SAR', label: 'Sardinia' },
    { value: 'SIC', label: 'Sicily' },
    { value: 'TOS', label: 'Tuscany' },
    { value: 'TAA', label: 'Trentino-South Tyrol' },
    { value: 'UMB', label: 'Umbria' },
    { value: 'VDA', label: "Aosta Valley" },
    { value: 'VEN', label: 'Veneto' }
  ],

  // Netherlands - Provinces
  NL: [
    { value: 'DR', label: 'Drenthe' },
    { value: 'FL', label: 'Flevoland' },
    { value: 'FR', label: 'Friesland' },
    { value: 'GE', label: 'Gelderland' },
    { value: 'GR', label: 'Groningen' },
    { value: 'LI', label: 'Limburg' },
    { value: 'NB', label: 'North Brabant' },
    { value: 'NH', label: 'North Holland' },
    { value: 'OV', label: 'Overijssel' },
    { value: 'UT', label: 'Utrecht' },
    { value: 'ZE', label: 'Zeeland' },
    { value: 'ZH', label: 'South Holland' }
  ],

  // Brazil - States
  BR: [
    { value: 'AC', label: 'Acre' },
    { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' },
    { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Federal District' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' },
    { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' },
    { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' },
    { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' }
  ],

  // Japan - Prefectures (47 prefectures)
  JP: [
    { value: 'AIH', label: 'Aichi' },
    { value: 'AKI', label: 'Akita' },
    { value: 'AOM', label: 'Aomori' },
    { value: 'CHI', label: 'Chiba' },
    { value: 'EHI', label: 'Ehime' },
    { value: 'FKI', label: 'Fukui' },
    { value: 'FKO', label: 'Fukuoka' },
    { value: 'FKS', label: 'Fukushima' },
    { value: 'GIF', label: 'Gifu' },
    { value: 'GUM', label: 'Gunma' },
    { value: 'HIR', label: 'Hiroshima' },
    { value: 'HKD', label: 'Hokkaido' },
    { value: 'HYO', label: 'Hyogo' },
    { value: 'IBA', label: 'Ibaraki' },
    { value: 'ISH', label: 'Ishikawa' },
    { value: 'IWA', label: 'Iwate' },
    { value: 'KAG', label: 'Kagawa' },
    { value: 'KGS', label: 'Kagoshima' },
    { value: 'KAN', label: 'Kanagawa' },
    { value: 'KOC', label: 'Kochi' },
    { value: 'KUM', label: 'Kumamoto' },
    { value: 'KYO', label: 'Kyoto' },
    { value: 'MIE', label: 'Mie' },
    { value: 'MIY', label: 'Miyagi' },
    { value: 'MYZ', label: 'Miyazaki' },
    { value: 'NAG', label: 'Nagano' },
    { value: 'NGS', label: 'Nagasaki' },
    { value: 'NAR', label: 'Nara' },
    { value: 'NII', label: 'Niigata' },
    { value: 'OIT', label: 'Oita' },
    { value: 'OKA', label: 'Okayama' },
    { value: 'OKI', label: 'Okinawa' },
    { value: 'OSA', label: 'Osaka' },
    { value: 'SAG', label: 'Saga' },
    { value: 'SAI', label: 'Saitama' },
    { value: 'SHG', label: 'Shiga' },
    { value: 'SHI', label: 'Shimane' },
    { value: 'SHZ', label: 'Shizuoka' },
    { value: 'TCH', label: 'Tochigi' },
    { value: 'TOK', label: 'Tokyo' },
    { value: 'TKS', label: 'Tokushima' },
    { value: 'TOT', label: 'Tottori' },
    { value: 'TOY', label: 'Toyama' },
    { value: 'WAK', label: 'Wakayama' },
    { value: 'YAM', label: 'Yamagata' },
    { value: 'YAC', label: 'Yamaguchi' },
    { value: 'YAN', label: 'Yamanashi' }
  ],

  // China - Provinces and Special Administrative Regions
  CN: [
    { value: 'AH', label: 'Anhui' },
    { value: 'BJ', label: 'Beijing' },
    { value: 'CQ', label: 'Chongqing' },
    { value: 'FJ', label: 'Fujian' },
    { value: 'GS', label: 'Gansu' },
    { value: 'GD', label: 'Guangdong' },
    { value: 'GX', label: 'Guangxi' },
    { value: 'GZ', label: 'Guizhou' },
    { value: 'HI', label: 'Hainan' },
    { value: 'HE', label: 'Hebei' },
    { value: 'HL', label: 'Heilongjiang' },
    { value: 'HA', label: 'Henan' },
    { value: 'HK', label: 'Hong Kong' },
    { value: 'HB', label: 'Hubei' },
    { value: 'HN', label: 'Hunan' },
    { value: 'NM', label: 'Inner Mongolia' },
    { value: 'JS', label: 'Jiangsu' },
    { value: 'JX', label: 'Jiangxi' },
    { value: 'JL', label: 'Jilin' },
    { value: 'LN', label: 'Liaoning' },
    { value: 'MO', label: 'Macau' },
    { value: 'NX', label: 'Ningxia' },
    { value: 'QH', label: 'Qinghai' },
    { value: 'SN', label: 'Shaanxi' },
    { value: 'SD', label: 'Shandong' },
    { value: 'SH', label: 'Shanghai' },
    { value: 'SX', label: 'Shanxi' },
    { value: 'SC', label: 'Sichuan' },
    { value: 'TW', label: 'Taiwan' },
    { value: 'TJ', label: 'Tianjin' },
    { value: 'XJ', label: 'Xinjiang' },
    { value: 'XZ', label: 'Tibet' },
    { value: 'YN', label: 'Yunnan' },
    { value: 'ZJ', label: 'Zhejiang' }
  ],

  // Pakistan - Provinces and Territories
  PK: [
    { value: 'BA', label: 'Balochistan' },
    { value: 'IS', label: 'Islamabad Capital Territory' },
    { value: 'KP', label: 'Khyber Pakhtunkhwa' },
    { value: 'PB', label: 'Punjab' },
    { value: 'SD', label: 'Sindh' },
    { value: 'GB', label: 'Gilgit-Baltistan' },
    { value: 'JK', label: 'Azad Jammu and Kashmir' }
  ],

  // Bangladesh - Divisions
  BD: [
    { value: 'BAR', label: 'Barisal' },
    { value: 'CHI', label: 'Chittagong' },
    { value: 'DHA', label: 'Dhaka' },
    { value: 'KHU', label: 'Khulna' },
    { value: 'MYM', label: 'Mymensingh' },
    { value: 'RAJ', label: 'Rajshahi' },
    { value: 'RAN', label: 'Rangpur' },
    { value: 'SYL', label: 'Sylhet' }
  ],

  // Sri Lanka - Provinces
  LK: [
    { value: 'CE', label: 'Central Province' },
    { value: 'EA', label: 'Eastern Province' },
    { value: 'NC', label: 'North Central Province' },
    { value: 'NO', label: 'Northern Province' },
    { value: 'NW', label: 'North Western Province' },
    { value: 'SA', label: 'Sabaragamuwa Province' },
    { value: 'SO', label: 'Southern Province' },
    { value: 'UV', label: 'Uva Province' },
    { value: 'WE', label: 'Western Province' }
  ],

  // Nepal - Provinces
  NP: [
    { value: 'P1', label: 'Koshi Province' },
    { value: 'P2', label: 'Madhesh Province' },
    { value: 'P3', label: 'Bagmati Province' },
    { value: 'P4', label: 'Gandaki Province' },
    { value: 'P5', label: 'Lumbini Province' },
    { value: 'P6', label: 'Karnali Province' },
    { value: 'P7', label: 'Sudurpashchim Province' }
  ]
};

// Helper function to get states for a specific country
export const getStatesForCountry = (countryCode) => {
  return STATES_BY_COUNTRY[countryCode] || [];
};

// Legacy export for backward compatibility (defaults to India)
export const INDIAN_STATES = STATES_BY_COUNTRY.IN;
