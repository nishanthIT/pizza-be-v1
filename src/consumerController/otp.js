// // controllers/otpController.js
// import jwt from 'jsonwebtoken';
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
// import crypto from 'crypto';
// import dotenv from 'dotenv'
// import { log } from 'console';

// let otpStorage = {};

// const generateOtp = async (req, res) => {
//   const { mobile } = req.body;

//   if (!mobile) {
//     return res.status(400).json({ success: false, message: 'Mobile number required' });
//   }

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();

//   // Store OTP for 5 minutes
//   otpStorage[mobile] = {
//     otp,
//     expires: Date.now() + 300000
//   };
//   console.log("otpStorage", otpStorage)

//   console.log(`OTP for ${mobile}: ${otp}`);
//   res.status(200).json({ success: true });
// };



// const generateToken = (userId, phone) => {
//     return jwt.sign(
//       { userId, phone },
//       process.env.JWT_SECRET,
//       { expiresIn: '1d' }
//     );
//   };

//   const verifyOtp = async (req, res) => {
//     const { mobile, otp } = req.body;
//    console.log("verify otp called")
//     console.log("mobile", mobile, "otp", otp)
//     if (!mobile || !otp) {
//        console.log("mobile or otp not provided")

//       return res.status(400).json({ success: false, message: 'Mobile and OTP required' });

//     }

//     try {
//       const storedOtp = otpStorage[mobile];
//       console.log("storedOtp", storedOtp, "otp", otp);

//       if (!storedOtp || storedOtp.expires < Date.now() || storedOtp.otp !== otp) {
//         console.log("otp not valid or expired")
//         return res.status(400).json({ 
//           success: false, 
//           message: 'Invalid or expired OTP' 
//         });
//       }
//    console.log("otp success")
//       // Check if user exists
//       let user = await prisma.user.findUnique({
//         where: { phone: mobile }
//       });

//       // Create new user if doesn't exist
//       if (!user) {
//         user = await prisma.user.create({
//           data: {
//             phone: mobile,
//             name: `User_${mobile.slice(-4)}`, // Default name
//             email: `${mobile}@pizzapp.com`, // Temporary email
//             password: crypto.randomBytes(16).toString('hex'), // Random password
//             address: 'Address not specified' // Default address
//           }
//         });
//       }

//       // Generate JWT token
//       const token = generateToken(user.id, user.phone);
//       console.log('Generated token:', token);

//       // Set cookie with token
//       res.cookie('authToken', token, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === 'production',
//         sameSite: 'lax', // Changed from 'strict'
//         maxAge: 24 * 60 * 60 * 1000,
//         domain: 'localhost' // Add this for local development
//       });

//       delete otpStorage[mobile];
//       return res.status(200).json({ 
//         success: true,
//         user: {
//           id: user.id,
//           name: user.name,
//           phone: user.phone,
//           email: user.email
//         }
//       });

//     } catch (error) {
//       console.error('Verification error:', error);
//       return res.status(500).json({ 
//         success: false, 
//         message: 'Internal server error' 
//       });
//     }
//   };

// export { generateOtp, verifyOtp };



// import jwt from 'jsonwebtoken';
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
// import crypto from 'crypto';
// import dotenv from 'dotenv'
// import { log } from 'console';

// import twilio from 'twilio';


// dotenv.config();
// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const twilioPhone = process.env.TWILIO_PHONE_NUMBER; // Your Twilio phone number  


// const client = twilio(accountSid, authToken);

// let otpStorage = {};

// // Helper function to format mobile number
// const formatMobileNumber = (mobile) => {
//   if (mobile.startsWith('+')) {
//     return mobile;
//   }

//   if (mobile.length === 10) {
//     return `+44${mobile}`;
//   } else if (mobile.length === 11 && mobile.startsWith('0')) {
//     return `+44${mobile.substring(1)}`;
//   }

//   return mobile;
// };

// const generateOtp = async (req, res) => {
//   console.log("generateOtp called");
//   const { mobile } = req.body;

//   if (!mobile) {
//     return res.status(400).json({ success: false, message: 'Mobile number required' });
//   }

