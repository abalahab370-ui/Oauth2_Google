const { OAuth2Client } = require( 'google-auth-library');
const jwt = require( 'jsonwebtoken' );
const db = require( '../db.js' ); // Your DB client (Prisma, Knex, Pg, etc.)

// Initialize the Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const googleAuth = async (req, res) => {
  try {
    // body: { token: "GOOGLE_ID_TOKEN_FROM_FRONTEND" }

    const { token } = req.body;

    // Step 1: Input Validation

    if (!token) {
      return res.status(400).json({ error: 'Google ID Token is required.' });
    }

    // Step 2: Verify Token Cryptographically via Google SDK
    
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID, // Guarantees token was issued for StoreDZ
      });
    } catch (verifyError) {
      console.error('Google token verification failed:', verifyError.message);
      return res.status(401).json({ error: 'Invalid or expired Google token.' });
    }

    const payload = ticket.getPayload();

    // Extra Security Guard: Ensure Google has verified this email address
    if (!payload.email_verified) {
      return res.status(403).json({ error: 'Unverified Google email address.' });
    }

    const { sub: googleId, email, name, picture } = payload;

    // Step 3: Find or Create User in Database

    // Query DB for user matching googleId OR email
    let user = await db.user.findFirst({
      where: {
        OR: [
          { googleId: googleId },
          { email: email }
        ]
      }
    });

    if (!user) {
      // CASE A: User doesn't exist -> Create new account
      user = await db.user.create({
        data: {
          email,
          name,
          avatar: picture,
          googleId,
          password: null // Google users have no password
        }
      });
    } else if (!user.googleId) {
      // CASE B: User registered via Email/Password previously -> Link Google ID
      user = await db.user.update({
        where: { id: user.id },
        data: {
          googleId,
          avatar: user.avatar || picture // Update avatar if empty
        }
      });
    }

    // Step 4: Issue Application Access Token & Refresh Token

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    // Save Refresh Token to DB (or Redis) for token revocation / rotation
    await db.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    // Step 5: Return Response to Client
    // Send Refresh Token in an HttpOnly secure cookie

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure : true ,
      sameSite: 'Non',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Return Access Token and safe User Profile in JSON response
    return res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Unhandled Auth Error:', error);
    return res.status(500).json({ error: 'Internal Server Error during authentication.' });
  }
};

module.exports = googleAuth ;