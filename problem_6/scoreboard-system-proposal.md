# Real-Time Scoreboard System - Technical Proposal

---

## 1. System Overview

### 1.1 Requirements

- **Live Scoreboard Display**: Top 10 users ranked by score
- **Real-time Updates**: Instant reflection of score changes across all connected clients
- **User Actions**: Authorized actions that increase user scores
- **Security**: Prevention of malicious score manipulation
- **Scalability**: Support for multiple concurrent users

### 1.2 Features

1. WebSocket-based real-time communication
2. JWT-based authentication and authorization
3. Server-side action validation
4. Rate limiting and anti-cheat mechanisms
5. Optimized database queries for leaderboard

---

## 2. System Architecture

### 2.1 High-Level Components

**Frontend (Web Client)**
- React/Vue/Angular SPA
- WebSocket client for real-time updates
- Score display and user interaction UI

**Authentication Server**
- OAuth 2.0 compliant authorization server
- Issues and validates JWT tokens
- Manages refresh tokens
- User credential verification
- Token revocation and rotation

**Backend (Application Server)**
- RESTful API for actions and leaderboard
- WebSocket server for real-time broadcasts
- Business logic and validation layer
- Verifies JWT tokens from Auth Server

**Database**
- User data and scores
- Action logs and audit trails
- Indexed for leaderboard queries

**Cache Layer**
- Redis for leaderboard caching
- Session management
- Rate limiting data

**Message Queue**
- RabbitMQ for reliable action processing
- Ensures no user actions are lost
- Enables async processing and fault tolerance
- Dead letter queue for failed messages

---

## 3. Detailed Component Design

### 3.1 OAuth 2.0 Authentication & Authorization Flow

The system implements OAuth 2.0 with JWT tokens for secure authentication.

#### 3.1.1 Initial Authentication (Authorization Code Flow)

**Step 1: User Initiates Login**
- User clicks "Login" in client application
- Client redirects to Authentication Server's authorization endpoint
- URL: `GET /oauth/authorize?client_id=xxx&response_type=code&redirect_uri=xxx&scope=read write`

**Step 2: User Authentication**
- Authentication Server presents login form
- User enters credentials (username/password)
- Auth Server validates credentials against user database

**Step 3: Authorization Code Issued**
- Auth Server redirects back to client with authorization code
- URL: `https://client-app.com/callback?code=AUTH_CODE_HERE`
- Code is short-lived (10 minutes) and single-use

**Step 4: Exchange Code for Tokens**
- Client exchanges authorization code for tokens
- POST to `/oauth/token` with:
  - grant_type: authorization_code
  - code: AUTH_CODE_HERE
  - client_id: xxx
  - client_secret: xxx
  - redirect_uri: xxx

**Step 5: Receive Tokens**
- Auth Server returns token response:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "def502004daf3c1b...",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "read write"
}
```

**Step 6: Store and Use Tokens**
- Client stores tokens securely (localStorage/sessionStorage)
- Access token used for API requests: `Authorization: Bearer {access_token}`
- Access token used for WebSocket authentication

#### 3.1.2 Token Refresh Flow

**When Access Token Expires:**

**Step 1: Detect Expiration**
- API returns 401 Unauthorized
- Client checks token expiration time

**Step 2: Request New Access Token**
- POST to `/oauth/token` with:
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "def502004daf3c1b...",
  "client_id": "xxx",
  "client_secret": "xxx"
}
```

**Step 3: Receive New Tokens**
```json
{
  "access_token": "new_access_token",
  "refresh_token": "new_refresh_token",
  "token_type": "Bearer",
  "expires_in": 900
}
```

**Step 4: Re-authenticate WebSocket**
- Send new access token to WebSocket server
- WebSocket connection remains open (no reconnection needed)

### 3.2 Score Update Flow (with RabbitMQ)

**Step 1: User Action**
- User performs an action in the UI
- Frontend sends HTTP POST to `/api/v1/actions/perform`
- Request includes JWT token, action type, and unique nonce

