import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, UserStats, dbFallback, isMongoConnected } from '../models/Schemas';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cricket_secret_key_12345';

// JWT Helper
const generateToken = (userId: string, username: string) => {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });
};

// Middleware to authenticate JWT
export const authenticateJWT = async (req: any, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    
    // Find user in DB or fallback
    let user;
    if (isMongoConnected) {
      user = await User.findById(decoded.userId);
    } else {
      user = await dbFallback.findUserById(decoded.userId);
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      userId: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
      isGuest: user.isGuest,
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Register
router.post('/register', async (req: Request, res: Response) => {
  const { username, password, avatar } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    let existingUser;
    if (isMongoConnected) {
      existingUser = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    } else {
      existingUser = await dbFallback.findUserByUsername(username);
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const avatarChoice = avatar || `avatar${Math.floor(Math.random() * 8) + 1}`;

    let user;
    if (isMongoConnected) {
      user = new User({
        username,
        passwordHash,
        isGuest: false,
        avatar: avatarChoice,
      });
      await user.save();

      // Initialize stats
      const stats = new UserStats({
        userId: user._id,
        username: user.username,
      });
      await stats.save();
    } else {
      user = await dbFallback.createUser({
        username,
        passwordHash,
        isGuest: false,
        avatar: avatarChoice,
      });
    }

    const token = generateToken(user._id.toString(), user.username);
    return res.status(201).json({
      token,
      user: {
        userId: user._id.toString(),
        username: user.username,
        avatar: user.avatar,
        isGuest: false,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    let user;
    if (isMongoConnected) {
      user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    } else {
      user = await dbFallback.findUserByUsername(username);
    }

    if (!user || user.isGuest || !user.passwordHash) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user._id.toString(), user.username);
    return res.json({
      token,
      user: {
        userId: user._id.toString(),
        username: user.username,
        avatar: user.avatar,
        isGuest: false,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Guest Login
router.post('/guest', async (req: Request, res: Response) => {
  const { avatar } = req.body;
  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const username = `Guest_${randSuffix}`;
  const avatarChoice = avatar || `avatar${Math.floor(Math.random() * 8) + 1}`;

  try {
    let user;
    if (isMongoConnected) {
      user = new User({
        username,
        passwordHash: null,
        isGuest: true,
        avatar: avatarChoice,
      });
      await user.save();

      // Initialize stats
      const stats = new UserStats({
        userId: user._id,
        username: user.username,
      });
      await stats.save();
    } else {
      user = await dbFallback.createUser({
        username,
        passwordHash: null,
        isGuest: true,
        avatar: avatarChoice,
      });
    }

    const token = generateToken(user._id.toString(), user.username);
    return res.status(201).json({
      token,
      user: {
        userId: user._id.toString(),
        username: user.username,
        avatar: user.avatar,
        isGuest: true,
      },
    });
  } catch (err) {
    console.error('Guest creation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get User Profile Info (/me)
router.get('/me', authenticateJWT, (req: any, res: Response) => {
  return res.json({ user: req.user });
});

export default router;
