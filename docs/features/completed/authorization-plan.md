# Authorization & Roles Implementation Plan

## Overview

This document outlines the implementation plan for adding authentication, authorization, and role-based access control to the Travel Planner application.

### Requirements Summary

| Requirement | Decision |
|-------------|----------|
| Authentication Method | JWT Tokens |
| User Roles | Admin + User (two-tier) |
| Trip Sharing | View-only sharing |
| User Storage | PostgreSQL |

---

## Phase 1: Database & User Model

### 1.1 PostgreSQL Migration

**Tasks:**
- [ ] Add PostgreSQL connection configuration
- [ ] Update `database.py` to support PostgreSQL
- [ ] Create database migration scripts
- [ ] Update environment variables

**Files to modify:**
- `database.py` - Add PostgreSQL support
- `.env` / `.env.example` - Add DATABASE_URL
- `requirements.txt` - Add `psycopg2-binary`

**Database URL Format:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/travel_planner
```

### 1.2 User Model

**New file:** `app/models/user.py`

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

class UserRole(enum.Enum):
    ADMIN = "admin"
    USER = "user"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trips = relationship("Trip", back_populates="owner", cascade="all, delete-orphan")
    shared_trips = relationship("TripShare", back_populates="user")
```

### 1.3 Trip Ownership

**Modify:** `app/models/trip.py`

```python
# Add to Trip model
user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
owner = relationship("User", back_populates="trips")
shares = relationship("TripShare", back_populates="trip", cascade="all, delete-orphan")
```

### 1.4 Trip Sharing Model

**New file:** `app/models/trip_share.py`

```python
class TripShare(Base):
    __tablename__ = "trip_shares"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission = Column(String(20), default="view")  # "view" only for now
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    trip = relationship("Trip", back_populates="shares")
    user = relationship("User", back_populates="shared_trips")

    # Unique constraint: one share per user per trip
    __table_args__ = (
        UniqueConstraint('trip_id', 'user_id', name='unique_trip_user_share'),
    )
```

---

## Phase 2: Authentication Backend

### 2.1 Dependencies

**Add to `requirements.txt`:**
```
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
```

### 2.2 Security Utilities

**New file:** `app/core/security.py`

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenData(
            user_id=payload.get("sub"),
            email=payload.get("email"),
            role=payload.get("role")
        )
    except JWTError:
        return None
```

### 2.3 Authentication Dependencies

**New file:** `app/core/deps.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.core.security import decode_token

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    token_data = decode_token(token)

    if not token_data or not token_data.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == token_data.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user
```

### 2.4 Auth Router

**New file:** `app/routers/auth.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, UserResponse, Token
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token
)

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    token_data = {"sub": user.id, "email": user.email, "role": user.role.value}

    return Token(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data)
    )