**Step 2: API Server Quick Validation**
- Verify JWT token authenticity
- Basic rate limit check (Redis)
- Validate action type format

**Step 3: Publish to RabbitMQ**
- API server publishes message to `user-actions` queue
- Message marked as persistent (survives broker restart)
- Publisher confirms receipt from RabbitMQ
- API returns 202 Accepted with message ID immediately

**Step 4: Background Worker Processes Queue**
- Worker consumes message from RabbitMQ queue
- Validates action preconditions and business rules
- Checks detailed rate limits and cooldowns
- Calculates score increase based on action type

**Step 5: Database Update**
- Atomic score increment operation in transaction
- Log action in audit trail
- Update user's last_action timestamp
- On success: ACK message to RabbitMQ
- On failure: NACK message (requeue or send to dead-letter)

**Step 6: Cache Update**
- Update Redis leaderboard (ZADD operation)
- Invalidate related caches

**Step 7: Real-time Broadcast**
- Worker triggers WebSocket broadcast
- All connected clients receive score update
- UI smoothly animates score changes

**Score Update Flow**
```
  ┌─────────┐
  │ Client  │
  └────┬────┘
       │
       │ 1. POST /actions/perform (JWT)
       ▼
  ┌──────────────────┐
  │   API Server     │
  └────┬─────────────┘
       │
       │ 2. Publish to Queue (202 Accepted)
       ▼
  ┌──────────────────┐
  │    RabbitMQ      │
  │ user-actions Q   │
  └────┬─────────────┘
       │
       │ 3. Consume message
       ▼
  ┌──────────────────┐
  │ Background Worker│
  └────┬─────────────┘
       │
       │ 4. UPDATE users SET score...
       ▼
  ┌──────────────────┐
  │    Database      │
  └──────────────────┘

       │ 5. ZADD leaderboard...
       ▼
  ┌──────────────────┐
  │   Redis Cache    │
  └──────────────────┘

       │ 6a. Direct call (Option 1)
       │ 6b. Pub/Sub publish (Option 2)
       ▼
  ┌──────────────────┐
  │ WebSocket Server │
  └────┬─────────────┘
       │
       │ 7. Broadcast to all clients
       ▼
  ┌─────────┐ ┌─────────┐ ┌─────────┐
  │Client 1 │ │Client 2 │ │Client N │
  └─────────┘ └─────────┘ └─────────┘
```

## 4. Security Measures

### 4.1 Authentication Security

**JWT Token Protection**
- Short expiration time (15-30 minutes)
- Refresh token mechanism for extended sessions
- Secure signing algorithm (RS256 or HS256)

### 4.2 Action Validation

**Server-Side Checks**
1. **Authentication**: Verify JWT signature and expiration
2. **Authorization**: Ensure user can perform this action
3. **Rate Limiting**: Enforce per-user and per-IP limits
4. **Action Integrity**: Validate action parameters and timing
5. **Duplicate Detection**: Check for replay attacks using nonce/timestamp

**Example Rate Limiting**
```
- Global: 100 requests per minute per IP
- User: 10 score actions per minute
- Action-specific cooldowns: 5 seconds between similar actions
```

### 4.3 Anti-Cheat Mechanisms

**Behavioral Analysis**
- Track action patterns and timing
- Flag suspicious rapid-fire actions
- Monitor score progression anomalies

**Server Authority**
- All score calculations on server
- Client only sends action type, not score value
- Server determines score increase based on action

**Audit Trail**
- Log all score changes with:
  - User ID
  - Action type
  - Timestamp
  - IP address
  - Score delta
  - Request headers

### 4.4 Database Security

- Use parameterized queries (prevent SQL injection)
- Atomic transactions for score updates
- Regular backup and integrity checks

---

## 5. Database Schema

### 5.1 Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    score INTEGER DEFAULT 0,
    last_action_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_score ON users(score DESC);
