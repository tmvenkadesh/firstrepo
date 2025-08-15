# Question Management API Documentation

This document describes the Question Bank Management and Randomization Engine API endpoints.

## Overview

The Question Management system provides:
- Smart randomization algorithms with weighted selection
- Comprehensive CRUD operations for question management
- Advanced filtering and categorization
- Performance analytics and statistics
- Adaptive questioning based on user performance
- Question pool validation and management

## Base URL

All endpoints are prefixed with: `/api/questions`

## Authentication

All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

Admin endpoints additionally require admin privileges.

## Question Object Structure

```javascript
{
  "_id": "ObjectId",
  "questionText": "What is JavaScript?",
  "questionType": "multiple_choice", // multiple_choice, true_false, coding, text
  "options": [
    {
      "_id": "ObjectId",
      "text": "A programming language",
      "isCorrect": true // Only visible to admins
    },
    {
      "_id": "ObjectId", 
      "text": "A coffee type",
      "isCorrect": false
    }
  ],
  "correctAnswer": "A programming language", // Hidden in user responses
  "explanation": "JavaScript is a programming language...",
  "difficulty": "easy", // easy, medium, hard
  "category": "javascript",
  "tags": ["fundamentals", "language"],
  "timeLimit": 60, // seconds
  "points": 1,
  "codeSnippet": {
    "language": "javascript",
    "code": "console.log('Hello World');"
  },
  "usage": {
    "timesAsked": 0,
    "correctAnswers": 0,
    "totalAttempts": 0,
    "averageTime": 0
  },
  "isActive": true,
  "createdBy": "ObjectId",
  "lastModifiedBy": "ObjectId",
  "version": 1,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## User Endpoints

### Get Questions for Evaluation

```http
GET /api/questions
```

Get randomized questions for evaluation with various selection strategies.

**Query Parameters:**
- `count` (number, default: 10) - Number of questions to return
- `categories` (string) - Comma-separated category names
- `difficulties` (string) - Comma-separated difficulty levels
- `tags` (string) - Comma-separated tags
- `level` (string) - User level: beginner, intermediate, advanced
- `type` (string) - Selection type: random, adaptive, recommended, skill-assessment, level

**Response:**
```javascript
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "questionText": "What is JavaScript?",
      "questionType": "multiple_choice",
      "options": [
        { "_id": "...", "text": "A programming language" },
        { "_id": "...", "text": "A coffee type" }
      ],
      "difficulty": "easy",
      "category": "javascript",
      "tags": ["fundamentals"],
      "timeLimit": 60,
      "points": 1
      // correctAnswer hidden
    }
  ],
  "sessionId": "uuid-v4",
  "count": 1
}
```

**Examples:**
```bash
# Get 5 random JavaScript questions
GET /api/questions?count=5&categories=javascript

# Get beginner-level questions
GET /api/questions?type=level&level=beginner&count=10

# Get skill assessment for multiple categories  
GET /api/questions?type=skill-assessment&categories=javascript,python,react&count=15

