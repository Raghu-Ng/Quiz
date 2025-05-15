import axios from 'axios';

export interface ApiQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

export interface FormattedQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  value: number;
}

// Maps API difficulty levels to prize amounts
const difficultyValueMap = {
  easy: [100, 200, 300, 500, 1000],
  medium: [2000, 4000, 8000, 16000, 32000],
  hard: [64000, 125000, 250000, 500000, 1000000]
};

// Decode HTML entities (like &quot;) in the API response
const decodeHTMLEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

// Shuffle array using Fisher-Yates algorithm
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Cache keys for storing questions in localStorage
const CACHE_KEY = 'quizquest_questions_cache';
const CACHE_TIMESTAMP_KEY = 'quizquest_cache_timestamp';
const API_COOLDOWN_KEY = 'quizquest_api_cooldown';
const REQUEST_COUNT_KEY = 'quizquest_request_count';
const LAST_REQUEST_TIME_KEY = 'quizquest_last_request';

// Cache expiry - 24 hours instead of 1 hour to reduce API calls
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const API_COOLDOWN = 30 * 60 * 1000; // 30 minute cooldown after rate limit

// Check if we have valid cached questions
const getCachedQuestions = (): FormattedQuestion[] | null => {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (!cachedData || !timestamp) return null;
    
    // Check if cache has expired
    const cacheTime = parseInt(timestamp, 10);
    if (Date.now() - cacheTime > CACHE_EXPIRY) return null;
    
    return JSON.parse(cachedData);
  } catch (e) {
    console.log('Cache reading error, will fetch fresh data');
    return null;
  }
};

// Save questions to cache
const cacheQuestions = (questions: FormattedQuestion[]): void => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(questions));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) {
    console.log('Could not cache questions');
  }
};

// Track API request rate to avoid hitting limits
const shouldUseApi = (): boolean => {
  try {
    // Check if we're in API cooldown mode due to rate limiting
    const cooldownUntil = localStorage.getItem(API_COOLDOWN_KEY);
    if (cooldownUntil && parseInt(cooldownUntil, 10) > Date.now()) {
      console.log('API in cooldown period due to previous rate limiting');
      return false;
    }
    
    // Track request count in a rolling window
    const now = Date.now();
    const lastRequestTime = localStorage.getItem(LAST_REQUEST_TIME_KEY);
    let requestCount = parseInt(localStorage.getItem(REQUEST_COUNT_KEY) || '0', 10);
    
    // Reset counter if it's been more than 5 minutes since last request
    if (lastRequestTime && now - parseInt(lastRequestTime, 10) > 5 * 60 * 1000) {
      requestCount = 0;
    }
    
    // If we've made more than 5 requests in the window, use fallback
    if (requestCount >= 5) {
      console.log('Too many requests in short period, using fallback');
      return false;
    }
    
    // Update request tracking
    localStorage.setItem(REQUEST_COUNT_KEY, (requestCount + 1).toString());
    localStorage.setItem(LAST_REQUEST_TIME_KEY, now.toString());
    
    return true;
  } catch (e) {
    // If there's any error tracking requests, default to using API
    return true;
  }
};

// Handle API rate limiting
const handleRateLimiting = () => {
  // Set cooldown period when we hit rate limits
  localStorage.setItem(API_COOLDOWN_KEY, (Date.now() + API_COOLDOWN).toString());
  console.log('Rate limit detected, cooling down API requests for 30 minutes');
};