CREATE INDEX idx_users_username ON users(username);
```

### 5.2 Action Logs Table
```sql
CREATE TABLE action_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    score_delta INTEGER NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_action_logs_user_id ON action_logs(user_id);
CREATE INDEX idx_action_logs_created_at ON action_logs(created_at);
```

---

## 6. API Specification

### 6.1 OAuth 2.0 Authentication Endpoints (Auth Server)

**GET api/v1/oauth/authorize**

Initiates OAuth 2.0 authorization code flow

```
Query Parameters:
- response_type: "code" (required)
- client_id: application client ID (required)
- redirect_uri: callback URL (required)
- scope: "read write" (required)
- state: CSRF token (recommended)

Response: HTTP 302 Redirect
- Success: {redirect_uri}?code=AUTH_CODE&state=xxx
- Error: {redirect_uri}?error=access_denied&error_description=xxx
```

**POST api/v1/oauth/token**

Exchange authorization code or refresh token for access token

```json
Request (Authorization Code Grant):
{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE_HERE",
  "client_id": "scoreboard_web_app",
  "client_secret": "client_secret_here",
  "redirect_uri": "https://app.example.com/callback"
}

Request (Refresh Token Grant):
{
  "grant_type": "refresh_token",
  "refresh_token": "def502004daf3c1b...",
  "client_id": "scoreboard_web_app",
  "client_secret": "client_secret_here"
}

Response (Success):
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "def502004daf3c1b...",
  "scope": "read write"
}

Response (Error):
{
  "error": "invalid_grant",
  "error_description": "Authorization code is invalid or expired"
}
```

**POST api/v1/oauth/revoke**

Revoke access or refresh token

```json
Request:
{
  "token": "token_to_revoke",
  "token_type_hint": "access_token"
}

Response: HTTP 200 OK
{
  "revoked": true
}
```

**GET api/v1/oauth/userinfo**

Get user information (requires valid access token)

```
Request Headers:
Authorization: Bearer {access_token}

Response:
{
  "sub": "user_123",
  "username": "player1",
  "email": "player1@example.com",
  "email_verified": true
}
```

### 6.2 Score Action Endpoint

**POST /api/v1/actions/perform**
```json
Request Headers:
Authorization: Bearer {jwt_token}

Request Body:
{
  "action_type": "complete_task",
  "action_data": {
    "task_id": "string",
    "completion_time": 1234567890
  },
  "nonce": "unique_request_id"
}

Response (Success):
{
  "success": true,
  "score_delta": 10,
  "new_score": 1010,
  "message": "Action completed successfully"
}

Response (Rate Limited):
{
  "success": false,
  "error": "rate_limit_exceeded",
  "retry_after": 30
}

Response (Invalid):
{
  "success": false,
  "error": "invalid_action",
  "message": "Action preconditions not met"
}
```

### 6.3 Leaderboard Endpoint

**GET /api/v1/leaderboard**
```json
Response:
{
  "leaderboard": [
    {
      "rank": 1,
      "user_id": 123,
      "username": "player1",
      "score": 5000
    },
    {
      "rank": 2,
      "user_id": 456,
      "username": "player2",
      "score": 4500
    }
    // ... top 10 users
  ],
  "updated_at": "2025-11-13T10:30:00Z"
}
```

---

## 7. WebSocket Protocol

### 7.1 Connection Setup

**Client Connects (Using Socket.io)**
```javascript
const socket = io('wss://your-server.com', {
  auth: {
    token: jwt_token
  }
});
```

**Server Authenticates**
- Verify JWT token
- Add connection to active pool
- Send initial leaderboard data

### 7.2 Message Types

**Server → Client: Leaderboard Update**
```json
{
  "type": "leaderboard_update",
  "data": {
    "leaderboard": [...],
    "timestamp": "2025-11-13T10:30:00Z"
  }
}
```

**Server → Client: User Score Update**
```json
{
  "type": "score_update",
  "data": {
    "user_id": 123,
    "username": "player1",
    "old_score": 1000,
    "new_score": 1010,
    "rank_change": 0
  }
}
```

**Client → Server: Heartbeat/Ping**
```json
{
  "type": "ping",
  "timestamp": 1234567890
}
```

---

## 8. RabbitMQ Configuration

### 8.1 Queue Setup

**Main Queue: user-actions**
```javascript
channel.assertQueue('user-actions', {
  durable: true,              // Survive broker restart
  arguments: {
    'x-message-ttl': 3600000, // 1 hour TTL
    'x-dead-letter-exchange': 'dlx',
    'x-max-priority': 10      // Priority support
  }
});
```

**Dead Letter Queue: user-actions.failed**
```javascript
channel.assertExchange('dlx', 'direct', { durable: true });
channel.assertQueue('user-actions.failed', { durable: true });
channel.bindQueue('user-actions.failed', 'dlx', '');
```

### 8.2 Publisher Configuration

**Reliability Settings**
- Use confirm channels for publisher acknowledgments
- Mark messages as persistent (written to disk)
- Implement retry logic for failed publishes
- Add unique message IDs for idempotency

**Example:**
```javascript
const channel = await connection.createConfirmChannel();

