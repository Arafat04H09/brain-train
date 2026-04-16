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
    question: 'What is the powerhouse of the cell?',
    choices: ['Nucleus', 'Ribosome', 'Mitochondrion', 'Golgi apparatus'],
    correctIndex: 2,
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
    id: 'geography-010',
    category: 'geography',
    question: 'How many continents are there?',
    choices: ['5', '6', '7', '8'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'history-010',
    category: 'history',
    question: 'In what year was the Declaration of the Rights of Man and of the Citizen adopted?',
    choices: ['1786', '1787', '1789', '1791'],
    correctIndex: 2,
    difficulty: 'hard'
  },
  {
    id: 'science-010',
    category: 'science',
    question: 'What is the boiling point of water at sea level (in Celsius)?',
    choices: ['90', '100', '110', '120'],
    correctIndex: 1,
    difficulty: 'easy'
  }
];