# Get recommended questions based on user history
GET /api/questions?type=recommended&count=5
```

### Validate Answer

```http
POST /api/questions/validate
```

Submit and validate user answer, get immediate feedback and update statistics.

**Request Body:**
```javascript
{
  "questionId": "ObjectId",
  "userAnswer": "A programming language", // or array for multiple choice
  "sessionId": "uuid-v4", 
  "timeSpent": 45 // seconds
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "isCorrect": true,
    "pointsEarned": 2,
    "correctAnswer": "A programming language",
    "explanation": "JavaScript is indeed a programming language...",
    "feedback": {
      "isCorrect": true,
      "pointsEarned": 2,
      "timeSpent": 45,
      "correctAnswer": "A programming language",
      "explanation": "JavaScript is indeed...",
      "message": "Excellent! Quick and correct."
    }
  }
}
```

### Get Categories

```http
GET /api/questions/categories
```

Get all available question categories with statistics.

**Response:**
```javascript
{
  "success": true,
  "data": [
    {
      "category": "javascript",
      "count": 25,
      "difficulties": ["easy", "medium", "hard"]
    },
    {
      "category": "python", 
      "count": 18,
      "difficulties": ["easy", "medium", "hard"]
    }
  ]
}
```

### Get Question Statistics

```http
GET /api/questions/stats/:questionId
```

Get detailed statistics for a specific question.

**Response:**
```javascript
{
  "success": true,
  "data": {
    "id": "ObjectId",
    "timesAsked": 150,
    "successRate": 65, // percentage
    "averageTime": 48, // seconds
    "difficulty": "medium",
    "category": "javascript"
  }
}
```

## Admin Endpoints

### Get All Questions (Admin)

```http
GET /api/questions/admin
```

Get paginated list of all questions with full details for admin management.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page
- `category` (string) - Filter by category
- `difficulty` (string) - Filter by difficulty
- `isActive` (boolean) - Filter by active status
- `search` (string) - Text search in question content
- `sortBy` (string, default: createdAt) - Sort field
- `sortOrder` (string, default: desc) - Sort direction: asc, desc

**Response:**
```javascript
{
  "success": true,
  "data": [
    {
      // Full question object with correctAnswer and usage stats
      "_id": "...",
      "questionText": "What is JavaScript?",
      "correctAnswer": "A programming language",
      "usage": {
        "timesAsked": 150,
        "correctAnswers": 98,
        "totalAttempts": 150,
        "averageTime": 48
      },
      "createdBy": {
        "_id": "...",
        "name": "Admin User",
        "email": "admin@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pages": 5,
    "total": 100,
    "limit": 20
  }
}
```

### Create Question (Admin)

```http
POST /api/questions/admin
```

Create a new question.

**Request Body:**
```javascript
{
  "questionText": "What is the capital of France?",
  "questionType": "multiple_choice",
  "options": [
    { "text": "London", "isCorrect": false },
    { "text": "Berlin", "isCorrect": false },
    { "text": "Paris", "isCorrect": true },
    { "text": "Madrid", "isCorrect": false }
  ],
  "explanation": "Paris is the capital and largest city of France.",
  "difficulty": "easy",
  "category": "general_programming",
  "tags": ["geography", "capitals"],
  "timeLimit": 30,
  "codeSnippet": {
    "language": "none",
    "code": ""
  }
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Question created successfully",
  "data": {
    // Created question object with _id
  }
}
```

### Update Question (Admin)

```http
PUT /api/questions/admin/:questionId
```

Update an existing question.

**Request Body:** Same as create, all fields optional

**Response:**
```javascript
{
  "success": true,
  "message": "Question updated successfully",
  "data": {
    // Updated question object
  }
}
```

### Delete Question (Admin)

```http
DELETE /api/questions/admin/:questionId
```

Soft delete (deactivate) a question.

**Response:**
```javascript
{
  "success": true,
  "message": "Question deactivated successfully"
}
```

### Bulk Create Questions (Admin)

```http
POST /api/questions/admin/bulk
```

Create multiple questions in a single request.

**Request Body:**
```javascript
{
  "questions": [
    {
      "questionText": "Question 1?",
      "questionType": "multiple_choice",
      "options": [
        { "text": "A", "isCorrect": true },
        { "text": "B", "isCorrect": false }
      ],
      "difficulty": "easy",
      "category": "javascript"
    },
    {
      // Question 2...
    }
  ]
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Successfully created 15 questions",
  "data": {
    "created": 15,
    "total": 15
  }
}
```

### Validate Question Pool (Admin)

```http
POST /api/questions/admin/validate-pool
```

Validate if the question pool is sufficient for evaluation requirements.

**Request Body:**
```javascript
{
  "totalQuestions": 20,
  "categories": ["javascript", "python", "react"],
  "difficulties": ["easy", "medium", "hard"],
  "minQuestionsPerCategory": 5
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "isValid": false,
    "issues": [
      "Insufficient questions in category 'react': need 5, available 3",
      "Insufficient questions for difficulty 'hard': recommended 7, available 5"
    ],
    "recommendations": [
      "Add more questions to the database",
      "Consider adjusting evaluation parameters",
      "Review question distribution across categories and difficulties"
    ]
  }
}
```

## Question Types

### Multiple Choice
- `questionType`: "multiple_choice"
- Requires `options` array with at least 2 options
- One or more options can be correct
- `correctAnswer` is automatically set from correct options

### True/False
- `questionType`: "true_false" 
- `correctAnswer` should be boolean or "True"/"False"
- `options` array is auto-generated if not provided

### Text/Coding
- `questionType`: "text" or "coding"
- `correctAnswer` is a string
- Validation uses case-insensitive exact match
- For coding questions, use `codeSnippet` to provide sample code

## Categories

Available categories:
- `javascript`, `python`, `java`, `csharp`, `cpp`
- `html_css`, `react`, `nodejs`  
- `databases`, `algorithms`, `data_structures`
- `system_design`, `devops`, `testing`, `git`
- `general_programming`, `web_development`
- `mobile_development`, `cloud_computing`, `security`

## Difficulty Levels

- `easy`: Basic concepts, 1 point, simple questions
- `medium`: Intermediate concepts, 2 points, moderate complexity
- `hard`: Advanced concepts, 3 points, complex scenarios

## Randomization Strategies

### Random Selection
- Pure random selection from available pool
- Respects filters (category, difficulty, tags)
- Avoids recently asked questions

### Weighted Selection
- Less frequently asked questions have higher probability
- Balances question exposure across the pool
- Maintains randomness while improving distribution

### Level-Based Selection
- **Beginner**: 70% easy, 30% medium questions
- **Intermediate**: 60% medium, 40% hard questions  
- **Advanced**: 100% hard questions
- Smart category selection based on level

### Skill Assessment
- Balanced distribution across specified categories
- Equal representation of difficulty levels
- Comprehensive coverage for evaluation

### Adaptive Selection
- Analyzes user's session performance
- Adjusts difficulty based on success rate
- Focuses on weak categories for improvement

### Recommended Questions
- Based on user's historical performance
- Identifies improvement areas
- Provides targeted practice questions

## Error Handling

All endpoints return consistent error responses:

```javascript
{
  "success": false,
  "message": "Error description",
  "errors": ["Specific error details"] // For validation errors
}
```

**Common HTTP Status Codes:**
- 200: Success
- 201: Created successfully
- 400: Bad request / Validation error
- 401: Unauthorized
- 403: Forbidden (insufficient permissions)
- 404: Resource not found
- 500: Internal server error

## Rate Limiting

Question endpoints are subject to rate limiting:
- General endpoints: 100 requests per 15 minutes
- Admin endpoints: 200 requests per 15 minutes

## Performance Considerations

- Question randomization uses MongoDB aggregation for efficiency
- Pagination is implemented for large datasets
- Database indexes optimize query performance
- Question display format removes sensitive data

## Usage Examples

### Start a JavaScript Assessment
```javascript
// 1. Get questions
const response = await fetch('/api/questions?categories=javascript&count=10', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data: questions, sessionId } = await response.json();

// 2. Present questions to user...

// 3. Validate each answer
for (const answer of userAnswers) {
  const validationResponse = await fetch('/api/questions/validate', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      questionId: answer.questionId,
      userAnswer: answer.answer,
      sessionId: sessionId,
      timeSpent: answer.timeSpent
    })
  });
  
  const feedback = await validationResponse.json();
  // Show feedback to user
}
```

### Admin: Add Questions from JSON
```javascript
const questions = [
  {
    questionText: "What is React?",
    questionType: "multiple_choice", 
    options: [
      { text: "A library", isCorrect: true },
      { text: "A framework", isCorrect: false }
    ],
    difficulty: "easy",
    category: "react"
  }
];

const response = await fetch('/api/questions/admin/bulk', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ questions })
});
```

This completes the Question Management API documentation covering all available endpoints, data structures, and usage patterns.