channel.sendToQueue('user-actions',
  Buffer.from(JSON.stringify({
    messageId: uuid(),
    userId,
    actionType,
    actionData,
    timestamp: Date.now()
  })),
  { persistent: true }
);

await channel.waitForConfirms(); // Wait for RabbitMQ ACK
```

### 8.3 Consumer Configuration

**Reliability Settings**
- Manual acknowledgments (noAck: false)
- Prefetch count of 1 for fair distribution
- Idempotency checks using Redis
- Automatic retry with exponential backoff

**Example:**
```javascript
await channel.prefetch(1);

channel.consume('user-actions', async (msg) => {
  try {
    await processAction(JSON.parse(msg.content));
    channel.ack(msg); // Success
  } catch (error) {
    if (retryCount < 3) {
      channel.nack(msg, false, true); // Requeue
    } else {
      channel.nack(msg, false, false); // To DLQ
    }
  }
}, { noAck: false });
```

### 8.4 Benefits of RabbitMQ Integration

**Reliability**
- No action lost due to server crashes
- Messages persist to disk
- Automatic redelivery on consumer failure

**Performance**
- API responds quickly (202 Accepted)
- Async processing decouples API from DB
- Better handling of traffic spikes

**Fault Tolerance**
- Failed messages sent to dead-letter queue
- Admin can review and retry failed actions
- System continues operating during failures

---

## 9. Performance Optimization

### 9.1 Caching Strategy

**Redis Leaderboard Cache**
- Use Redis Sorted Set for O(log N) operations
- Key: `leaderboard:global`
- Store: `ZADD leaderboard:global {score} {user_id}`
- Retrieve top 10: `ZREVRANGE leaderboard:global 0 9 WITHSCORES`
- TTL: 60 seconds or invalidate on update

### 9.2 Database Optimization

- Use database indexes on score column
- Implement query result caching
- Use read replicas for leaderboard queries
- Batch database writes when possible

### 9.3 WebSocket Optimization

- Implement message batching (combine multiple updates)
- Client-side throttling (max 1 UI update per 500ms)
- Compress WebSocket messages (gzip)
- Use binary protocols for high-frequency updates (msgpack)

---

## 10. Deployment Strategy

### 10.1 Infrastructure Setup

1. **Application Server**: 2+ instances behind load balancer
2. **WebSocket Server**: Sticky sessions or Redis adapter for Socket.io
3. **RabbitMQ Cluster**: 2+ nodes for high availability
4. **Database**: Primary with read replicas
5. **Cache**: Redis cluster for high availability
6. **CDN**: Static assets and client code

### 10.2 Scaling Considerations

**Horizontal Scaling**
- Add more application server instances
- Database sharding if user base exceeds 10M users

**Vertical Scaling**
- Increase server resources for WebSocket handling
- Optimize database indexes and queries

---

## 11. Future Enhancements

1. **Real-time Notifications**: Push notifications for rank changes
2. **Achievements System**: Badges and milestones
3. **Historical Analytics**: Score progression over time
4. **Social Features**: Friend leaderboards, challenges