//   // Auto-format phone number for UK numbers only
//   let formattedMobile = formatMobileNumber(mobile);

//   // Validate UK phone number format
//   const ukPhoneRegex = /^\+44[1-9]\d{8,9}$/;
//   if (!ukPhoneRegex.test(formattedMobile)) {
//     return res.status(400).json({ 
//       success: false, 
//       message: 'Invalid UK phone number format. Examples: 7386235014, 07386235014, or +447386235014' 
//     });
//   }

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();

//   // Store OTP for 5 minutes (use formatted mobile number)
//   otpStorage[formattedMobile] = {
//     otp,
//     expires: Date.now() + 300000
//   };

//   console.log("otpStorage", otpStorage);
//   console.log(`OTP for ${formattedMobile}: ${otp}`);

//   try {
//     // Send SMS via Twilio
//     const message = await client.messages.create({
//       body: `Your OTP is: ${otp}. This code will expire in 5 minutes.`,
//       from: twilioPhone,
//       to: formattedMobile
//     });

//     console.log(`SMS sent successfully to ${formattedMobile}. SID: ${message.sid}`);

//     res.status(200).json({ 
//       success: true, 
//       message: 'OTP sent successfully',
//       messageSid: message.sid 
//     });

//   } catch (error) {
//     console.error('Error sending SMS:', error);

//     // Remove OTP from storage if SMS failed
//     delete otpStorage[formattedMobile];

//     res.status(500).json({ 
//       success: false, 
//       message: 'Failed to send OTP. Please try again.',
//       error: error.message 
//     });
//   }
// };

// const generateToken = (userId, phone) => {
//   return jwt.sign(
//     { userId, phone },
//     process.env.JWT_SECRET,
//     { expiresIn: '1d' }
//   );
// };

// const verifyOtp = async (req, res) => {
//   const { mobile, otp } = req.body;
//   console.log("verify otp called");
//   console.log("mobile", mobile, "otp", otp);

//   if (!mobile || !otp) {
//     console.log("mobile or otp not provided");
//     return res.status(400).json({ success: false, message: 'Mobile and OTP required' });
//   }

//   try {
//     // Format mobile number same way as in generateOtp
//     const formattedMobile = formatMobileNumber(mobile);

//     console.log("Formatted mobile:", formattedMobile);
//     console.log("Current otpStorage:", otpStorage);

//     const storedOtp = otpStorage[formattedMobile];
//     console.log("storedOtp", storedOtp, "input otp", otp);

//     if (!storedOtp || storedOtp.expires < Date.now() || storedOtp.otp !== otp) {
//       console.log("otp not valid or expired");
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Invalid or expired OTP' 
//       });
//     }

//     console.log("otp success");

//     // Check if user exists with formatted mobile number
//     let user = await prisma.user.findUnique({
//       where: { phone: formattedMobile }
//     });

//     // Create new user if doesn't exist
//     if (!user) {
//       user = await prisma.user.create({
//         data: {
//           phone: formattedMobile, // Store formatted number in database
//           name: `User_${formattedMobile.slice(-4)}`, // Default name
//           email: `${formattedMobile.replace('+', '')}@pizzapp.com`, // Temporary email
//           password: crypto.randomBytes(16).toString('hex'), // Random password
//           address: 'Address not specified' // Default address
//         }
//       });
//     }

//     // Generate JWT token
//     const token = generateToken(user.id, user.phone);
//     console.log('Generated token:', token);

//     const domain = process.env.NODE_ENV === 'production' 
//     ? '.circlepizzapizza.co.uk' // Leading dot for subdomains
//     : 'localhost';
//     // Set cookie with token
//     res.cookie('authToken', token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'lax',
//       maxAge: 24 * 60 * 60 * 1000,
//       domain: domain // Use environment variable for domain
//     });

//     // Clean up OTP storage
//     delete otpStorage[formattedMobile];

//     return res.status(200).json({ 
//       success: true,
//       user: {
//         id: user.id,
//         name: user.name,
//         phone: user.phone,
//         email: user.email
//       }
//     });