export const fetchQuestions = async (amount: number = 15): Promise<FormattedQuestion[]> => {
  // First check if we have valid cached questions
  const cachedQuestions = getCachedQuestions();
  if (cachedQuestions) {
    console.log('Using cached questions');
    return cachedQuestions;
  }
  
  // Check if we should use the API or fallback immediately
  if (!shouldUseApi()) {
    console.log('Using fallback questions due to rate limiting or high request volume');
    return getRandomFallbackQuestions(amount);
  }
  
  try {
    // Add a random delay between 100-700ms to avoid synchronous requests from multiple users
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 600));
    
    // Get a mix of difficulties (5 easy, 5 medium, 5 hard)
    const [easyResponse, mediumResponse, hardResponse] = await Promise.all([
      axios.get('https://opentdb.com/api.php?amount=5&difficulty=easy&type=multiple'),
      axios.get('https://opentdb.com/api.php?amount=5&difficulty=medium&type=multiple'),
      axios.get('https://opentdb.com/api.php?amount=5&difficulty=hard&type=multiple')
    ]);
    
    // Check if API returned rate limit error
    if (easyResponse.status === 429 || mediumResponse.status === 429 || hardResponse.status === 429) {
      handleRateLimiting();
      return getRandomFallbackQuestions(amount);
    }
    
    // Check if API returned valid results
    if (easyResponse.data.response_code !== 0 || 
        mediumResponse.data.response_code !== 0 || 
        hardResponse.data.response_code !== 0) {
      console.log('API returned invalid response code, using fallback questions');
      return getRandomFallbackQuestions(amount);
    }
    
    const easyQuestions = easyResponse.data.results || [];
    const mediumQuestions = mediumResponse.data.results || [];
    const hardQuestions = hardResponse.data.results || [];
    
    // Validate we have all questions needed
    if (easyQuestions.length !== 5 || mediumQuestions.length !== 5 || hardQuestions.length !== 5) {
      console.log('Did not receive expected number of questions, using fallback questions');
      return getRandomFallbackQuestions(amount);
    }
    
    // Combine and format all questions
    const allQuestions = [...easyQuestions, ...mediumQuestions, ...hardQuestions];
    
    const formattedQuestions: FormattedQuestion[] = allQuestions.map((q: ApiQuestion, index: number) => {
      if (!q.correct_answer || !q.incorrect_answers || q.incorrect_answers.length !== 3) {
        throw new Error('Question data format is invalid');
      }
      
      // Create array with all options (correct + incorrect)
      const allOptions = [
        decodeHTMLEntities(q.correct_answer), 
        ...q.incorrect_answers.map(a => decodeHTMLEntities(a))
      ];
      
      // Shuffle options
      const shuffledOptions = shuffleArray(allOptions);
      
      // Find the index of the correct answer in the shuffled array
      const correctAnswerIndex = shuffledOptions.findIndex(
        option => option === decodeHTMLEntities(q.correct_answer)
      );
      
      // Determine prize value based on difficulty and question number within that difficulty
      const difficultyIndex = index % 5;
      const value = difficultyValueMap[q.difficulty as keyof typeof difficultyValueMap][difficultyIndex];
      
      return {
        id: index + 1,
        question: decodeHTMLEntities(q.question),
        options: shuffledOptions,
        correctAnswer: correctAnswerIndex,
        category: decodeHTMLEntities(q.category),
        difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
        value: value
      };
    });
    
    // Sort based on value (increasing difficulty)
    const sortedQuestions = formattedQuestions.sort((a, b) => a.value - b.value);
    
    // Cache the questions for future use
    cacheQuestions(sortedQuestions);
    
    return sortedQuestions;
  } catch (error: any) {
    console.error('Error fetching questions:', error);
    
    // Check if this was a rate limit error
    if (error.response && error.response.status === 429) {
      handleRateLimiting();
    }
    
    // Return fallback questions instead of throwing error
    return getRandomFallbackQuestions(amount);
  }
};

