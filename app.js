const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'twitterClone.db')
let database = null

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server running at http://localhost:3000/')
    })
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

// Authenticate Token Middleware
const authenticateToken = (request, response, next) => {
  const authHeader = request.headers['authorization']
  let jwtToken
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }

  if (jwtToken === undefined) {
    // invalid jwt token
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SCRETE_KEY', async (error, user) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.userId = user.userId
        next()
      }
    })
  }
}

// Check Followings Tweet Middleware
const checkFollowingUserTweets = async (request, response, next) => {
  const userId = request.userId
  const {tweetId} = request.params
  const getFollowingTweetQuery = `
    SELECT
      *
    FROM
      tweet
    WHERE
      tweet_id = ${tweetId}
      AND user_id IN (
        SELECT
          following_user_id
        FROM
          follower
        WHERE
          follower_user_id = ${userId}
      )`
  const dbResponse = await database.get(getFollowingTweetQuery)

  if (dbResponse === undefined) {
    // invalid request
    response.status(401)
    response.send('Invalid Request')
  } else {
    next()
  }
}

// Check User Tweets Middleware
const checkUserTweet = async (request, response, next) => {
  const userId = request.userId
  const {tweetId} = request.params
  const checkUserTweetQuery = `
    SELECT
      *
    FROM
      tweet
    WHERE
      user_id = ${userId}
      AND tweet_id = ${tweetId};`

  const tweetObject = await database.get(checkUserTweetQuery)

  if (tweetObject === undefined) {
    // invalid request
    response.status(401)
    response.send('Invalid Request')
  } else {
    // call next middleware or handler
    next()
  }
}

// DB Feed To User Feed
const getFeedDBToUserFeed = eachObject => {
  return {
    username: eachObject.username,
    tweet: eachObject.tweet,
    dateTime: eachObject.date_time,
  }
}

// Get Tweet Likes Function
const getDBTweetLikesToTweetLikes = likedUsers => {
  const likesArray = likedUsers.map(eachObject => eachObject.username)
  return {
    likes: likesArray,
  }
}

// 1 User Register API
app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE
      username = '${username}';`
  const dbUser = await database.get(selectUserQuery)

  if (dbUser === undefined) {
    // check password
    const isValidPassword = password.length >= 6
    if (isValidPassword) {
      // create user in database
      const hashedPassword = await bcrypt.hash(password, 10)
      const insertUserQuery = `
        INSERT INTO
          user (name, username, password, gender)
        VALUES (
          '${name}',
          '${username}',
          '${hashedPassword}',
          '${gender}'
        );`
      await database.run(insertUserQuery)
      response.send('User created successfully')
    } else {
      // password too short
      response.status(400)
      response.send('Password is too short')
    }
  } else {
    // user already exists
    response.status(400)
    response.send('User already exists')
  }
})

// 2 User Login API
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE
      username = '${username}';`
  const dbUser = await database.get(selectUserQuery)

  if (dbUser === undefined) {
    // Invalid User
    response.status(400)
    response.send('Invalid user')
  } else {
    // check password
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched) {
      // generate jwt token
      const user = {userId: dbUser.user_id}
      const jwtToken = jwt.sign(user, 'MY_SCRETE_KEY')
      response.send({jwtToken})
    } else {
      // invalid password
      response.status(400)
      response.send('Invalid password')
    }
  }
})

// 3 Get Feed API
app.get('/user/tweets/feed/', authenticateToken, async (request, response) => {
  const userId = request.userId
  const getFeedQuery = `
    SELECT
      u.username,
      t.tweet,
      t.date_time
    FROM
      follower AS f
      INNER JOIN user AS u
      ON f.following_user_id = u.user_id
      INNER JOIN tweet AS t
      ON u.user_id = t.user_id
    WHERE
      f.follower_user_id = ${userId}
    ORDER BY
      t.date_time DESC
    LIMIT
    4 OFFSET 0;`
  const feedArray = await database.all(getFeedQuery)
  response.send(feedArray.map(eachObject => getFeedDBToUserFeed(eachObject)))
})

// 4 Get Followings API
app.get('/user/following/', authenticateToken, async (request, response) => {
  const userId = request.userId
  const getFollowsQuery = `
    SELECT
      u.name
    FROM
      follower AS f
      INNER JOIN user AS u
      ON f.following_user_id = u.user_id
    WHERE
      f.follower_user_id = ${userId}
    ORDER BY
      u.user_id ASC`
  const followsArray = await database.all(getFollowsQuery)
  response.send(followsArray)
})