//   } catch (error) {
//     console.error('Verification error:', error);
//     return res.status(500).json({ 
//       success: false, 
//       message: 'Internal server error' 
//     });
//   }
// };

// export { generateOtp, verifyOtp };


import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import crypto from 'crypto';
import dotenv from 'dotenv'
import { log } from 'console';

import twilio from 'twilio';

dotenv.config();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

let otpStorage = {};
let attemptTracker = {}; // Track failed attempts
let rateLimitTracker = {}; // Track OTP generation rate

// Security configurations
const MAX_OTP_ATTEMPTS = 4; // Maximum attempts per phone number
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes lockout
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_OTP_REQUESTS = 4; // Maximum OTP requests per minute
const OTP_EXPIRY = 300000; // 5 minutes

// Helper function to format mobile number
const formatMobileNumber = (mobile) => {
  if (mobile.startsWith('+')) {
    return mobile;
  }

  if (mobile.length === 10) {
    return `+44${mobile}`;
  } else if (mobile.length === 11 && mobile.startsWith('0')) {
    return `+44${mobile.substring(1)}`;
  }

  return mobile;
};

// Check if phone number is rate limited
const isRateLimited = (phone) => {
  const now = Date.now();
  const phoneRateLimit = rateLimitTracker[phone];

  if (!phoneRateLimit) {
    rateLimitTracker[phone] = {
      count: 1,
      windowStart: now
    };
    return false;
  }

  // Reset window if expired
  if (now - phoneRateLimit.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitTracker[phone] = {
      count: 1,
      windowStart: now
    };
    return false;
  }

  // Check if exceeded limit
  if (phoneRateLimit.count >= MAX_OTP_REQUESTS) {
    return true;
  }

  phoneRateLimit.count++;
  return false;
};

// Check if phone number is locked out
const isLockedOut = (phone) => {
  const attempts = attemptTracker[phone];
  if (!attempts) return false;

  const now = Date.now();

  // Clear expired lockouts
  if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
    delete attemptTracker[phone];
    return false;
  }

  return attempts.count >= MAX_OTP_ATTEMPTS;
};

// Record failed attempt
const recordFailedAttempt = (phone) => {
  const now = Date.now();

  if (!attemptTracker[phone]) {
    attemptTracker[phone] = {
      count: 1,
      lastAttempt: now
    };
  } else {
    // Reset counter if last attempt was more than lockout duration ago
    if (now - attemptTracker[phone].lastAttempt > LOCKOUT_DURATION) {
      attemptTracker[phone] = {
        count: 1,
        lastAttempt: now
      };
    } else {
      attemptTracker[phone].count++;
      attemptTracker[phone].lastAttempt = now;
    }
  }
};

// Clear failed attempts on successful verification
const clearFailedAttempts = (phone) => {
  delete attemptTracker[phone];
};

