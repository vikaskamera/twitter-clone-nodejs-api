# Twitter Clone Backend API

## Overview

This project is a RESTful backend API for a Twitter-like social media
application built using:

-   Node.js
-   Express.js
-   SQLite
-   JWT Authentication
-   Bcrypt Password Hashing

It supports user authentication, following system, tweets, likes,
replies, and secure access control.

------------------------------------------------------------------------

# Base URL

http://localhost:3000/

------------------------------------------------------------------------

# Authentication

All protected routes require JWT token in headers:

Authorization: Bearer `<jwtToken>`

------------------------------------------------------------------------

# Database Tables

## user

-   user_id (INTEGER, PRIMARY KEY)
-   name (TEXT)
-   username (TEXT)
-   password (TEXT)
-   gender (TEXT)

## follower

-   follower_id (INTEGER)
-   follower_user_id (INTEGER)
-   following_user_id (INTEGER)

## tweet

-   tweet_id (INTEGER)
-   tweet (TEXT)
-   user_id (INTEGER)
-   date_time (TEXT)

## like

-   like_id (INTEGER)
-   user_id (INTEGER)
-   tweet_id (INTEGER)

## reply

-   reply_id (INTEGER)
-   tweet_id (INTEGER)
-   user_id (INTEGER)
-   reply (TEXT)
-   date_time (TEXT)

------------------------------------------------------------------------

# API Endpoints

## 1. Register User
```
POST /register/
```
### Request Body
```
{ 
    "username": "john", 
    "password": "secret123", 
    "name": "John Doe", 
    "gender": "male" 
}
```
### Responses
```
-   200 → User created successfully
-   400 → User already exists
-   400 → Password is too short
```
------------------------------------------------------------------------

## 2. Login
```
POST /login/
```
### Request Body
```
{ 
    "username": "john",
     "password": "secret123"
}
```
### Response
```
{ 
    "jwtToken": "token"
}
```
------------------------------------------------------------------------

## 3. Get User Feed
```
GET /user/tweets/feed/
```
Returns latest 4 tweets from followed users.

------------------------------------------------------------------------

## 4. Get Following List
```
GET /user/following/
```
------------------------------------------------------------------------

## 5. Get Followers List
```
GET /user/followers/
```
------------------------------------------------------------------------

## 6. Get Tweet Details
```
GET /tweets/:tweetId/
```
Response: 
```
{ 
    "tweet": "Hello World",
    "likes": 5,
    "replies": 2,
    "dateTime": "2026-02-24 10:00:00"
}
```
------------------------------------------------------------------------

## 7. Get Tweet Likes
```
GET /tweets/:tweetId/likes/
```
Response: 
```
{ 
    "likes": ["alice", "bob", ...]
}
```
------------------------------------------------------------------------

## 8. Get Tweet Replies
```
GET /tweets/:tweetId/replies/
```
Response: 
```
{ 
    "replies": [ 
        { 
            "name": "Alice", 
            "reply": "Nice!" 
        }, 
        ...
    ]
}
```
------------------------------------------------------------------------

## 9. Get User Tweets
```
GET /user/tweets/
```
------------------------------------------------------------------------

## 10. Create Tweet
```
POST /user/tweets/
```
Request: 
```
{ 
    "tweet": "New tweet" 
}
```
Response: 
```
Created a Tweet
```
------------------------------------------------------------------------

## 11. Delete Tweet
```
DELETE /tweets/:tweetId/
```
Response: 
```
Tweet Removed
```
------------------------------------------------------------------------

# Middleware

-   authenticateToken → Verifies JWT
-   checkFollowingUserTweets → Validates access to followed users'
    tweets
-   checkUserTweet → Ensures tweet belongs to logged-in user

------------------------------------------------------------------------

# How to Run
```
npm install 
node app.js
```
Server runs at: http://localhost:3000/
