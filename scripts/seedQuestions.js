#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const User = require('../models/User');

// Sample questions data
const sampleQuestions = [
  // JavaScript Questions
  {
    questionText: "What is the output of console.log(typeof null) in JavaScript?",
    questionType: "multiple_choice",
    options: [
      { text: "null", isCorrect: false },
      { text: "object", isCorrect: true },
      { text: "undefined", isCorrect: false },
      { text: "string", isCorrect: false }
    ],
    explanation: "In JavaScript, typeof null returns 'object' due to a historical bug in the language that has been kept for backwards compatibility.",
    difficulty: "easy",
    category: "javascript",
    tags: ["types", "null", "typeof", "fundamentals"],
    timeLimit: 45
  },
  {
    questionText: "What will be the output of the following code?\n\n```javascript\nconsole.log(1 + '2' + '2');\nconsole.log(1 + +'2' + '2');\n```",
    questionType: "text",
    correctAnswer: "122\n32",
    explanation: "First line: 1 + '2' + '2' = '1' + '2' + '2' = '122'. Second line: 1 + +'2' + '2' = 1 + 2 + '2' = 3 + '2' = '32'. The unary + converts '2' to number 2.",
    difficulty: "medium",
    category: "javascript",
    tags: ["operators", "type-coercion", "strings", "numbers"],
    timeLimit: 90,
    codeSnippet: {
      language: "javascript",
      code: "console.log(1 + '2' + '2');\nconsole.log(1 + +'2' + '2');"
    }
  },
  {
    questionText: "Which method is used to add new elements to the end of an array in JavaScript?",
    questionType: "multiple_choice",
    options: [
      { text: "append()", isCorrect: false },
      { text: "push()", isCorrect: true },
      { text: "add()", isCorrect: false },
      { text: "insert()", isCorrect: false }
    ],
    explanation: "The push() method adds one or more elements to the end of an array and returns the new length of the array.",
    difficulty: "easy",
    category: "javascript",
    tags: ["arrays", "methods", "fundamentals"],
    timeLimit: 30
  },
  {
    questionText: "What is a closure in JavaScript?",
    questionType: "text",
    correctAnswer: "A closure is a function that has access to variables in its outer (enclosing) scope even after the outer function has finished executing.",
    explanation: "Closures are created when a function is defined inside another function, giving the inner function access to the outer function's variables. This is a powerful feature for data privacy and creating function factories.",
    difficulty: "hard",
    category: "javascript",
    tags: ["closures", "scope", "functions", "advanced"],
    timeLimit: 180
  },

  // HTML/CSS Questions
  {
    questionText: "Which HTML element is used for the largest heading?",
    questionType: "multiple_choice",
    options: [
      { text: "<h6>", isCorrect: false },
      { text: "<h1>", isCorrect: true },
      { text: "<header>", isCorrect: false },
      { text: "<heading>", isCorrect: false }
    ],
    explanation: "The <h1> element represents the largest/most important heading, while <h6> represents the smallest heading.",
    difficulty: "easy",
    category: "html_css",
    tags: ["html", "headings", "semantics"],
    timeLimit: 30
  },
  {
    questionText: "What does CSS stand for?",
    questionType: "text",
    correctAnswer: "Cascading Style Sheets",
    explanation: "CSS stands for Cascading Style Sheets. It's a stylesheet language used to describe the presentation of HTML documents.",
    difficulty: "easy",
    category: "html_css",
    tags: ["css", "fundamentals", "definitions"],
    timeLimit: 30
  },
  {
    questionText: "Which CSS property is used to control the spacing between elements?",
    questionType: "multiple_choice",
    options: [
      { text: "margin", isCorrect: true },
      { text: "padding", isCorrect: false },
      { text: "border", isCorrect: false },
      { text: "spacing", isCorrect: false }
    ],
    explanation: "The margin property controls the space outside an element (between elements), while padding controls the space inside an element.",
    difficulty: "easy",
    category: "html_css",
    tags: ["css", "box-model", "spacing"],
    timeLimit: 45
  },

  // React Questions
  {
    questionText: "What is JSX in React?",
    questionType: "text",
    correctAnswer: "JSX is a syntax extension for JavaScript that allows you to write HTML-like syntax in JavaScript code.",
    explanation: "JSX (JavaScript XML) is a syntax extension that allows you to write HTML-like syntax within JavaScript. It gets transpiled to regular JavaScript function calls.",
    difficulty: "medium",
    category: "react",
    tags: ["jsx", "syntax", "fundamentals"],
    timeLimit: 90
  },
  {
    questionText: "Which hook is used to manage state in functional components?",
    questionType: "multiple_choice",
    options: [
      { text: "useEffect", isCorrect: false },
      { text: "useState", isCorrect: true },
      { text: "useContext", isCorrect: false },
      { text: "useReducer", isCorrect: false }
    ],
    explanation: "The useState hook allows you to add state to functional components. It returns an array with the current state value and a function to update it.",
    difficulty: "medium",
    category: "react",
    tags: ["hooks", "state", "functional-components"],
    timeLimit: 60
  },

  // Python Questions
  {
    questionText: "What is the output of print(type([]) == list) in Python?",
    questionType: "multiple_choice",
    options: [
      { text: "True", isCorrect: true },
      { text: "False", isCorrect: false },
      { text: "None", isCorrect: false },
      { text: "Error", isCorrect: false }
    ],
    explanation: "The type([]) returns <class 'list'>, and comparing it with list returns True because they are the same type object.",
    difficulty: "easy",
    category: "python",
    tags: ["types", "lists", "type-checking"],
    timeLimit: 45
  },
  {
    questionText: "What is a list comprehension in Python?",
    questionType: "text",
    correctAnswer: "A concise way to create lists by applying an expression to each item in an iterable, optionally with a condition.",
    explanation: "List comprehensions provide a more readable and efficient way to create lists. Syntax: [expression for item in iterable if condition]",
    difficulty: "medium",
    category: "python",
    tags: ["list-comprehension", "syntax", "loops"],
    timeLimit: 120
  },

  // Algorithms Questions
  {
    questionText: "What is the time complexity of binary search?",
    questionType: "multiple_choice",
    options: [
      { text: "O(n)", isCorrect: false },
      { text: "O(log n)", isCorrect: true },
      { text: "O(n log n)", isCorrect: false },
      { text: "O(n²)", isCorrect: false }
    ],
    explanation: "Binary search has O(log n) time complexity because it eliminates half of the remaining elements in each iteration.",
    difficulty: "medium",
    category: "algorithms",
    tags: ["time-complexity", "search", "big-o"],
    timeLimit: 60
  },
  {
    questionText: "What is the space complexity of merge sort?",
    questionType: "multiple_choice",
    options: [
      { text: "O(1)", isCorrect: false },
      { text: "O(log n)", isCorrect: false },
      { text: "O(n)", isCorrect: true },
      { text: "O(n²)", isCorrect: false }
    ],
    explanation: "Merge sort requires O(n) additional space for the temporary arrays used during the merge process.",
    difficulty: "hard",
    category: "algorithms",
    tags: ["space-complexity", "sorting", "merge-sort"],
    timeLimit: 90
  },

  // Database Questions
  {
    questionText: "What does SQL stand for?",
    questionType: "text",
    correctAnswer: "Structured Query Language",
    explanation: "SQL (Structured Query Language) is a standard language for managing and manipulating relational databases.",
    difficulty: "easy",
    category: "databases",
    tags: ["sql", "definitions", "fundamentals"],
    timeLimit: 30
  },
  {
    questionText: "What is a primary key in a database?",
    questionType: "text",
    correctAnswer: "A unique identifier for each record in a database table that cannot be null.",
    explanation: "A primary key uniquely identifies each row in a table and ensures that no two rows have the same primary key value. It cannot contain null values.",
    difficulty: "medium",
    category: "databases",
    tags: ["primary-key", "constraints", "tables"],
    timeLimit: 90
  },

  // General Programming Questions
  {
    questionText: "What is the difference between compile-time and runtime?",
    questionType: "text",
    correctAnswer: "Compile-time is when source code is translated to machine code, runtime is when the program is executed.",
    explanation: "Compile-time occurs when source code is converted to executable code by a compiler. Runtime is when the compiled program is actually running and executing instructions.",
    difficulty: "medium",
    category: "general_programming",
    tags: ["compilation", "execution", "concepts"],
    timeLimit: 120
  },

  // True/False Questions
  {
    questionText: "JavaScript is a compiled language.",
    questionType: "true_false",
    correctAnswer: false,
    explanation: "JavaScript is an interpreted language, though modern JavaScript engines use just-in-time (JIT) compilation for optimization.",
    difficulty: "easy",
    category: "javascript",
    tags: ["language-types", "compilation", "interpretation"],
    timeLimit: 30
  },
  {
    questionText: "CSS Grid is better than Flexbox in all scenarios.",
    questionType: "true_false",
    correctAnswer: false,
    explanation: "CSS Grid and Flexbox serve different purposes. Grid is for 2D layouts, while Flexbox is for 1D layouts. Both have their optimal use cases.",
    difficulty: "medium",
    category: "html_css",
    tags: ["css-grid", "flexbox", "layout"],
    timeLimit: 45
  }
];

