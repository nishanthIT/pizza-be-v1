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
const twilioPhone = process.env.TWILIO_PHONE_NUMBER; // Your Twilio phone number  


const client = twilio(accountSid, authToken);

let otpStorage = {};

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

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store OTP for 5 minutes (use formatted mobile number)
  otpStorage[formattedMobile] = {
    otp,
    expires: Date.now() + 300000
  };
  
  console.log("otpStorage", otpStorage);
  console.log(`OTP for ${formattedMobile}: ${otp}`);

  try {
    // Send SMS via Twilio
    const message = await client.messages.create({
      body: `Your OTP is: ${otp}. This code will expire in 5 minutes.`,
      from: twilioPhone,
      to: formattedMobile
    });

    console.log(`SMS sent successfully to ${formattedMobile}. SID: ${message.sid}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully',
      messageSid: message.sid 
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
    
    console.log("Formatted mobile:", formattedMobile);
    console.log("Current otpStorage:", otpStorage);
    
    const storedOtp = otpStorage[formattedMobile];
    console.log("storedOtp", storedOtp, "input otp", otp);
    
    if (!storedOtp || storedOtp.expires < Date.now() || storedOtp.otp !== otp) {
      console.log("otp not valid or expired");
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired OTP' 
      });
    }
    
    console.log("otp success");
    
    // Check if user exists with formatted mobile number
    let user = await prisma.user.findUnique({
      where: { phone: formattedMobile }
    });
   
    // Create new user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: formattedMobile, // Store formatted number in database
          name: `User_${formattedMobile.slice(-4)}`, // Default name
          email: `${formattedMobile.replace('+', '')}@pizzapp.com`, // Temporary email
          password: crypto.randomBytes(16).toString('hex'), // Random password
          address: 'Address not specified' // Default address
        }
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.phone);
    console.log('Generated token:', token);

    const domain = process.env.NODE_ENV === 'production' 
    ? '.circlepizzapizza.co.uk' // Leading dot for subdomains
    : 'localhost';
    // Set cookie with token
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      domain: domain // Use environment variable for domain
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
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

export { generateOtp, verifyOtp };