// Get a random selection of questions from the fallback pool
export const getRandomFallbackQuestions = (amount: number = 15): FormattedQuestion[] => {
  // Get all fallback questions
  const allFallbackQuestions = getAllFallbackQuestions();
  
  // Group by difficulty
  const easyQuestions = allFallbackQuestions.filter(q => q.difficulty === 'easy');
  const mediumQuestions = allFallbackQuestions.filter(q => q.difficulty === 'medium');
  const hardQuestions = allFallbackQuestions.filter(q => q.difficulty === 'hard');
  
  // Determine how many of each difficulty we need
  const easyCount = Math.floor(amount * 0.33);
  const mediumCount = Math.floor(amount * 0.33);
  const hardCount = amount - easyCount - mediumCount;
  
  // Shuffle and select required number from each difficulty
  const selectedEasy = shuffleArray(easyQuestions).slice(0, easyCount);
  const selectedMedium = shuffleArray(mediumQuestions).slice(0, mediumCount);
  const selectedHard = shuffleArray(hardQuestions).slice(0, hardCount);
  
  // Combine and sort by value
  const selectedQuestions = [...selectedEasy, ...selectedMedium, ...selectedHard];
  return selectedQuestions.sort((a, b) => a.value - b.value);
};

// Legacy function maintained for backward compatibility
export const getFallbackQuestions = (): FormattedQuestion[] => {
  return getRandomFallbackQuestions(15);
};