// 5 Get Followers API
app.get('/user/followers/', authenticateToken, async (request, response) => {
  const userId = request.userId
  const getFollowersQuery = `
    SELECT
      u.name
    FROM
      follower AS f
      INNER JOIN user AS u
      ON f.follower_user_id = u.user_id
    WHERE
      f.following_user_id = ${userId}
    ORDER BY
      u.user_id ASC`
  const followersArray = await database.all(getFollowersQuery)
  response.send(followersArray)
})

// 6 Get Tweet API
app.get(
  '/tweets/:tweetId/',
  authenticateToken,
  checkFollowingUserTweets,
  async (request, response) => {
    const {tweetId} = request.params
    const getTweetDetailsQuery = `
      SELECT
        tweet, (
          SELECT
            COUNT(like_id)
          FROM
            like
          WHERE
            tweet_id = ${tweetId}
        ) AS likes, (
          SELECT
            COUNT(reply_id)
          FROM
            reply
          WHERE
            tweet_id = ${tweetId}
        ) AS replies,
        date_time
      FROM
        tweet
      WHERE
        tweet_id = ${tweetId}`
    const tweetObject = await database.get(getTweetDetailsQuery)
    response.send({
      tweet: tweetObject.tweet,
      likes: tweetObject.likes,
      replies: tweetObject.replies,
      dateTime: tweetObject.date_time,
    })
  },
)

// 7 Get Tweet Likes API
app.get(
  '/tweets/:tweetId/likes/',
  authenticateToken,
  checkFollowingUserTweets,
  async (request, response) => {
    const {tweetId} = request.params
    const getLikesQuery = `
      SELECT
        u.username
      FROM
        like AS l
        INNER JOIN user AS u
        ON l.user_id = u.user_id
      WHERE
        l.tweet_id = ${tweetId}
      ORDER BY
        u.user_id ASC;`
    const likedUsers = await database.all(getLikesQuery)
    response.send(getDBTweetLikesToTweetLikes(likedUsers))
  },
)

// 8 Get Tweet Replies API
app.get(
  '/tweets/:tweetId/replies/',
  authenticateToken,
  checkFollowingUserTweets,
  async (request, response) => {
    const {tweetId} = request.params
    const getTweetReplyQuery = `
    SELECT
      u.name,
      r.reply
    FROM
      reply AS r
      INNER JOIN user AS u
      ON r.user_id = u.user_id
    WHERE
      r.tweet_id = ${tweetId}
    ORDER BY
      r.user_id ASC`
    const repliesArray = await database.all(getTweetReplyQuery)
    response.send({replies: repliesArray})
  },
)

// 9 Get Tweets API
app.get('/user/tweets/', authenticateToken, async (request, response) => {
  const userId = request.userId
  const getTweetsQuery = `
    SELECT
      t.tweet,
      COUNT(DISTINCT like_id) AS likes,
      COUNT(DISTINCT reply_id) AS replies,
      t.date_time AS dateTime
    FROM
      tweet AS t 
      LEFT JOIN like AS l
      ON t.tweet_id = l.tweet_id
      LEFT JOIN reply AS r
      ON t.tweet_id = r.tweet_id
    WHERE
      t.user_id = ${userId}
    GROUP BY
      t.tweet_id
    ORDER BY
      t.tweet_id ASC;`
  const tweetArray = await database.all(getTweetsQuery)
  response.send(tweetArray)
})

// 10 Insert Tweet API
app.post('/user/tweets/', authenticateToken, async (request, response) => {
  const {tweet} = request.body
  const userId = request.userId
  const insertTweetQuery = `
    INSERT INTO
      tweet (tweet, user_id, date_time)
    VALUES (
      '${tweet}',
      ${userId},
      datetime('now')
    );`
  await database.run(insertTweetQuery)
  response.send('Created a Tweet')
})

// 11 Delete Tweet API
app.delete(
  '/tweets/:tweetId/',
  authenticateToken,
  checkUserTweet,
  async (request, response) => {
    const {tweetId} = request.params
    const deleteTweetQuery = `
    DELETE FROM
      tweet
    WHERE
      tweet_id = ${tweetId}`
    await database.run(deleteTweetQuery)
    response.send('Tweet Removed')
  },
)

module.exports = app