async function seedQuestions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/evaluation-tools', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find or create an admin user
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      adminUser = new User({
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        name: process.env.ADMIN_NAME || 'System Administrator',
        password: 'admin123',
        role: 'admin',
        provider: 'local'
      });
      await adminUser.save();
      console.log('Created admin user');
    }

    // Clear existing questions (optional)
    const clearExisting = process.argv.includes('--clear');
    if (clearExisting) {
      await Question.deleteMany({});
      console.log('Cleared existing questions');
    }

    // Add createdBy to all questions
    const questionsWithCreator = sampleQuestions.map(q => ({
      ...q,
      createdBy: adminUser._id
    }));

    // Insert questions
    const result = await Question.insertMany(questionsWithCreator);
    console.log(`Successfully created ${result.length} questions`);

    // Display category and difficulty distribution
    const categories = await Question.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const difficulties = await Question.aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\nCategory Distribution:');
    categories.forEach(cat => console.log(`  ${cat._id}: ${cat.count} questions`));

    console.log('\nDifficulty Distribution:');
    difficulties.forEach(diff => console.log(`  ${diff._id}: ${diff.count} questions`));

    console.log('\n✅ Question seeding completed successfully!');

  } catch (error) {
    console.error('Error seeding questions:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the seeding
if (require.main === module) {
  console.log('🌱 Seeding questions database...');
  console.log('Use --clear flag to remove existing questions first\n');
  seedQuestions();
}

module.exports = { sampleQuestions, seedQuestions };