// Complete set of fallback questions (expanded to 100)
export const getAllFallbackQuestions = (): FormattedQuestion[] => {
  return [
    // Original 15 questions
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
    },
    
    // Additional 85 questions to reach a total of 100
    // EASY QUESTIONS (30 more)
    {
      id: 16,
      question: "Which vitamin is produced by the skin when exposed to sunlight?",
      options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"],
      correctAnswer: 2,
      category: "Science",
      difficulty: "easy",
      value: 100
    },
    {
      id: 17,
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correctAnswer: 2,
      category: "Geography",
      difficulty: "easy",
      value: 200
    },
    {
      id: 18,
      question: "Which famous physicist developed the theory of general relativity?",
      options: ["Isaac Newton", "Albert Einstein", "Stephen Hawking", "Niels Bohr"],
      correctAnswer: 1,
      category: "Science",
      difficulty: "easy",
      value: 300
    },
    {
      id: 19,
      question: "What is the largest mammal in the world?",
      options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
      correctAnswer: 1,
      category: "Animals",
      difficulty: "easy",
      value: 500
    },
    {
      id: 20,
      question: "Who wrote 'Harry Potter'?",
      options: ["J.R.R. Tolkien", "J.K. Rowling", "Stephen King", "George R.R. Martin"],
      correctAnswer: 1,
      category: "Literature",
      difficulty: "easy",
      value: 1000
    },
    {
      id: 21,
      question: "Which planet is closest to the Sun?",
      options: ["Venus", "Earth", "Mars", "Mercury"],
      correctAnswer: 3,
      category: "Astronomy",
      difficulty: "easy",
      value: 100
    },
    {
      id: 22,
      question: "What is the capital of Japan?",
      options: ["Beijing", "Seoul", "Tokyo", "Bangkok"],
      correctAnswer: 2,
      category: "Geography",
      difficulty: "easy",
      value: 200
    },
    {
      id: 23,
      question: "Who painted 'Starry Night'?",
      options: ["Claude Monet", "Pablo Picasso", "Vincent van Gogh", "Leonardo da Vinci"],
      correctAnswer: 2,
      category: "Art",
      difficulty: "easy",
      value: 300
    },
    {
      id: 24,
      question: "What is the chemical symbol for gold?",
      options: ["Go", "Gd", "Au", "Ag"],
      correctAnswer: 2,
      category: "Science",
      difficulty: "easy",
      value: 500
    },
    {
      id: 25,
      question: "Which country is known for the Taj Mahal?",
      options: ["Egypt", "India", "Turkey", "China"],
      correctAnswer: 1,
      category: "Geography",
      difficulty: "easy",
      value: 1000
    },
    {
      id: 26,
      question: "Which of these is NOT a programming language?",
      options: ["Java", "Python", "Cobra", "Photoshop"],
      correctAnswer: 3,
      category: "Technology",
      difficulty: "easy",
      value: 100
    },
    {
      id: 27,
      question: "What is the capital of Brazil?",
      options: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"],
      correctAnswer: 2,
      category: "Geography",
      difficulty: "easy",
      value: 200
    },
    {
      id: 28,
      question: "Which is the largest planet in our solar system?",
      options: ["Saturn", "Jupiter", "Neptune", "Uranus"],
      correctAnswer: 1,
      category: "Astronomy",
      difficulty: "easy",
      value: 300
    },
    {
      id: 29,
      question: "Who was the first person to walk on the moon?",
      options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "John Glenn"],
      correctAnswer: 1,
      category: "History",
      difficulty: "easy",
      value: 500
    },
    {
      id: 30,
      question: "What is the longest river in the world?",
      options: ["Amazon", "Nile", "Mississippi", "Yangtze"],
      correctAnswer: 1,
      category: "Geography",
      difficulty: "easy",
      value: 1000
    },
    {
      id: 31,
      question: "Who wrote 'Pride and Prejudice'?",
      options: ["Jane Austen", "Charlotte Brontë", "Emily Brontë", "Virginia Woolf"],
      correctAnswer: 0,
      category: "Literature",
      difficulty: "easy",
      value: 100
    },
    {
      id: 32,
      question: "What is the main language spoken in Brazil?",
      options: ["Spanish", "Portuguese", "English", "French"],
      correctAnswer: 1,
      category: "Geography",
      difficulty: "easy",
      value: 200
    },
    {
      id: 33,
      question: "Which instrument has 88 keys?",
      options: ["Guitar", "Violin", "Piano", "Flute"],
      correctAnswer: 2,
      category: "Music",
      difficulty: "easy",
      value: 300
    },
    {
      id: 34,
      question: "What is the chemical symbol for water?",
      options: ["O2", "CO2", "H2O", "NaCl"],
      correctAnswer: 2,
      category: "Science",
      difficulty: "easy",
      value: 500
    },
    {
      id: 35,
      question: "Which country is known for the Great Barrier Reef?",
      options: ["Brazil", "Mexico", "Australia", "Indonesia"],
      correctAnswer: 2,
      category: "Geography",
      difficulty: "easy",
      value: 1000
    },
    {
      id: 36,
      question: "Which of these animals is a marsupial?",
      options: ["Elephant", "Kangaroo", "Lion", "Penguin"],
      correctAnswer: 1,
      category: "Animals",
      difficulty: "easy",
      value: 100
    },
    {
      id: 37,
      question: "What is the capital of Italy?",
      options: ["Venice", "Milan", "Rome", "Naples"],
      correctAnswer: 2,
      category: "Geography",
      difficulty: "easy",
      value: 200
    },
    {
      id: 38,
      question: "Who painted the ceiling of the Sistine Chapel?",
      options: ["Leonardo da Vinci", "Michelangelo", "Raphael", "Donatello"],
      correctAnswer: 1,
      category: "Art",
      difficulty: "easy",
      value: 300
    },
    {
      id: 39,
      question: "What is the main ingredient in guacamole?",
      options: ["Avocado", "Tomato", "Lime", "Onion"],
      correctAnswer: 0,
      category: "Food",
      difficulty: "easy",
      value: 500
    },
    {
      id: 40,
      question: "Which famous ship sank on its maiden voyage in 1912?",
      options: ["USS Enterprise", "Queen Mary", "RMS Titanic", "HMS Bounty"],
      correctAnswer: 2,
      category: "History",
      difficulty: "easy",
      value: 1000
    },
    {
      id: 41,
      question: "Which sports car company has a prancing horse as its logo?",
      options: ["Lamborghini", "Ferrari", "Porsche", "Maserati"],
      correctAnswer: 1,
      category: "Automotive",
      difficulty: "easy",
      value: 100
    },
    {
      id: 42,
      question: "What is the largest desert in the world?",
      options: ["Sahara", "Gobi", "Arabian", "Antarctic"],
      correctAnswer: 3,
      category: "Geography",
      difficulty: "easy",
      value: 200
    },
    {
      id: 43,
      question: "Who is known as the 'King of Pop'?",
      options: ["Elvis Presley", "Michael Jackson", "Justin Bieber", "Bruno Mars"],
      correctAnswer: 1,
      category: "Music",
      difficulty: "easy",
      value: 300
    },
    {
      id: 44,
      question: "What is the boiling point of water in Celsius?",
      options: ["90°C", "100°C", "110°C", "212°C"],
      correctAnswer: 1,
      category: "Science",
      difficulty: "easy",
      value: 500
    },
    {
      id: 45,
      question: "Which planet is known as the 'Morning Star'?",
      options: ["Mars", "Venus", "Jupiter", "Mercury"],
      correctAnswer: 1,
      category: "Astronomy",
      difficulty: "easy",
      value: 1000
    },
    
    // MEDIUM QUESTIONS (30 more)
    {
      id: 46,
      question: "Which country was the first to reach the South Pole?",
      options: ["United States", "Russia", "Norway", "United Kingdom"],
      correctAnswer: 2,
      category: "History",
      difficulty: "medium",
      value: 2000
    },
    {
      id: 47,
      question: "What is the largest internal organ in the human body?",
      options: ["Lungs", "Liver", "Brain", "Heart"],
      correctAnswer: 1,
      category: "Biology",
      difficulty: "medium",
      value: 4000
    },
    {
      id: 48,
      question: "Who discovered penicillin?",
      options: ["Marie Curie", "Louis Pasteur", "Alexander Fleming", "Jonas Salk"],
      correctAnswer: 2,
      category: "Science",
      difficulty: "medium",
      value: 8000
    },
    {
      id: 49,
      question: "Which element has the chemical symbol 'Fe'?",
      options: ["Iron", "Fluorine", "Francium", "Fermium"],
      correctAnswer: 0,
      category: "Chemistry",
      difficulty: "medium",
      value: 16000
    },
    {
      id: 50,
      question: "In which year did World War I begin?",
      options: ["1914", "1916", "1918", "1920"],
      correctAnswer: 0,
      category: "History",
      difficulty: "medium",
      value: 32000
    },
    {
      id: 51,
      question: "Which mountain range separates Europe from Asia?",
      options: ["Alps", "Himalayas", "Andes", "Urals"],
      correctAnswer: 3,
      category: "Geography",
      difficulty: "medium",
      value: 2000
    },
    {
      id: 52,
      question: "Who wrote '1984'?",
      options: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "H.G. Wells"],
      correctAnswer: 1,
      category: "Literature",
      difficulty: "medium",
      value: 4000
    },
    {
      id: 53,
      question: "What is the currency of Japan?",
      options: ["Yuan", "Won", "Ringgit", "Yen"],
      correctAnswer: 3,
      category: "Geography",
      difficulty: "medium",
      value: 8000
    },
    {
      id: 54,
      question: "Which element is a noble gas?",
      options: ["Chlorine", "Nitrogen", "Argon", "Carbon"],
      correctAnswer: 2,
      category: "Chemistry",
      difficulty: "medium",
      value: 16000
    },
    {
      id: 55,
      question: "What is the capital of South Africa?",
      options: ["Johannesburg", "Cape Town", "Pretoria", "Durban"],
      correctAnswer: 2,
      category: "Geography",
      difficulty: "medium",
      value: 32000
    },
    {
      id: 56,
      question: "Who composed 'The Four Seasons'?",
      options: ["Johann Sebastian Bach", "Wolfgang Amadeus Mozart", "Ludwig van Beethoven", "Antonio Vivaldi"],
      correctAnswer: 3,
      category: "Music",
      difficulty: "medium",
      value: 2000
    },
    {
      id: 57,
      question: "Which of these countries is not a member of the European Union?",
      options: ["Sweden", "Switzerland", "Spain", "Portugal"],
      correctAnswer: 1,
      category: "Politics",
      difficulty: "medium",
      value: 4000
    },
    {
      id: 58,
      question: "What is the hardest natural substance on Earth?",
      options: ["Platinum", "Titanium", "Diamond", "Quartz"],
      correctAnswer: 2,
      category: "Science",
      difficulty: "medium",
      value: 8000
    },
    {
      id: 59,
      question: "Which ancient wonder was located in Alexandria?",
      options: ["Hanging Gardens", "Colossus", "Lighthouse", "Temple of Artemis"],
      correctAnswer: 2,
      category: "History",
      difficulty: "medium",
      value: 16000
    },
    {
      id: 60,
      question: "What is the name of the longest river in Africa?",
      options: ["Congo", "Niger", "Zambezi", "Nile"],
      correctAnswer: 3,
      category: "Geography",
      difficulty: "medium",
      value: 32000
    },
    {
      id: 61,
      question: "Which of these is not a type of cloud?",
      options: ["Cumulus", "Stratus", "Nimbus", "Nebulus"],
      correctAnswer: 3,
      category: "Meteorology",
      difficulty: "medium",
      value: 2000
    },
    {
      id: 62,
      question: "Who directed the movie 'Jaws'?",
      options: ["George Lucas", "Steven Spielberg", "Francis Ford Coppola", "Martin Scorsese"],
      correctAnswer: 1,
      category: "Entertainment",
      difficulty: "medium",
      value: 4000
    },
    {
      id: 63,
      question: "What is the largest species of shark?",
      options: ["Great White Shark", "Tiger Shark", "Hammerhead Shark", "Whale Shark"],
      correctAnswer: 3,
      category: "Animals",
      difficulty: "medium",
      value: 8000
    },
    {
      id: 64,
      question: "Which famous emperor built the Colosseum in Rome?",
      options: ["Augustus", "Nero", "Vespasian", "Constantine"],
      correctAnswer: 2,
      category: "History",
      difficulty: "medium",
      value: 16000
    },
    {
      id: 65,
      question: "What does HTTP stand for?",
      options: ["HyperText Transfer Protocol", "High Tech Transfer Protocol", "Hyper Transfer Text Protocol", "Host Transfer Technology Protocol"],
      correctAnswer: 0,
      category: "Technology",
      difficulty: "medium",
      value: 32000
    },
    {
      id: 66,
      question: "Which country was not part of the original Axis powers in World War II?",
      options: ["Germany", "Italy", "Spain", "Japan"],
      correctAnswer: 2,
      category: "History",
      difficulty: "medium",
      value: 2000
    },
    {
      id: 67,
      question: "What is the smallest bone in the human body?",
      options: ["Stapes", "Femur", "Radius", "Phalanges"],
      correctAnswer: 0,
      category: "Biology",
      difficulty: "medium",
      value: 4000
    },
    {
      id: 68,
      question: "Which planet has the Great Red Spot?",
      options: ["Mars", "Venus", "Jupiter", "Saturn"],
      correctAnswer: 2,
      category: "Astronomy",
      difficulty: "medium",
      value: 8000
    },
    {
      id: 69,
      question: "Who wrote 'The Canterbury Tales'?",
      options: ["Geoffrey Chaucer", "William Langland", "John Gower", "Thomas Malory"],
      correctAnswer: 0,
      category: "Literature",
      difficulty: "medium",
      value: 16000
    },
    {
      id: 70,
      question: "Which mountain is the tallest in the world when measured from base to peak?",
      options: ["Mount Everest", "K2", "Mauna Kea", "Mount Kilimanjaro"],
      correctAnswer: 2,
      category: "Geography",
      difficulty: "medium",
      value: 32000
    },
    
    // HARD QUESTIONS (25 more)
    {
      id: 71,
      question: "Which of these scientists did NOT contribute to the development of quantum mechanics?",
      options: ["Niels Bohr", "Werner Heisenberg", "Stephen Hawking", "Max Planck"],
      correctAnswer: 2,
      category: "Science",
      difficulty: "hard",
      value: 64000
    },
    {
      id: 72,
      question: "What is the only state in the United States that grows coffee commercially?",
      options: ["California", "Florida", "Hawaii", "Louisiana"],
      correctAnswer: 2,
      category: "Geography",
      difficulty: "hard",
      value: 125000
    },
    {
      id: 73,
      question: "Who was the first female winner of a Nobel Prize?",
      options: ["Marie Curie", "Irène Joliot-Curie", "Dorothy Hodgkin", "Rosalind Franklin"],
      correctAnswer: 0,
      category: "History",
      difficulty: "hard",
      value: 250000
    },
    {
      id: 74,
      question: "Which is the only Shakespeare play that mentions America?",
      options: ["The Tempest", "Hamlet", "Macbeth", "A Midsummer Night's Dream"],
      correctAnswer: 0,
      category: "Literature",
      difficulty: "hard",
      value: 500000
    },
    {
      id: 75,
      question: "What is the rarest blood type in humans?",
      options: ["AB negative", "B negative", "O negative", "A negative"],
      correctAnswer: 0,
      category: "Biology",
      difficulty: "hard",
      value: 1000000
    },
    {
      id: 76,
      question: "Who was the first person to prove that the Earth revolves around the Sun?",
      options: ["Galileo Galilei", "Nicolaus Copernicus", "Johannes Kepler", "Isaac Newton"],
      correctAnswer: 1,
      category: "Science",
      difficulty: "hard",
      value: 64000
    },
    {
      id: 77,
      question: "Which of these is NOT one of the Seven Wonders of the Ancient World?",
      options: ["Great Pyramid of Giza", "Hanging Gardens of Babylon", "Colosseum of Rome", "Temple of Artemis at Ephesus"],
      correctAnswer: 2,
      category: "History",
      difficulty: "hard",
      value: 125000
    },
    {
      id: 78,
      question: "What was the first country to grant women the right to vote?",
      options: ["United States", "United Kingdom", "New Zealand", "France"],
      correctAnswer: 2,
      category: "History",
      difficulty: "hard",
      value: 250000
    },
    {
      id: 79,
      question: "Which composer was completely deaf when he wrote his Ninth Symphony?",
      options: ["Wolfgang Amadeus Mozart", "Ludwig van Beethoven", "Johann Sebastian Bach", "Frédéric Chopin"],
      correctAnswer: 1,
      category: "Music",
      difficulty: "hard",
      value: 500000
    },
    {
      id: 80,
      question: "What is the smallest country in the world by land area?",
      options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"],
      correctAnswer: 1,
      category: "Geography",
      difficulty: "hard",
      value: 1000000
    },
    {
      id: 81,
      question: "Who was the only U.S. President to resign from office?",
      options: ["Richard Nixon", "Lyndon B. Johnson", "Gerald Ford", "Jimmy Carter"],
      correctAnswer: 0,
      category: "Politics",
      difficulty: "hard",
      value: 64000
    },
    {
      id: 82,
      question: "Which element was named after the Greek word for 'green'?",
      options: ["Oxygen", "Hydrogen", "Chlorine", "Neon"],
      correctAnswer: 2,
      category: "Chemistry",
      difficulty: "hard",
      value: 125000
    },
    {
      id: 83,
      question: "What is the only sea without any coastlines?",
      options: ["Dead Sea", "Red Sea", "Sargasso Sea", "Caspian Sea"],
      correctAnswer: 2,
      category: "Geography",
      difficulty: "hard",
      value: 250000
    },
    {
      id: 84,
      question: "Which ancient civilization invented the concept of zero?",
      options: ["Egyptians", "Greeks", "Mayans", "Indians"],
      correctAnswer: 3,
      category: "History",
      difficulty: "hard",
      value: 500000
    },
    {
      id: 85,
      question: "What is the longest English word without a true vowel (a, e, i, o, u)?",
      options: ["Rhythm", "Crypt", "Sylph", "Lymph"],
      correctAnswer: 0,
      category: "Language",
      difficulty: "hard",
      value: 1000000
    },
    {
      id: 86,
      question: "Which chemical element has the highest melting point?",
      options: ["Tungsten", "Carbon", "Titanium", "Osmium"],
      correctAnswer: 0,
      category: "Chemistry",
      difficulty: "hard",
      value: 64000
    },
    {
      id: 87,
      question: "Who was the first woman to win a Nobel Prize in two different fields?",
      options: ["Irène Joliot-Curie", "Marie Curie", "Rita Levi-Montalcini", "Dorothy Hodgkin"],
      correctAnswer: 1,
      category: "Science",
      difficulty: "hard",
      value: 125000
    },
    {
      id: 88,
      question: "What is the oldest continuously inhabited city in the world?",
      options: ["Athens, Greece", "Jerusalem, Israel", "Damascus, Syria", "Varanasi, India"],
      correctAnswer: 2,
      category: "Geography",
      difficulty: "hard",
      value: 250000
    },
    {
      id: 89,
      question: "Who is regarded as the father of modern computer science?",
      options: ["Charles Babbage", "Alan Turing", "John von Neumann", "Tim Berners-Lee"],
      correctAnswer: 1,
      category: "Technology",
      difficulty: "hard",
      value: 500000
    },
    {
      id: 90,
      question: "What is the closest star to our solar system?",
      options: ["Betelgeuse", "Alpha Centauri", "Proxima Centauri", "Sirius"],
      correctAnswer: 2,
      category: "Astronomy",
      difficulty: "hard",
      value: 1000000
    },
    {
      id: 91,
      question: "Which of these languages is NOT Indo-European?",
      options: ["Danish", "Persian", "Hungarian", "Greek"],
      correctAnswer: 2,
      category: "Language",
      difficulty: "hard",
      value: 64000
    },
    {
      id: 92,
      question: "Who proved that DNA has a double helix structure?",
      options: ["Watson and Crick", "Franklin and Wilkins", "Mendel and Morgan", "Sanger and Kornberg"],
      correctAnswer: 0,
      category: "Science",
      difficulty: "hard",
      value: 125000
    },
    {
      id: 93,
      question: "What was the first successful vaccine developed?",
      options: ["Polio", "Tuberculosis", "Rabies", "Smallpox"],
      correctAnswer: 3,
      category: "Medicine",
      difficulty: "hard",
      value: 250000
    },
    {
      id: 94,
      question: "Which famous poet wrote 'Do not go gentle into that good night'?",
      options: ["T.S. Eliot", "Dylan Thomas", "W.H. Auden", "Sylvia Plath"],
      correctAnswer: 1,
      category: "Literature",
      difficulty: "hard",
      value: 500000
    },
    {
      id: 95,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Argon"],
      correctAnswer: 2,
      category: "Science",
      difficulty: "hard",
      value: 1000000
    },
    {
      id: 96,
      question: "Who discovered the neutron?",
      options: ["Ernest Rutherford", "Marie Curie", "James Chadwick", "Niels Bohr"],
      correctAnswer: 2,
      category: "Physics",
      difficulty: "hard",
      value: 64000
    },
    {
      id: 97,
      question: "Which movie won the first Academy Award for Best Picture?",
      options: ["Wings", "Gone with the Wind", "Casablanca", "All Quiet on the Western Front"],
      correctAnswer: 0,
      category: "Entertainment",
      difficulty: "hard",
      value: 125000
    },
    {
      id: 98,
      question: "Which chess piece can only move diagonally?",
      options: ["Knight", "Rook", "Bishop", "Queen"],
      correctAnswer: 2,
      category: "Games",
      difficulty: "hard",
      value: 250000
    },
    {
      id: 99,
      question: "In which decade was the Internet first made available to the public?",
      options: ["1960s", "1970s", "1980s", "1990s"],
      correctAnswer: 2,
      category: "Technology",
      difficulty: "hard",
      value: 500000
    },
    {
      id: 100,
      question: "Which ancient civilization built Machu Picchu?",
      options: ["Maya", "Inca", "Aztec", "Olmec"],
      correctAnswer: 1,
      category: "History",
      difficulty: "hard",
      value: 1000000
    }
  ];
};
