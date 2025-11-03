## Security & Data Integrity

- **SQL Injection** – the login and invite endpoints concatenate raw strings into SQL.  
  **Fix:** use parameterized queries:

  ```ts
  const sql = "SELECT * FROM users WHERE email = $1 AND password = $2";
  const result = await pool.query(sql, [email, hash]);
  ```
- **Weak password hashing** – MD5 is cryptographically broken and unsalted.  
	**Fix:** switch to `bcrypt` (work factor ≥ 12):
```ts
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);
````

- **Session Token Predictability**: The session token uses `Buffer.from(email + ":" + Date.now()).toString('base64')`, which is not cryptographically secure and can be easily predicted or reversed to extract the email.
- **Fix**: Use a cryptographically secure random generator: `crypto.randomBytes(32).toString('hex')`

- **Global Session Storage**: Using `(global as any).SESSIONS` stores sessions in application memory, which doesn't scale across multiple server instances and is lost on restart.
- **Fix**: Use Redis, a database, or secure JWT tokens for session management

## Architecture & Maintainability

- **Router exports default but file is named `user.ts`** – rename to `auth.ts` or split into `/auth/login`, `/auth/invite`.
- **Business logic inside route handlers** – hard to unit-test.  
   **Fix:** extract pure functions `createSession()`, `hashPassword()`, `generateTempPassword()`.
- **Missing Input Validation**: No validation for email format, password requirements, or request body structure. This can lead to runtime errors and poor user experience.
  - **Fix**: Add validation middleware or use a library like `express-validator` or `zod`
- **No Rate Limiting**: The authentication endpoints lack rate limiting, making them vulnerable to brute-force attacks.
  - **Fix**: Implement rate limiting using `express-rate-limit` middleware
- **Missing error handling**: No global error handler, and errors from pool queries could expose stack traces or internal details.
  - **Fix**: Add error handling middleware and sanitize error responses
