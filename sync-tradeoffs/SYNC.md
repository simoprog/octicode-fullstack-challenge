# Real-Time vs Periodic Polling – Simple View

## 1. What we compare
- **Real-time** – Firestore live listeners (web + mobile).  
- **Polling** – mobile / front-end asks “anything new?” every X seconds.

## 2. Quick scorecard

| Concern | Real-time (Firestore) | Periodic Polling |
|---------|----------------------|------------------|
| Battery | Keeps radio awake → **higher drain** | Radio sleeps between polls → **lower drain** |
| Cost | You pay for **every document read** the listener fires | You pay once per poll (batch read) |
| Offline cache | Built-in, app works offline | Must build yourself |
| Conflict resolution | Last-write-wins (with server timestamp) | You control merge logic |
| Code complexity | One-liner `.onSnapshot()` | SetInterval + backoff logic |

## 3. Rule of thumb
- **Mobile → server**: upload once, no need for live socket.  
- **Server → web dashboard**: doctors want **instant** “new recording” badge → use Firestore listener.  
- **Mobile ← server**: doctor already **knows** she uploaded the file; no urgency → poll every 60 s (or use push notification).

## 4. Recommended hybrid (simple)
1. Mobile app **polls** `/sync?since=timestamp` every 60 s (or when app returns to foreground).  
2. Web dashboard opens **Firestore listener** on `clinics/{id}/recordings` for real-time tiles.  
3. If mobile **needs** immediate feedback (rare), send **push notification** instead of keeping socket alive.

Result:  
- Battery friendly (no constant radio).  
- Wallet friendly (fewer reads).  
- Still feels “live” on the web where it matters.