@router.post("/refresh", response_model=Token)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    token_data = decode_token(refresh_token)
    if not token_data or token_data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == token_data.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_token_data = {"sub": user.id, "email": user.email, "role": user.role.value}

    return Token(
        access_token=create_access_token(new_token_data),
        refresh_token=create_refresh_token(new_token_data)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
```

### 2.5 Auth Schemas

**New file:** `app/schemas/auth.py`

```python
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
```

---

## Phase 3: Protect Existing Routes

### 3.1 Trip Router Updates

**Modify:** `app/routers/trips.py`

```python
from app.core.deps import get_current_user
from app.models.user import User

# Add user dependency to all endpoints

@router.get("/", response_model=List[TripSchema])
def get_trips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get owned trips + shared trips
    owned = db.query(Trip).filter(Trip.user_id == current_user.id).all()
    shared_ids = db.query(TripShare.trip_id).filter(
        TripShare.user_id == current_user.id
    ).all()
    shared = db.query(Trip).filter(Trip.id.in_([s[0] for s in shared_ids])).all()
    return owned + shared

@router.post("/", response_model=TripSchema)
def create_trip(
    trip: TripCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_trip = Trip(**trip.model_dump(), user_id=current_user.id)
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip
```

### 3.2 Trip Access Helper

**New file:** `app/core/permissions.py`

```python
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.trip import Trip
from app.models.trip_share import TripShare
from app.models.user import User, UserRole

def get_trip_with_access(
    trip_id: int,
    user: User,
    db: Session,
    require_owner: bool = False
) -> Trip:
    """
    Get a trip if user has access.
    - Admins can access all trips
    - Owners can access their trips
    - Users with shares can view (if require_owner=False)
    """
    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Admins have full access
    if user.role == UserRole.ADMIN:
        return trip

    # Owner has full access
    if trip.user_id == user.id:
        return trip

    # Check for share access (view only)
    if not require_owner:
        share = db.query(TripShare).filter(
            TripShare.trip_id == trip_id,
            TripShare.user_id == user.id
        ).first()
        if share:
            return trip

    raise HTTPException(status_code=403, detail="Access denied")

def require_trip_owner(trip_id: int, user: User, db: Session) -> Trip:
    """Get trip only if user is owner or admin."""
    return get_trip_with_access(trip_id, user, db, require_owner=True)
```

### 3.3 Trip Sharing Endpoints

**Add to:** `app/routers/trips.py`

```python
@router.post("/{trip_id}/share", response_model=TripShareResponse)
def share_trip(
    trip_id: int,
    share_data: TripShareCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only owner can share
    trip = require_trip_owner(trip_id, current_user, db)

    # Find user to share with
    target_user = db.query(User).filter(User.email == share_data.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot share with yourself")

    # Check if already shared
    existing = db.query(TripShare).filter(
        TripShare.trip_id == trip_id,
        TripShare.user_id == target_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already shared with this user")

    share = TripShare(trip_id=trip_id, user_id=target_user.id, permission="view")
    db.add(share)
    db.commit()
    db.refresh(share)
    return share

@router.delete("/{trip_id}/share/{user_id}")
def unshare_trip(
    trip_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trip = require_trip_owner(trip_id, current_user, db)

    share = db.query(TripShare).filter(
        TripShare.trip_id == trip_id,
        TripShare.user_id == user_id
    ).first()

    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    db.delete(share)
    db.commit()
    return {"message": "Share removed"}

@router.get("/{trip_id}/shares", response_model=List[TripShareResponse])
def get_trip_shares(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trip = require_trip_owner(trip_id, current_user, db)
    return trip.shares
```

---

## Phase 4: Frontend Authentication

### 4.1 Auth Context

**New file:** `frontend/lib/auth-context.tsx`

```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from './api';

interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const response = await authApi.getMe();
        setUser(response.data);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);

    const userResponse = await authApi.getMe();
    setUser(userResponse.data);
  };

  const register = async (email: string, password: string, fullName?: string) => {
    await authApi.register({ email, password, full_name: fullName });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### 4.2 API Client Updates

**Modify:** `frontend/lib/api.ts`

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refresh_token: refreshToken }
          );

          localStorage.setItem('access_token', response.data.access_token);
          localStorage.setItem('refresh_token', response.data.refresh_token);

          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
};

// ... rest of existing API exports
```

### 4.3 Protected Route Wrapper

**New file:** `frontend/components/auth/ProtectedRoute.tsx`

```typescript
'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

### 4.4 Login Page

**New file:** `frontend/app/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/trips');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">Sign In</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm">
          Don't have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### 4.5 Update Layout

**Modify:** `frontend/app/layout.tsx`

```typescript
import { AuthProvider } from '@/lib/auth-context';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header /> {/* Add user menu with logout */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## Phase 5: Admin Features

### 5.1 Admin Router

**New file:** `app/routers/admin.py`

```python
from fastapi import APIRouter, Depends
from app.core.deps import get_admin_user
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users", response_model=List[UserResponse])
def list_users(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    return db.query(User).all()

@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role: UserRole,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = role
    db.commit()
    return {"message": "Role updated"}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": "User deleted"}
```

---

## Phase 6: Database Migration

### 6.1 Migration Script

**New file:** `migrations/001_add_auth_tables.sql`

```sql
-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email
CREATE INDEX idx_users_email ON users(email);

-- Add user_id to trips
ALTER TABLE trips ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Create trip_shares table
CREATE TABLE trip_shares (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    permission VARCHAR(20) DEFAULT 'view',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trip_id, user_id)
);

-- Create admin user (change password!)
INSERT INTO users (email, hashed_password, full_name, role)
VALUES ('admin@example.com', '$2b$12$...', 'Admin User', 'admin');
```

---

## Implementation Order

### Sprint 1: Backend Auth (2-3 days)
1. Set up PostgreSQL connection
2. Create User model and migrations
3. Implement security utilities (JWT, password hashing)
4. Create auth router (register, login, refresh, me)
5. Test auth endpoints

### Sprint 2: Route Protection (2-3 days)
1. Add auth dependencies
2. Update Trip model with user_id
3. Create TripShare model
4. Update trip router with ownership checks
5. Add sharing endpoints
6. Update other routers (destinations, activities, etc.)

### Sprint 3: Frontend Auth (2-3 days)
1. Create auth context
2. Update API client with interceptors
3. Create login/register pages
4. Create protected route wrapper
5. Update layout with auth provider
6. Add user menu to header

### Sprint 4: Polish & Testing (1-2 days)
1. Admin features
2. Error handling improvements
3. E2E tests for auth flows
4. Documentation updates

---

## Security Considerations

1. **Password Requirements**: Minimum 8 characters, mix of letters/numbers
2. **Token Expiry**: Access token: 30 min, Refresh token: 7 days
3. **Rate Limiting**: Add rate limiting to auth endpoints
4. **HTTPS**: Ensure production uses HTTPS only
5. **Environment Variables**: Never commit SECRET_KEY
6. **Password Reset**: Add password reset flow (future enhancement)

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/travel_planner

# JWT
SECRET_KEY=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Testing Checklist

- [ ] User registration works
- [ ] User login returns tokens
- [ ] Token refresh works
- [ ] Protected routes require auth
- [ ] Users can only see their trips
- [ ] Trip sharing works (view-only)
- [ ] Admin can manage users
- [ ] Frontend auth flow complete
- [ ] Token persistence works
- [ ] Logout clears tokens
