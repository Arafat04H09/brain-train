export interface CalibItem {
  id: string;
  category: 'geography' | 'history' | 'science' | 'logic' | 'estimation';
  question: string;
  choices: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const CALIBRATION_ITEMS: CalibItem[] = [
  // Geography (easy)
  {
    id: 'geo-001',
    category: 'geography',
    question: 'What is the capital of France?',
    choices: ['London', 'Paris', 'Berlin', 'Rome'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'geo-002',
    category: 'geography',
    question: 'What is the capital of Australia?',
    choices: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'geo-003',
    category: 'geography',
    question: 'Which river is the longest in the world?',
    choices: ['Amazon', 'Yangtze', 'Nile', 'Mississippi'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'geo-004',
    category: 'geography',
    question: 'What is the capital of Japan?',
    choices: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama'],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'geo-005',
    category: 'geography',
    question: 'Which country has the most islands?',
    choices: ['Indonesia', 'Philippines', 'Sweden', 'Norway'],
    correctIndex: 0,
    difficulty: 'hard'
  },
  {
    id: 'geo-006',
    category: 'geography',
    question: 'What is the capital of Brazil?',
    choices: ['Rio de Janeiro', 'São Paulo', 'Brasília', 'Salvador'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'geo-007',
    category: 'geography',
    question: 'Which mountain is the highest in the world?',
    choices: ['K2', 'Mount Everest', 'Kangchenjunga', 'Lhotse'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'geo-008',
    category: 'geography',
    question: 'What is the capital of Canada?',
    choices: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa'],
    correctIndex: 3,
    difficulty: 'medium'
  },

  // History (medium)
  {
    id: 'hist-001',
    category: 'history',
    question: 'In what year did the Berlin Wall fall?',
    choices: ['1987', '1988', '1989', '1990'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'hist-002',
    category: 'history',
    question: 'Who was the first President of the United States?',
    choices: ['Thomas Jefferson', 'George Washington', 'John Adams', 'Benjamin Franklin'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'hist-003',
    category: 'history',
    question: 'In what year did World War II end?',
    choices: ['1943', '1944', '1945', '1946'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'hist-004',
    category: 'history',
    question: 'Who invented the telephone?',
    choices: ['Nikola Tesla', 'Thomas Edison', 'Alexander Graham Bell', 'Guglielmo Marconi'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'hist-005',
    category: 'history',
    question: 'In what year did the Titanic sink?',
    choices: ['1910', '1911', '1912', '1913'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'hist-006',
    category: 'history',
    question: 'Who was the first person to walk on the moon?',
    choices: ['Buzz Aldrin', 'Neil Armstrong', 'Yuri Gagarin', 'John Glenn'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'hist-007',
    category: 'history',
    question: 'In what year did the American Declaration of Independence occur?',
    choices: ['1773', '1774', '1775', '1776'],
    correctIndex: 3,
    difficulty: 'medium'
  },
  {
    id: 'hist-008',
    category: 'history',
    question: 'Who painted the Mona Lisa?',
    choices: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'],
    correctIndex: 1,
    difficulty: 'easy'
  },

  // Science (medium/hard)
  {
    id: 'sci-001',
    category: 'science',
    question: 'What is the chemical symbol for gold?',
    choices: ['Go', 'Gd', 'Au', 'Ag'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-002',
    category: 'science',
    question: 'What is the smallest unit of life?',
    choices: ['Molecule', 'Atom', 'Cell', 'Organelle'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'sci-003',
    category: 'science',
    question: 'How many bones are in the adult human body?',
    choices: ['186', '206', '226', '246'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'sci-004',
    category: 'science',
    question: 'What is the speed of light in vacuum (m/s)?',
    choices: ['250,000,000', '299,792,458', '350,000,000', '400,000,000'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'sci-005',
    category: 'science',
    question: 'What element has the atomic number 1?',
    choices: ['Helium', 'Hydrogen', 'Lithium', 'Beryllium'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'sci-006',
    category: 'science',
    question: 'What is the most abundant element in the Earth\'s atmosphere?',
    choices: ['Oxygen', 'Nitrogen', 'Argon', 'Carbon dioxide'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'sci-007',
    category: 'science',
    question: 'How long is one light year in kilometers (approximately)?',
    choices: ['6.1 trillion', '7.4 trillion', '9.5 trillion', '12.3 trillion'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'sci-008',
    category: 'science',
    question: 'Mitochondria are responsible for:',
    choices: ['Protein synthesis', 'Energy production', 'Photosynthesis', 'Waste removal'],
    correctIndex: 1,
    difficulty: 'medium'
  },

  // Logic (medium/hard)
  {
    id: 'logic-001',
    category: 'logic',
    question: 'All roses are flowers. Some flowers fade quickly. What must be true?',
    choices: ['Some roses fade quickly', 'All flowers fade quickly', 'No roses fade quickly', 'Some flowers do not fade quickly'],
    correctIndex: 0,
    difficulty: 'medium'
  },
  {
    id: 'logic-002',
    category: 'logic',
    question: 'If A is greater than B, and B is greater than C, then A is:',
    choices: ['Less than C', 'Greater than C', 'Equal to C', 'Not comparable to C'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'logic-003',
    category: 'logic',
    question: 'All cats are animals. Whiskers is a cat. Therefore, Whiskers is:',
    choices: ['Not an animal', 'An animal', 'Maybe an animal', 'A dog'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'logic-004',
    category: 'logic',
    question: 'If no reptiles are mammals, and snakes are reptiles, then snakes are:',
    choices: ['Mammals', 'Not mammals', 'Sometimes mammals', 'Possibly mammals'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'logic-005',
    category: 'logic',
    question: 'If it rains, the ground is wet. The ground is wet. Therefore:',
    choices: ['It definitely rained', 'It might have rained', 'It did not rain', 'We cannot determine if it rained'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'logic-006',
    category: 'logic',
    question: 'All even numbers are divisible by 2. 10 is even. What is true?',
    choices: ['10 is not divisible by 2', '10 is divisible by 2', '10 might not be divisible by 2', '10 is odd'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'logic-007',
    category: 'logic',
    question: 'Some birds cannot fly. Penguins are birds. Which is true?',
    choices: ['Penguins can fly', 'Penguins cannot fly', 'Penguins might not fly', 'All birds can fly'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'logic-008',
    category: 'logic',
    question: 'If A implies B, and B is false, then A is:',
    choices: ['True', 'False', 'Indeterminate', 'Both true and false'],
    correctIndex: 1,
    difficulty: 'hard'
  },

  // Estimation (medium/hard)
  {
    id: 'est-001',
    category: 'estimation',
    question: 'How many countries are in Africa?',
    choices: ['48', '54', '60', '67'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'est-002',
    category: 'estimation',
    question: 'Approximately how many people live in the world?',
    choices: ['6.5 billion', '7.5 billion', '8.5 billion', '9.5 billion'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'est-003',
    category: 'estimation',
    question: 'What is the approximate distance from Earth to the Sun (in millions of km)?',
    choices: ['100', '150', '200', '250'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'est-004',
    category: 'estimation',
    question: 'How many states does the United States have?',
    choices: ['48', '50', '52', '54'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'est-005',
    category: 'estimation',
    question: 'Approximately how many muscles does the human body have?',
    choices: ['206', '400', '600', '900'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-006',
    category: 'estimation',
    question: 'What is the approximate land area of the United States (in million km²)?',
    choices: ['6', '9', '12', '15'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'est-007',
    category: 'estimation',
    question: 'How many countries are in the European Union (as of 2024)?',
    choices: ['25', '27', '29', '31'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'est-008',
    category: 'estimation',
    question: 'What is the approximate diameter of the Earth (in km)?',
    choices: ['10,000', '12,700', '15,000', '20,000'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'est-009',
    category: 'estimation',
    question: 'How many strings does a standard piano have?',
    choices: ['72', '88', '210', '290'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-010',
    category: 'estimation',
    question: 'Approximately how many lakes are in Canada?',
    choices: ['25,000', '50,000', '100,000', '250,000'],
    correctIndex: 1,
    difficulty: 'hard'
  },

  // Additional items to reach 50
  {
    id: 'geo-009',
    category: 'geography',
    question: 'What is the longest river in Europe?',
    choices: ['Danube', 'Rhine', 'Volga', 'Thames'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'hist-009',
    category: 'history',
    question: 'In what year was the Magna Carta signed?',
    choices: ['1115', '1165', '1215', '1265'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'sci-009',
    category: 'science',
    question: 'What is the pH of pure water at 25°C?',
    choices: ['5', '6', '7', '8'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'logic-009',
    category: 'logic',
    question: 'If A = B and B = C, then A = C. This is:',
    choices: ['Not necessarily true', 'True', 'False', 'Indeterminate'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'est-011',
    category: 'estimation',
    question: 'What is the approximate population of India (in billions)?',
    choices: ['1.0', '1.2', '1.4', '1.6'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'geo-010',
    category: 'geography',
    question: 'How many continents are there?',
    choices: ['5', '6', '7', '8'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'hist-010',
    category: 'history',
    question: 'In what year was the Declaration of the Rights of Man and of the Citizen adopted?',
    choices: ['1786', '1787', '1789', '1791'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'sci-010',
    category: 'science',
    question: 'What is the boiling point of water at sea level (in Celsius)?',
    choices: ['90', '100', '110', '120'],
    correctIndex: 1,
    difficulty: 'easy'
  },

  // Extended Geography (geo-011 to geo-060)
  {
    id: 'geo-011',
    category: 'geography',
    question: 'What is the capital of Italy?',
    choices: ['Florence', 'Venice', 'Rome', 'Milan'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'geo-012',
    category: 'geography',
    question: 'What is the capital of Germany?',
    choices: ['Munich', 'Hamburg', 'Berlin', 'Frankfurt'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'geo-013',
    category: 'geography',
    question: 'What is the capital of Spain?',
    choices: ['Barcelona', 'Madrid', 'Seville', 'Valencia'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'geo-014',
    category: 'geography',
    question: 'What is the capital of Mexico?',
    choices: ['Cancun', 'Guadalajara', 'Mexico City', 'Monterrey'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'geo-015',
    category: 'geography',
    question: 'What is the capital of Egypt?',
    choices: ['Alexandria', 'Giza', 'Cairo', 'Aswan'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'geo-016',
    category: 'geography',
    question: 'What is the capital of South Africa?',
    choices: ['Cape Town', 'Johannesburg', 'Pretoria', 'Durban'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'geo-017',
    category: 'geography',
    question: 'What is the capital of Kenya?',
    choices: ['Mombasa', 'Nairobi', 'Kisumu', 'Nakuru'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-018',
    category: 'geography',
    question: 'What is the capital of Argentina?',
    choices: ['Córdoba', 'Buenos Aires', 'Rosario', 'Mendoza'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-019',
    category: 'geography',
    question: 'What is the capital of Thailand?',
    choices: ['Phuket', 'Chiang Mai', 'Bangkok', 'Pattaya'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'geo-020',
    category: 'geography',
    question: 'What is the capital of Greece?',
    choices: ['Thessaloniki', 'Athens', 'Patras', 'Heraklion'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'geo-021',
    category: 'geography',
    question: 'Which mountain range contains Mount Kilimanjaro?',
    choices: ['Andes', 'Rockies', 'Eastern Arc Mountains', 'Atlas'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'geo-022',
    category: 'geography',
    question: 'What is the second-longest river in the world?',
    choices: ['Nile', 'Congo', 'Amazon', 'Yangtze'],
    correctIndex: 3,
    difficulty: 'medium'
  },
  {
    id: 'geo-023',
    category: 'geography',
    question: 'Which desert is the largest in the world?',
    choices: ['Kalahari', 'Gobi', 'Antarctic', 'Sahara'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'geo-024',
    category: 'geography',
    question: 'What is the capital of Portugal?',
    choices: ['Porto', 'Lisbon', 'Covilha', 'Aveiro'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-025',
    category: 'geography',
    question: 'What is the capital of Turkey?',
    choices: ['Istanbul', 'Ankara', 'Izmir', 'Bursa'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-026',
    category: 'geography',
    question: 'What is the capital of Poland?',
    choices: ['Krakow', 'Warsaw', 'Gdansk', 'Wroclaw'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-027',
    category: 'geography',
    question: 'Which is the largest country by area?',
    choices: ['Canada', 'Russia', 'United States', 'China'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'geo-028',
    category: 'geography',
    question: 'What is the capital of New Zealand?',
    choices: ['Auckland', 'Christchurch', 'Wellington', 'Dunedin'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'geo-029',
    category: 'geography',
    question: 'What is the capital of Sweden?',
    choices: ['Gothenburg', 'Stockholm', 'Malmö', 'Uppsala'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-030',
    category: 'geography',
    question: 'Which river is the longest in South America?',
    choices: ['Paraná', 'Amazon', 'Orinoco', 'São Francisco'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-031',
    category: 'geography',
    question: 'What is the capital of Vietnam?',
    choices: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hue'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-032',
    category: 'geography',
    question: 'What is the capital of Indonesia?',
    choices: ['Surabaya', 'Jakarta', 'Bandung', 'Medan'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-033',
    category: 'geography',
    question: 'What is the capital of Pakistan?',
    choices: ['Karachi', 'Lahore', 'Islamabad', 'Peshawar'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'geo-034',
    category: 'geography',
    question: 'Which is the largest ocean on Earth?',
    choices: ['Atlantic', 'Arctic', 'Indian', 'Pacific'],
    correctIndex: 3,
    difficulty: 'easy'
  },
  {
    id: 'geo-035',
    category: 'geography',
    question: 'What is the capital of Chile?',
    choices: ['Valparaíso', 'Santiago', 'Concepción', 'Puerto Montt'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-036',
    category: 'geography',
    question: 'What is the capital of Norway?',
    choices: ['Bergen', 'Oslo', 'Stavanger', 'Trondheim'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-037',
    category: 'geography',
    question: 'Which is the deepest ocean trench?',
    choices: ['Mariana Trench', 'Tonga Trench', 'Philippine Trench', 'Kuril-Kamchatka Trench'],
    correctIndex: 0,
    difficulty: 'hard'
  },
  {
    id: 'geo-038',
    category: 'geography',
    question: 'What is the capital of Ireland?',
    choices: ['Cork', 'Dublin', 'Galway', 'Limerick'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'geo-039',
    category: 'geography',
    question: 'What is the capital of Scotland?',
    choices: ['Glasgow', 'Edinburgh', 'Aberdeen', 'Dundee'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-040',
    category: 'geography',
    question: 'Which country is home to Mount Fuji?',
    choices: ['China', 'Korea', 'Japan', 'Taiwan'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'geo-041',
    category: 'geography',
    question: 'What is the capital of Switzerland?',
    choices: ['Zurich', 'Geneva', 'Bern', 'Basel'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'geo-042',
    category: 'geography',
    question: 'What is the capital of Austria?',
    choices: ['Salzburg', 'Vienna', 'Innsbruck', 'Graz'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-043',
    category: 'geography',
    question: 'What is the capital of Czech Republic?',
    choices: ['Brno', 'Prague', 'Plzen', 'Ostrava'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-044',
    category: 'geography',
    question: 'Which country is the most populous in Africa?',
    choices: ['Egypt', 'Nigeria', 'Ethiopia', 'Kenya'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-045',
    category: 'geography',
    question: 'What is the capital of Hungary?',
    choices: ['Szeged', 'Budapest', 'Debrecen', 'Pécs'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-046',
    category: 'geography',
    question: 'Which country contains the Great Barrier Reef?',
    choices: ['Fiji', 'Australia', 'Indonesia', 'Papua New Guinea'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'geo-047',
    category: 'geography',
    question: 'What is the capital of Romania?',
    choices: ['Cluj-Napoca', 'Bucharest', 'Brașov', 'Constanța'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-048',
    category: 'geography',
    question: 'What is the capital of Bulgaria?',
    choices: ['Plovdiv', 'Sofia', 'Varna', 'Burgas'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-049',
    category: 'geography',
    question: 'Which desert is in North Africa?',
    choices: ['Gobi', 'Kalahari', 'Atacama', 'Sahara'],
    correctIndex: 3,
    difficulty: 'easy'
  },
  {
    id: 'geo-050',
    category: 'geography',
    question: 'What is the capital of Israel?',
    choices: ['Tel Aviv', 'Jerusalem', 'Haifa', 'Beersheba'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-051',
    category: 'geography',
    question: 'What is the capital of Peru?',
    choices: ['Cusco', 'Lima', 'Arequipa', 'Trujillo'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-052',
    category: 'geography',
    question: 'What is the capital of Colombia?',
    choices: ['Medellín', 'Bogotá', 'Cali', 'Barranquilla'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-053',
    category: 'geography',
    question: 'Which mountain range is in South America?',
    choices: ['Alps', 'Rocky Mountains', 'Himalayas', 'Andes'],
    correctIndex: 3,
    difficulty: 'easy'
  },
  {
    id: 'geo-054',
    category: 'geography',
    question: 'What is the capital of Belgium?',
    choices: ['Antwerp', 'Brussels', 'Ghent', 'Bruges'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-055',
    category: 'geography',
    question: 'What is the capital of Netherlands?',
    choices: ['Rotterdam', 'Amsterdam', 'Utrecht', 'The Hague'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-056',
    category: 'geography',
    question: 'Which is the hottest place on Earth?',
    choices: ['Atacama', 'Death Valley', 'Lut Desert', 'Sahara'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'geo-057',
    category: 'geography',
    question: 'What is the capital of Ukraine?',
    choices: ['Kharkiv', 'Kiev', 'Donetsk', 'Odesa'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geo-058',
    category: 'geography',
    question: 'What is the largest city in Greece?',
    choices: ['Salonica', 'Patras', 'Athens', 'Corinth'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'geo-059',
    category: 'geography',
    question: 'Which country is known as the Emerald Isle?',
    choices: ['England', 'Scotland', 'Ireland', 'Wales'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'geo-060',
    category: 'geography',
    question: 'What is the capital of Singapore?',
    choices: ['Changi', 'Singapore', 'Marina', 'Jurong'],
    correctIndex: 1,
    difficulty: 'easy'
  },

  // Extended History (hist-011 to hist-070)
  {
    id: 'hist-011',
    category: 'history',
    question: 'In what year did the Roman Empire fall?',
    choices: ['410', '476', '527', '565'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'hist-012',
    category: 'history',
    question: 'Who was the first Roman Emperor?',
    choices: ['Julius Caesar', 'Augustus', 'Nero', 'Trajan'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'hist-013',
    category: 'history',
    question: 'In what year did Christopher Columbus reach the Americas?',
    choices: ['1490', '1491', '1492', '1493'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'hist-014',
    category: 'history',
    question: 'Who was the longest-reigning British monarch before Elizabeth II?',
    choices: ['George III', 'Victoria', 'Edward VII', 'George V'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'hist-015',
    category: 'history',
    question: 'In what year did the French Revolution begin?',
    choices: ['1787', '1788', '1789', '1790'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'hist-016',
    category: 'history',
    question: 'Who was the first President of Russia after the Soviet Union?',
    choices: ['Mikhail Gorbachev', 'Boris Yeltsin', 'Vladimir Putin', 'Dmitry Medvedev'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'hist-017',
    category: 'history',
    question: 'In what year did World War I begin?',
    choices: ['1912', '1913', '1914', '1915'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'hist-018',
    category: 'history',
    question: 'Who was the first Prime Minister of India?',
    choices: ['Rajendra Prasad', 'Jawaharlal Nehru', 'Sardar Vallabhbhai Patel', 'Lal Bahadur Shastri'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'hist-019',
    category: 'history',
    question: 'In what year did the Cuban Missile Crisis occur?',
    choices: ['1960', '1961', '1962', '1963'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'hist-020',
    category: 'history',
    question: 'Who founded the Byzantine Empire?',
    choices: ['Justinian I', 'Constantine I', 'Theodosius I', 'Diocletian'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'hist-021',
    category: 'history',
    question: 'In what year did the Gutenberg printing press appear?',
    choices: ['1430', '1440', '1450', '1460'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'hist-022',
    category: 'history',
    question: 'Who was the longest-reigning French king?',
    choices: ['Louis XIII', 'Louis XIV', 'Louis XV', 'Louis XVI'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'hist-023',
    category: 'history',
    question: 'In what year did India gain independence?',
    choices: ['1945', '1946', '1947', '1948'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'hist-024',
    category: 'history',
    question: 'Who was the first Secretary-General of the United Nations?',
    choices: ['Dag Hammarskjöld', 'Trygve Lie', 'Ralph Bunche', 'Cordell Hull'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'hist-025',
    category: 'history',
    question: 'In what year did Pearl Harbor occur?',
    choices: ['1940', '1941', '1942', '1943'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'hist-026',
    category: 'history',
    question: 'Who was the third President of the United States?',
    choices: ['James Madison', 'Thomas Jefferson', 'James Monroe', 'John Quincy Adams'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'hist-027',
    category: 'history',
    question: 'In what year did Czechoslovakia split?',
    choices: ['1990', '1991', '1992', '1993'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'hist-028',
    category: 'history',
    question: 'Who assassinated Archduke Franz Ferdinand?',
    choices: ['Gavrilo Princip', 'Leon Czolgosz', 'Lee Harvey Oswald', 'Sirhan Sirhan'],
    correctIndex: 0,
    difficulty: 'hard'
  },
  {
    id: 'hist-029',
    category: 'history',
    question: 'In what year did the Spanish Armada sail?',
    choices: ['1585', '1586', '1587', '1588'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'hist-030',
    category: 'history',
    question: 'Who was the first Emperor of China?',
    choices: ['Kangxi', 'Qin Shi Huang', 'Yonglo', 'Kangxi'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'hist-031',
    category: 'history',
    question: 'In what year did the Renaissance begin?',
    choices: ['1300', '1350', '1400', '1450'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'hist-032',
    category: 'history',
    question: 'Who was the founder of the Ottoman Empire?',
    choices: ['Suleiman I', 'Osman I', 'Mehmed II', 'Murad I'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'hist-033',
    category: 'history',
    question: 'In what year did the stock market crash (Great Depression)?',
    choices: ['1927', '1928', '1929', '1930'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'hist-034',
    category: 'history',
    question: 'Who was the first Queen of England?',
    choices: ['Anne Boleyn', 'Catherine of Aragon', 'Mary I', 'Elizabeth I'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'hist-035',
    category: 'history',
    question: 'In what year did the American Civil War end?',
    choices: ['1863', '1864', '1865', '1866'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'hist-036',
    category: 'history',
    question: 'Who was the founder of Buddhism?',
    choices: ['Confucius', 'Siddhartha Gautama', 'Laozi', 'Zhuangzi'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'hist-037',
    category: 'history',
    question: 'In what year did the Vietnam War end?',
    choices: ['1972', '1973', '1974', '1975'],
    correctIndex: 3,
    difficulty: 'medium'
  },
  {
    id: 'hist-038',
    category: 'history',
    question: 'Who wrote the Declaration of Independence?',
    choices: ['Benjamin Franklin', 'Thomas Jefferson', 'John Adams', 'James Madison'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'hist-039',
    category: 'history',
    question: 'In what year did the Berlin Wall come down?',
    choices: ['1987', '1988', '1989', '1990'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'hist-040',
    category: 'history',
    question: 'Who was the first Secretary of State of the United States?',
    choices: ['Alexander Hamilton', 'Thomas Jefferson', 'John Jay', 'Edmund Randolph'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'hist-041',
    category: 'history',
    question: 'In what year did the Korean War begin?',
    choices: ['1948', '1949', '1950', '1951'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'hist-042',
    category: 'history',
    question: 'Who was the founder of the Mauryan Empire?',
    choices: ['Ashoka', 'Chandragupta Maurya', 'Bindusara', 'Samprati'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'hist-043',
    category: 'history',
    question: 'In what year did the Portuguese explorer Vasco da Gama reach India?',
    choices: ['1495', '1496', '1497', '1498'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'hist-044',
    category: 'history',
    question: 'Who was the first Holy Roman Emperor?',
    choices: ['Otto I', 'Charlemagne', 'Frederick Barbarossa', 'Charles V'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'hist-045',
    category: 'history',
    question: 'In what year did the Hundred Years War end?',
    choices: ['1451', '1452', '1453', '1454'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'hist-046',
    category: 'history',
    question: 'Who was the founder of Islam?',
    choices: ['Ali', 'Prophet Muhammad', 'Abu Bakr', 'Umar'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'hist-047',
    category: 'history',
    question: 'In what year did the Holocaust end?',
    choices: ['1943', '1944', '1945', '1946'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'hist-048',
    category: 'history',
    question: 'Who was the first Japanese Emperor?',
    choices: ['Sujin', 'Jimmu', 'Suinin', 'Keiko'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'hist-049',
    category: 'history',
    question: 'In what year did the Suez Crisis occur?',
    choices: ['1954', '1955', '1956', '1957'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'hist-050',
    category: 'history',
    question: 'Who was the first elected President of South Africa?',
    choices: ['F.W. de Klerk', 'Nelson Mandela', 'Thabo Mbeki', 'Kgalema Motlanthe'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'hist-051',
    category: 'history',
    question: 'In what year did Gutenberg print the Bible?',
    choices: ['1450', '1452', '1454', '1456'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'hist-052',
    category: 'history',
    question: 'Who was the founder of Sikhism?',
    choices: ['Arjun Dev', 'Govind Singh', 'Nanak', 'Hargobind'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'hist-053',
    category: 'history',
    question: 'In what year did Israel become independent?',
    choices: ['1946', '1947', '1948', '1949'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'hist-054',
    category: 'history',
    question: 'Who won the Battle of Hastings?',
    choices: ['Harold Godwinson', 'William the Conqueror', 'Duke of Normandy', 'Edward the Confessor'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'hist-055',
    category: 'history',
    question: 'In what year did the Napoleonic Wars end?',
    choices: ['1812', '1813', '1814', '1815'],
    correctIndex: 3,
    difficulty: 'medium'
  },
  {
    id: 'hist-056',
    category: 'history',
    question: 'Who was the first President of the Weimar Republic?',
    choices: ['Paul von Hindenburg', 'Friedrich Ebert', 'Ernst Thälmann', 'Philipp Scheidemann'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'hist-057',
    category: 'history',
    question: 'In what year did the Bolshevik Revolution occur?',
    choices: ['1915', '1916', '1917', '1918'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'hist-058',
    category: 'history',
    question: 'Who was the founder of Confucianism?',
    choices: ['Laozi', 'Confucius', 'Mencius', 'Zhuangzi'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'hist-059',
    category: 'history',
    question: 'In what year did Japan surrender in World War II?',
    choices: ['1943', '1944', '1945', '1946'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'hist-060',
    category: 'history',
    question: 'Who led the Indian independence movement?',
    choices: ['Jawaharlal Nehru', 'Mahatma Gandhi', 'Sardar Patel', 'Lal Bahadur Shastri'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'hist-061',
    category: 'history',
    question: 'In what year did the Soviet Union collapse?',
    choices: ['1989', '1990', '1991', '1992'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'hist-062',
    category: 'history',
    question: 'Who was the first President of China after the Communist Revolution?',
    choices: ['Deng Xiaoping', 'Mao Zedong', 'Zhou Enlai', 'Jiang Zemin'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'hist-063',
    category: 'history',
    question: 'In what year did the Wright Brothers fly their first plane?',
    choices: ['1901', '1902', '1903', '1904'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'hist-064',
    category: 'history',
    question: 'Who was the first person to discover vaccination?',
    choices: ['Louis Pasteur', 'Edward Jenner', 'Alexander Fleming', 'Jonas Salk'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'hist-065',
    category: 'history',
    question: 'In what year did the moon landing occur?',
    choices: ['1967', '1968', '1969', '1970'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'hist-066',
    category: 'history',
    question: 'Who was the founder of the League of Nations?',
    choices: ['Vladimir Lenin', 'Woodrow Wilson', 'Georges Clemenceau', 'David Lloyd George'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'hist-067',
    category: 'history',
    question: 'In what year did the Berlin Blockade end?',
    choices: ['1947', '1948', '1949', '1950'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'hist-068',
    category: 'history',
    question: 'Who was the founder of the Edo Period in Japan?',
    choices: ['Oda Nobunaga', 'Tokugawa Ieyasu', 'Toyotomi Hideyoshi', 'Date Masamune'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'hist-069',
    category: 'history',
    question: 'In what year did the Treaty of Westphalia end the Thirty Years War?',
    choices: ['1645', '1646', '1647', '1648'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'hist-070',
    category: 'history',
    question: 'Who was the first Vice President of the United States?',
    choices: ['Aaron Burr', 'John Adams', 'Thomas Jefferson', 'George Clinton'],
    correctIndex: 1,
    difficulty: 'hard'
  },

  // Extended Science (sci-011 to sci-070)
  {
    id: 'sci-011',
    category: 'science',
    question: 'What is the atomic number of Carbon?',
    choices: ['4', '5', '6', '7'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-012',
    category: 'science',
    question: 'What is the chemical symbol for Iron?',
    choices: ['Ir', 'In', 'I', 'Fe'],
    correctIndex: 3,
    difficulty: 'medium'
  },
  {
    id: 'sci-013',
    category: 'science',
    question: 'How many valence electrons does Oxygen have?',
    choices: ['4', '5', '6', '7'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'sci-014',
    category: 'science',
    question: 'What is the SI unit of force?',
    choices: ['Joule', 'Pascal', 'Newton', 'Watt'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-015',
    category: 'science',
    question: 'What is the speed of sound in air (m/s)?',
    choices: ['200', '343', '500', '1000'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'sci-016',
    category: 'science',
    question: 'How many chromosomes does a human have?',
    choices: ['22', '23', '44', '46'],
    correctIndex: 3,
    difficulty: 'medium'
  },
  {
    id: 'sci-017',
    category: 'science',
    question: 'Which organelle is called the powerhouse of the cell?',
    choices: ['Nucleus', 'Ribosome', 'Mitochondrion', 'Golgi apparatus'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'sci-018',
    category: 'science',
    question: 'What is the basic unit of heredity?',
    choices: ['Chromosome', 'Protein', 'Gene', 'Nucleotide'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-019',
    category: 'science',
    question: 'What is the formula for photosynthesis product?',
    choices: ['H2O', 'CO2', 'C6H12O6', 'O2'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'sci-020',
    category: 'science',
    question: 'What is the rarest blood type?',
    choices: ['AB', 'O', 'Rh-negative', 'Rh-null'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'sci-021',
    category: 'science',
    question: 'How many chambers does a fish heart have?',
    choices: ['1', '2', '3', '4'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'sci-022',
    category: 'science',
    question: 'What is the only mammal that cannot jump?',
    choices: ['Sloth', 'Elephant', 'Hippopotamus', 'Whale'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'sci-023',
    category: 'science',
    question: 'What is the most abundant element in the human body?',
    choices: ['Carbon', 'Oxygen', 'Nitrogen', 'Hydrogen'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'sci-024',
    category: 'science',
    question: 'What is the melting point of ice?',
    choices: ['0 K', '0°C', '273 K', 'Both B and C'],
    correctIndex: 3,
    difficulty: 'medium'
  },
  {
    id: 'sci-025',
    category: 'science',
    question: 'What is the largest organ in the human body?',
    choices: ['Heart', 'Brain', 'Liver', 'Skin'],
    correctIndex: 3,
    difficulty: 'medium'
  },
  {
    id: 'sci-026',
    category: 'science',
    question: 'How many bones does an adult shark have?',
    choices: ['0', '100', '206', '400'],
    correctIndex: 0,
    difficulty: 'hard'
  },
  {
    id: 'sci-027',
    category: 'science',
    question: 'What is the chemical formula for salt?',
    choices: ['NaCl', 'KCl', 'CaCl2', 'MgCl2'],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'sci-028',
    category: 'science',
    question: 'What planet is closest to the Sun?',
    choices: ['Venus', 'Mercury', 'Earth', 'Mars'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'sci-029',
    category: 'science',
    question: 'How many moons does Mars have?',
    choices: ['0', '1', '2', '3'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-030',
    category: 'science',
    question: 'What is the largest planet in our solar system?',
    choices: ['Saturn', 'Jupiter', 'Uranus', 'Neptune'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'sci-031',
    category: 'science',
    question: 'How many elements are in the periodic table?',
    choices: ['92', '105', '118', '130'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-032',
    category: 'science',
    question: 'What is the SI unit of electrical current?',
    choices: ['Volt', 'Ampere', 'Ohm', 'Watt'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'sci-033',
    category: 'science',
    question: 'What does DNA stand for?',
    choices: ['Deoxyribonucleic acid', 'Diribonucleic acid', 'Deoxyribose nucleic acid', 'Deoxyribinucleic acid'],
    correctIndex: 0,
    difficulty: 'medium'
  },
  {
    id: 'sci-034',
    category: 'science',
    question: 'How many seconds are in a day?',
    choices: ['3600', '7200', '43200', '86400'],
    correctIndex: 3,
    difficulty: 'easy'
  },
  {
    id: 'sci-035',
    category: 'science',
    question: 'What is the SI unit of energy?',
    choices: ['Newton', 'Joule', 'Watt', 'Pascal'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'sci-036',
    category: 'science',
    question: 'How many types of nucleotides are in DNA?',
    choices: ['2', '3', '4', '5'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-037',
    category: 'science',
    question: 'What is the most common gas in Earth\'s atmosphere?',
    choices: ['Oxygen', 'Nitrogen', 'Argon', 'Carbon dioxide'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'sci-038',
    category: 'science',
    question: 'How many types of blood cells are there?',
    choices: ['2', '3', '4', '5'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'sci-039',
    category: 'science',
    question: 'What is the normal human body temperature?',
    choices: ['36°C', '37°C', '38°C', '39°C'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'sci-040',
    category: 'science',
    question: 'How many chambers does a mammal heart have?',
    choices: ['2', '3', '4', '5'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'sci-041',
    category: 'science',
    question: 'What is the main component of natural gas?',
    choices: ['Ethane', 'Propane', 'Methane', 'Butane'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-042',
    category: 'science',
    question: 'How many valence electrons does Sodium have?',
    choices: ['1', '2', '3', '4'],
    correctIndex: 0,
    difficulty: 'hard'
  },
  {
    id: 'sci-043',
    category: 'science',
    question: 'What is the most abundant mineral in the human body?',
    choices: ['Iron', 'Calcium', 'Magnesium', 'Zinc'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'sci-044',
    category: 'science',
    question: 'How many pairs of ribs does a human have?',
    choices: ['10', '11', '12', '13'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'sci-045',
    category: 'science',
    question: 'What is the SI unit of frequency?',
    choices: ['Hertz', 'Radian', 'Joule', 'Watt'],
    correctIndex: 0,
    difficulty: 'hard'
  },
  {
    id: 'sci-046',
    category: 'science',
    question: 'How many types of amino acids are used by the body?',
    choices: ['10', '15', '20', '25'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'sci-047',
    category: 'science',
    question: 'What is the atomic symbol for Copper?',
    choices: ['Co', 'Cu', 'Cr', 'Cd'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'sci-048',
    category: 'science',
    question: 'How far is one astronomical unit (AU)?',
    choices: ['50 million km', '100 million km', '150 million km', '200 million km'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-049',
    category: 'science',
    question: 'What is the freezing point of alcohol (ethanol)?',
    choices: ['-114°C', '-100°C', '-50°C', '-10°C'],
    correctIndex: 0,
    difficulty: 'hard'
  },
  {
    id: 'sci-050',
    category: 'science',
    question: 'How many bones does a newborn baby have?',
    choices: ['100', '186', '206', '300'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'sci-051',
    category: 'science',
    question: 'What is the chemical symbol for Potassium?',
    choices: ['Po', 'P', 'K', 'Pt'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-052',
    category: 'science',
    question: 'How many types of proteins are there?',
    choices: ['Thousands', 'Millions', 'Billions', 'Trillions'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'sci-053',
    category: 'science',
    question: 'What is the SI unit of pressure?',
    choices: ['Bar', 'Pascal', 'Atmosphere', 'Torr'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'sci-054',
    category: 'science',
    question: 'How many chambers does an amphibian heart have?',
    choices: ['2', '3', '4', '5'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'sci-055',
    category: 'science',
    question: 'What is the main component of limestone?',
    choices: ['Iron oxide', 'Calcium carbonate', 'Sodium chloride', 'Silicon dioxide'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'sci-056',
    category: 'science',
    question: 'How many bones are in the human foot?',
    choices: ['20', '26', '32', '40'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'sci-057',
    category: 'science',
    question: 'What is the atomic number of Gold?',
    choices: ['47', '57', '67', '79'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'sci-058',
    category: 'science',
    question: 'How many layers does the Earth\'s atmosphere have?',
    choices: ['3', '4', '5', '7'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-059',
    category: 'science',
    question: 'What is the main gas in the atmosphere by volume?',
    choices: ['Oxygen', 'Nitrogen', 'Argon', 'Carbon dioxide'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'sci-060',
    category: 'science',
    question: 'How many strings does a violin have?',
    choices: ['4', '5', '6', '7'],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'sci-061',
    category: 'science',
    question: 'What is the charge of a proton?',
    choices: ['Negative', 'Positive', 'Neutral', 'Variable'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'sci-062',
    category: 'science',
    question: 'How many electrons does a Helium atom have?',
    choices: ['1', '2', '3', '4'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'sci-063',
    category: 'science',
    question: 'What is the SI unit of temperature?',
    choices: ['Fahrenheit', 'Celsius', 'Kelvin', 'Rankine'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-064',
    category: 'science',
    question: 'How many muscles does a human face have?',
    choices: ['20', '30', '43', '50'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'sci-065',
    category: 'science',
    question: 'What is the primary function of red blood cells?',
    choices: ['Fight infection', 'Transport oxygen', 'Clot blood', 'Produce hormones'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'sci-066',
    category: 'science',
    question: 'How many teeth does an adult human have?',
    choices: ['28', '30', '32', '34'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-067',
    category: 'science',
    question: 'What is the SI unit of power?',
    choices: ['Joule', 'Newton', 'Watt', 'Pascal'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-068',
    category: 'science',
    question: 'How many times does the heart beat per minute at rest?',
    choices: ['40', '60', '100', '140'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'sci-069',
    category: 'science',
    question: 'What is the main component of coal?',
    choices: ['Hydrogen', 'Oxygen', 'Carbon', 'Nitrogen'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'sci-070',
    category: 'science',
    question: 'How many species of animals are there on Earth?',
    choices: ['100,000', '1 million', '8 million', '100 million'],
    correctIndex: 2,
    difficulty: 'hard'
  },

  // Extended Logic (logic-010 to logic-049)
  {
    id: 'logic-010',
    category: 'logic',
    question: 'If some dogs are brown, and all brown things are animals, then:',
    choices: ['All dogs are animals', 'Some dogs are animals', 'No dogs are animals', 'Cannot be determined'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'logic-011',
    category: 'logic',
    question: 'If it is raining, I will stay home. It is not raining. Therefore:',
    choices: ['I will stay home', 'I will not stay home', 'Cannot be determined', 'I might stay home'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'logic-012',
    category: 'logic',
    question: 'All squares are rectangles. Some rectangles are red. Therefore:',
    choices: ['All squares are red', 'Some squares are red', 'No squares are red', 'Cannot be determined'],
    correctIndex: 3,
    difficulty: 'medium'
  },
  {
    id: 'logic-013',
    category: 'logic',
    question: 'If a number is even, it is divisible by 2. 7 is odd. Therefore:',
    choices: ['7 is divisible by 2', '7 is not divisible by 2', 'Cannot be determined', 'Maybe divisible by 2'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'logic-014',
    category: 'logic',
    question: 'All birds have wings. Penguins are birds. Therefore:',
    choices: ['Penguins have wings', 'Penguins cannot fly', 'Penguins live in cold places', 'Penguins eat fish'],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'logic-015',
    category: 'logic',
    question: 'Some vegetables are green. Carrots are orange. Therefore:',
    choices: ['All carrots are vegetables', 'Carrots are not vegetables', 'Some carrots are vegetables', 'Cannot determine if carrots are vegetables'],
    correctIndex: 3,
    difficulty: 'medium'
  },
  {
    id: 'logic-016',
    category: 'logic',
    question: 'If P then Q. Q is true. Therefore:',
    choices: ['P is true', 'P is false', 'Cannot determine P', 'P and Q are equivalent'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'logic-017',
    category: 'logic',
    question: 'No fish are mammals. Whales are mammals. Therefore:',
    choices: ['Whales are fish', 'Whales are not fish', 'Some whales are fish', 'Fish are not mammals'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'logic-018',
    category: 'logic',
    question: 'All painters are artists. Some artists are famous. Therefore:',
    choices: ['All painters are famous', 'Some painters are famous', 'No painters are famous', 'Cannot be determined'],
    correctIndex: 3,
    difficulty: 'medium'
  },
  {
    id: 'logic-019',
    category: 'logic',
    question: 'If A or B is true, and A is false, then:',
    choices: ['B must be true', 'B must be false', 'B might be true', 'Cannot be determined'],
    correctIndex: 0,
    difficulty: 'medium'
  },
  {
    id: 'logic-020',
    category: 'logic',
    question: 'All mammals have hair. Not all animals with hair are mammals. Therefore:',
    choices: ['All mammals are animals', 'Some non-mammals have hair', 'Hair is a defining feature of mammals', 'Animals without hair are not mammals'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'logic-021',
    category: 'logic',
    question: 'If it is sunny, I will go outside. I did not go outside. Therefore:',
    choices: ['It was sunny', 'It was not sunny', 'Cannot be determined', 'It might have been sunny'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'logic-022',
    category: 'logic',
    question: 'Some teachers are strict. All strict teachers are respected. Therefore:',
    choices: ['All teachers are respected', 'Some teachers are respected', 'No teachers are respected', 'Cannot be determined'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'logic-023',
    category: 'logic',
    question: 'If P and Q are both true, then:',
    choices: ['P or Q is true', 'Not P is false', 'Both are true', 'All of the above'],
    correctIndex: 3,
    difficulty: 'medium'
  },
  {
    id: 'logic-024',
    category: 'logic',
    question: 'All dogs are animals. Fido is an animal. Therefore:',
    choices: ['Fido is a dog', 'Fido might be a dog', 'Fido is not a dog', 'Cannot be determined'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'logic-025',
    category: 'logic',
    question: 'No roses are thorny. This flower is thorny. Therefore:',
    choices: ['This flower is a rose', 'This flower is not a rose', 'All roses are thorny', 'Roses might be thorny'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'logic-026',
    category: 'logic',
    question: 'If A implies B, and C implies A, then:',
    choices: ['C implies B', 'B implies C', 'A implies C', 'Cannot be determined'],
    correctIndex: 0,
    difficulty: 'hard'
  },
  {
    id: 'logic-027',
    category: 'logic',
    question: 'All students study hard. John is a student. Therefore:',
    choices: ['John studies hard', 'John might study hard', 'John does not study hard', 'Cannot be determined'],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'logic-028',
    category: 'logic',
    question: 'If the weather is nice, people go outside. People are going outside. Therefore:',
    choices: ['The weather is nice', 'The weather might not be nice', 'The weather is not nice', 'Cannot be determined'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'logic-029',
    category: 'logic',
    question: 'Some flowers are red. All red things are beautiful. Therefore:',
    choices: ['All flowers are beautiful', 'Some flowers are beautiful', 'No flowers are beautiful', 'Flowers might be beautiful'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'logic-030',
    category: 'logic',
    question: 'If A then B. If B then C. A is true. Therefore:',
    choices: ['C is true', 'B is true', 'Both A and B are true', 'All of the above'],
    correctIndex: 3,
    difficulty: 'medium'
  },
  {
    id: 'logic-031',
    category: 'logic',
    question: 'All fruits have seeds. Tomatoes are fruits. Therefore:',
    choices: ['Tomatoes have seeds', 'Tomatoes are vegetables', 'Seeds are fruits', 'Cannot be determined'],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'logic-032',
    category: 'logic',
    question: 'Some musicians are talented. Some talented people are rich. Therefore:',
    choices: ['Some musicians are rich', 'All musicians are rich', 'No musicians are rich', 'Cannot be determined'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'logic-033',
    category: 'logic',
    question: 'If not A, then B. B is false. Therefore:',
    choices: ['A is true', 'A is false', 'A might be true', 'Cannot be determined'],
    correctIndex: 0,
    difficulty: 'hard'
  },
  {
    id: 'logic-034',
    category: 'logic',
    question: 'All metals conduct electricity. Copper is a metal. Therefore:',
    choices: ['Copper conducts electricity', 'Copper is an element', 'Electricity flows through metals', 'All of the above'],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'logic-035',
    category: 'logic',
    question: 'Some books are fiction. Some fiction is entertaining. Therefore:',
    choices: ['Some books are entertaining', 'All fiction is entertaining', 'No books are entertaining', 'Cannot be determined'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'logic-036',
    category: 'logic',
    question: 'If A and B, then C. C is false. Therefore:',
    choices: ['A and B are both true', 'Not both A and B are true', 'Either A or B is false', 'Both B and C'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'logic-037',
    category: 'logic',
    question: 'All doctors are educated. Some educated people are teachers. Therefore:',
    choices: ['Some doctors are teachers', 'All doctors are teachers', 'No doctors are teachers', 'Cannot be determined'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'logic-038',
    category: 'logic',
    question: 'If P or Q, and not Q, then:',
    choices: ['P is true', 'P is false', 'P might be true', 'Cannot be determined'],
    correctIndex: 0,
    difficulty: 'medium'
  },
  {
    id: 'logic-039',
    category: 'logic',
    question: 'All cars have wheels. Some cars are red. Therefore:',
    choices: ['All red things have wheels', 'Some red things are cars', 'Some wheels are cars', 'Cannot be determined'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'logic-040',
    category: 'logic',
    question: 'No birds are fish. Some animals are fish. Therefore:',
    choices: ['Some animals are birds', 'Some animals are not birds', 'All birds are not fish', 'Cannot be determined'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  // Extended Estimation (est-012 to est-061)
  {
    id: 'est-012',
    category: 'estimation',
    question: 'Approximately how many languages are spoken in the world?',
    choices: ['1,000', '3,000', '7,000', '15,000'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-013',
    category: 'estimation',
    question: 'How many seconds have passed since the year 2000?',
    choices: ['631 million', '756 million', '881 million', '1 billion'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-014',
    category: 'estimation',
    question: 'Approximately how many people are online right now?',
    choices: ['100 million', '500 million', '1 billion', '5 billion'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'est-015',
    category: 'estimation',
    question: 'How many grains of sand are on all beaches on Earth?',
    choices: ['1 trillion', '1 quadrillion', '7.5 sextillion', '1 octillion'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-016',
    category: 'estimation',
    question: 'Approximately how many airplanes are flying right now?',
    choices: ['500', '5,000', '50,000', '500,000'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'est-017',
    category: 'estimation',
    question: 'How many hairs does the average human have on their head?',
    choices: ['10,000', '50,000', '100,000', '500,000'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'est-018',
    category: 'estimation',
    question: 'Approximately what is the distance from Earth to Mars (in millions of km)?',
    choices: ['100', '225', '400', '600'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'est-019',
    category: 'estimation',
    question: 'How many seconds are in a year?',
    choices: ['31 million', '31.5 million', '315 million', '3.15 billion'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'est-020',
    category: 'estimation',
    question: 'Approximately how many people are born each minute?',
    choices: ['50', '150', '300', '1,000'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'est-021',
    category: 'estimation',
    question: 'How many words are in the English language?',
    choices: ['50,000', '100,000', '170,000', '500,000'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-022',
    category: 'estimation',
    question: 'Approximately how many gallons of water does a person drink per year?',
    choices: ['100', '300', '500', '1,000'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'est-023',
    category: 'estimation',
    question: 'How many neurons are in the human brain?',
    choices: ['1 million', '100 million', '1 billion', '86 billion'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'est-024',
    category: 'estimation',
    question: 'Approximately how many cars are on Earth?',
    choices: ['500 million', '1 billion', '2 billion', '5 billion'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'est-025',
    category: 'estimation',
    question: 'How many times does the average person blink per day?',
    choices: ['5,000', '10,000', '17,000', '50,000'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-026',
    category: 'estimation',
    question: 'Approximately how many books are in the Library of Congress?',
    choices: ['5 million', '17 million', '100 million', '500 million'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'est-027',
    category: 'estimation',
    question: 'How many pizzas are eaten in the US each year?',
    choices: ['100 million', '350 million', '1 billion', '3 billion'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-028',
    category: 'estimation',
    question: 'Approximately how many species of insects are there?',
    choices: ['100,000', '1 million', '10 million', '100 million'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'est-029',
    category: 'estimation',
    question: 'How many leaves are on a mature tree?',
    choices: ['1,000', '50,000', '200,000', '1 million'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-030',
    category: 'estimation',
    question: 'Approximately how many stars are visible to the naked eye?',
    choices: ['100', '1,000', '5,000', '10,000'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'est-031',
    category: 'estimation',
    question: 'How many atoms are in a grain of salt?',
    choices: ['1 million', '1 billion', '1 trillion', '1 quadrillion'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-032',
    category: 'estimation',
    question: 'Approximately how many fish are caught annually?',
    choices: ['10 million tons', '50 million tons', '100 million tons', '200 million tons'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-033',
    category: 'estimation',
    question: 'How many people visit Disneyland per year?',
    choices: ['5 million', '10 million', '18 million', '50 million'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-034',
    category: 'estimation',
    question: 'Approximately how many gallons of blood does the heart pump per day?',
    choices: ['1,000', '5,000', '8,000', '20,000'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-035',
    category: 'estimation',
    question: 'How many grains of rice are in a kilogram?',
    choices: ['5,000', '30,000', '50,000', '100,000'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'est-036',
    category: 'estimation',
    question: 'Approximately how many gallons of oil does the US use per day?',
    choices: ['5 million', '10 million', '20 million', '50 million'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-037',
    category: 'estimation',
    question: 'How many cells are in the human body?',
    choices: ['100 billion', '1 trillion', '37 trillion', '100 trillion'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'est-038',
    category: 'estimation',
    question: 'Approximately how many basketball games are played in the NBA per season?',
    choices: ['82 per team', '100 total', '400 total', '2,400 total'],
    correctIndex: 3,
    difficulty: 'medium'
  },
  {
    id: 'est-039',
    category: 'estimation',
    question: 'How many Walmart stores are there globally?',
    choices: ['1,000', '5,000', '11,000', '50,000'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-040',
    category: 'estimation',
    question: 'Approximately how many Google searches happen per second?',
    choices: ['1,000', '10,000', '100,000', '1 million'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-041',
    category: 'estimation',
    question: 'How many mountains over 20,000 feet are in the world?',
    choices: ['50', '100', '500', '1,000'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-042',
    category: 'estimation',
    question: 'Approximately how many trees are on Earth?',
    choices: ['100 million', '3 billion', '100 billion', '3 trillion'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'est-043',
    category: 'estimation',
    question: 'How many books were published globally last year?',
    choices: ['100,000', '500,000', '2 million', '10 million'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-044',
    category: 'estimation',
    question: 'Approximately how many songs are on Spotify?',
    choices: ['10 million', '50 million', '100 million', '500 million'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'est-045',
    category: 'estimation',
    question: 'How many kilometers of roads are in the world?',
    choices: ['10 million', '50 million', '100 million', '500 million'],
    correctIndex: 0,
    difficulty: 'hard'
  },
  {
    id: 'est-046',
    category: 'estimation',
    question: 'Approximately how many languages have gone extinct?',
    choices: ['100', '1,000', '5,000', '20,000'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-047',
    category: 'estimation',
    question: 'How many photographs are taken every minute?',
    choices: ['1 million', '10 million', '100 million', '500 million'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-048',
    category: 'estimation',
    question: 'Approximately how many plastic bags are used globally per year?',
    choices: ['100 million', '1 billion', '500 billion', '5 trillion'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'est-049',
    category: 'estimation',
    question: 'How many acres of forest are cut down annually?',
    choices: ['100 million', '500 million', '1 billion', '2 billion'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-050',
    category: 'estimation',
    question: 'Approximately how many crimes are reported annually in the US?',
    choices: ['1 million', '3 million', '10 million', '50 million'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'est-051',
    category: 'estimation',
    question: 'How many kilometers is the Great Wall of China?',
    choices: ['1,000', '5,000', '21,000', '50,000'],
    correctIndex: 2,
    difficulty: 'medium'
  },

  // Additional Estimation items (est-052 to est-061)
  {
    id: 'est-052',
    category: 'estimation',
    question: 'Approximately how many words does Shakespeare use in all his works?',
    choices: ['10,000', '31,000', '100,000', '500,000'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'est-053',
    category: 'estimation',
    question: 'How many days old is a 10-year-old child?',
    choices: ['1,000', '3,650', '10,000', '50,000'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'est-054',
    category: 'estimation',
    question: 'Approximately how many bacteria cells are on the human skin?',
    choices: ['1 billion', '100 billion', '1 trillion', '10 trillion'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-055',
    category: 'estimation',
    question: 'How many times does the human eye blink while driving a car for 1 hour?',
    choices: ['500', '1,200', '2,000', '5,000'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-056',
    category: 'estimation',
    question: 'Approximately how many liters of saliva does a human produce per year?',
    choices: ['100', '500', '1,000', '5,000'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-057',
    category: 'estimation',
    question: 'How many words does the average English speaker know?',
    choices: ['5,000', '20,000', '35,000', '100,000'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'est-058',
    category: 'estimation',
    question: 'Approximately how many hairs does a human lose per day?',
    choices: ['50', '100', '500', '1,000'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'est-059',
    category: 'estimation',
    question: 'How many diamonds are mined globally per year (in carats)?',
    choices: ['100 million', '1 billion', '100 billion', '1 trillion'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'est-060',
    category: 'estimation',
    question: 'Approximately how many species of plants exist on Earth?',
    choices: ['100,000', '400,000', '1 million', '5 million'],
    correctIndex: 1,
    difficulty: 'hard'
  }
];
