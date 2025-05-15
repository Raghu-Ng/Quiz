export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  value: number;
}

// These questions are now used only as fallback
// The actual questions are fetched from the API
export const questionsList: Question[] = [
  {
    id: 1,
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: 1,
    category: "Science",
    difficulty: "easy",
    value: 100
  },
  {
    id: 2,
    question: "Which country is known as the Land of the Rising Sun?",
    options: ["China", "Korea", "Japan", "Vietnam"],
    correctAnswer: 2,
    category: "Geography",
    difficulty: "easy",
    value: 200
  },
  {
    id: 3,
    question: "Who painted the Mona Lisa?",
    options: ["Vincent Van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
    correctAnswer: 2,
    category: "Art",
    difficulty: "easy",
    value: 300
  },
  {
    id: 4,
    question: "What is the capital of Australia?",
    options: ["Sydney", "Melbourne", "Perth", "Canberra"],
    correctAnswer: 3,
    category: "Geography",
    difficulty: "easy",
    value: 500
  },
  {
    id: 5,
    question: "Which element has the chemical symbol 'O'?",
    options: ["Gold", "Oxygen", "Osmium", "Oganesson"],
    correctAnswer: 1,
    category: "Science",
    difficulty: "easy",
    value: 1000
  },
  {
    id: 6,
    question: "Who wrote 'Romeo and Juliet'?",
    options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
    correctAnswer: 1,
    category: "Literature",
    difficulty: "medium",
    value: 2000
  },
  {
    id: 7,
    question: "Which famous scientist developed the theory of relativity?",
    options: ["Isaac Newton", "Niels Bohr", "Albert Einstein", "Marie Curie"],
    correctAnswer: 2,
    category: "Science",
    difficulty: "medium",
    value: 4000
  },
  {
    id: 8,
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
    correctAnswer: 3,
    category: "Geography",
    difficulty: "medium",
    value: 8000
  },
  {
    id: 9,
    question: "Which of these is NOT a primary color in the RGB color model?",
    options: ["Red", "Green", "Blue", "Yellow"],
    correctAnswer: 3,
    category: "Art",
    difficulty: "medium",
    value: 16000
  },
  {
    id: 10,
    question: "Which planet has the most moons?",
    options: ["Jupiter", "Saturn", "Uranus", "Neptune"],
    correctAnswer: 1,
    category: "Science",
    difficulty: "hard",
    value: 32000
  },
  {
    id: 11,
    question: "In what year did the Berlin Wall fall?",
    options: ["1987", "1989", "1991", "1993"],
    correctAnswer: 1,
    category: "History",
    difficulty: "hard",
    value: 64000
  },
  {
    id: 12,
    question: "Which of these programming languages was developed first?",
    options: ["Python", "Java", "C++", "FORTRAN"],
    correctAnswer: 3,
    category: "Technology",
    difficulty: "hard",
    value: 125000
  },
  {
    id: 13,
    question: "Which composer was deaf when he completed his Ninth Symphony?",
    options: ["Wolfgang Amadeus Mozart", "Ludwig van Beethoven", "Johann Sebastian Bach", "Franz Schubert"],
    correctAnswer: 1,
    category: "Music",
    difficulty: "hard",
    value: 250000
  },
  {
    id: 14,
    question: "The Aztec Empire was located in what is now which country?",
    options: ["Peru", "Colombia", "Mexico", "Brazil"],
    correctAnswer: 2,
    category: "History",
    difficulty: "hard",
    value: 500000
  },
  {
    id: 15,
    question: "What is the world's most expensive spice by weight?",
    options: ["Vanilla", "Cardamom", "Saffron", "Cinnamon"],
    correctAnswer: 2,
    category: "Food",
    difficulty: "hard",
    value: 1000000
  }
];

export const moneyLadder = [
  100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000
];

export const milestones = [5, 10, 15]; // Question numbers that are safe havens (keep the money if you lose after these)