// Generate cryptographically secure OTP
const generateSecureOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Clean up expired entries
const cleanupExpiredEntries = () => {
  const now = Date.now();

  // Clean up OTP storage
  Object.keys(otpStorage).forEach(phone => {
    if (otpStorage[phone].expires < now) {
      delete otpStorage[phone];
    }
  });

  // Clean up rate limit tracker
  Object.keys(rateLimitTracker).forEach(phone => {
    if (now - rateLimitTracker[phone].windowStart > RATE_LIMIT_WINDOW) {
      delete rateLimitTracker[phone];
    }
  });

  // Clean up attempt tracker
  Object.keys(attemptTracker).forEach(phone => {
    if (now - attemptTracker[phone].lastAttempt > LOCKOUT_DURATION) {
      delete attemptTracker[phone];
    }
  });
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

const generateOtp = async (req, res) => {
  console.log("generateOtp called");
  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({ success: false, message: 'Mobile number required' });
  }

  // Auto-format phone number for UK numbers only
  let formattedMobile = formatMobileNumber(mobile);

  // Validate UK phone number format
  const ukPhoneRegex = /^\+44[1-9]\d{8,9}$/;
  if (!ukPhoneRegex.test(formattedMobile)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid UK phone number format. Examples: 7386235014, 07386235014, or +447386235014'
    });
  }

  // Check if phone number is locked out
  if (isLockedOut(formattedMobile)) {
    return res.status(429).json({
      success: false,
      message: 'Too many failed attempts. Please try again after 15 minutes.'
    });
  }

  // Check rate limiting
  if (isRateLimited(formattedMobile)) {
    return res.status(429).json({
      success: false,
      message: 'Too many OTP requests. Please wait a minute before requesting again.'
    });
  }

  const otp = generateSecureOTP();

  // Store OTP with expiry
  otpStorage[formattedMobile] = {
    otp,
    expires: Date.now() + OTP_EXPIRY,
    attempts: 0 // Track attempts for this OTP
  };

  console.log("otpStorage", otpStorage);
  console.log(`OTP for ${formattedMobile}: ${otp}`);

  try {
    // Send SMS via Twilio
    const message = await client.messages.create({
      body: `Your OTP is: ${otp}. This code will expire in 5 minutes. Do not share this code with anyone.`,
      from: twilioPhone,
      to: formattedMobile
    });

    console.log(`SMS sent successfully to ${formattedMobile}. SID: ${message.sid}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      messageSid: message.sid,
      expiresIn: OTP_EXPIRY / 1000 // Send expiry time in seconds
    });

  } catch (error) {
    console.error('Error sending SMS:', error);

    // Remove OTP from storage if SMS failed
    delete otpStorage[formattedMobile];

    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
      error: error.message
    });
  }
};

const generateToken = (userId, phone) => {
  return jwt.sign(
    { userId, phone },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

const verifyOtp = async (req, res) => {
  const { mobile, otp } = req.body;
  console.log("verify otp called");
  console.log("mobile", mobile, "otp", otp);

  if (!mobile || !otp) {
    console.log("mobile or otp not provided");
    return res.status(400).json({ success: false, message: 'Mobile and OTP required' });
  }

  try {
    // Format mobile number same way as in generateOtp
    const formattedMobile = formatMobileNumber(mobile);

    // Check if phone number is locked out
    if (isLockedOut(formattedMobile)) {
      return res.status(429).json({
        success: false,
        message: 'Account temporarily locked due to too many failed attempts. Please try again after 15 minutes.'
      });
    }

    console.log("Formatted mobile:", formattedMobile);
    console.log("Current otpStorage:", otpStorage);

    const storedOtp = otpStorage[formattedMobile];
    console.log("storedOtp", storedOtp, "input otp", otp);

    if (!storedOtp) {
      recordFailedAttempt(formattedMobile);
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new OTP.'
      });
    }

    // Check if OTP has expired
    if (storedOtp.expires < Date.now()) {
      delete otpStorage[formattedMobile];
      recordFailedAttempt(formattedMobile);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    // Check if OTP matches
    if (storedOtp.otp !== otp) {
      recordFailedAttempt(formattedMobile);

      // Increment attempts for this OTP
      storedOtp.attempts++;

      // Remove OTP after 3 failed attempts
      if (storedOtp.attempts >= 3) {
        delete otpStorage[formattedMobile];
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    console.log("otp success");

    // Clear failed attempts on successful verification
    clearFailedAttempts(formattedMobile);

    // Check if user exists with formatted mobile number
    let user = await prisma.user.findUnique({
      where: { phone: formattedMobile }
    });

    // Create new user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: formattedMobile,
          name: `User_${formattedMobile.slice(-4)}`,
          email: `${formattedMobile.replace('+', '')}@pizzapp.com`,
          password: crypto.randomBytes(16).toString('hex'),
          address: 'Address not specified'
        }
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.phone);
    console.log('Generated token:', token);

    const domain = process.env.NODE_ENV === 'production'
      ? '.circlepizzapizza.co.uk'
      : 'localhost';

    // Set cookie with token
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      domain: domain
    });

    // Clean up OTP storage
    delete otpStorage[formattedMobile];

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    recordFailedAttempt(formattedMobile);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export { generateOtp, verifyOtp };