// controllers/otpController.js
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import crypto from 'crypto';
import dotenv from 'dotenv'
import { log } from 'console';

let otpStorage = {};

const generateOtp = async (req, res) => {
  const { mobile } = req.body;
  
  if (!mobile) {
    return res.status(400).json({ success: false, message: 'Mobile number required' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store OTP for 5 minutes
  otpStorage[mobile] = {
    otp,
    expires: Date.now() + 300000
  };
  console.log("otpStorage", otpStorage)

  console.log(`OTP for ${mobile}: ${otp}`);
  res.status(200).json({ success: true });
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
   console.log("verify otp called")
    console.log("mobile", mobile, "otp", otp)
    if (!mobile || !otp) {
       console.log("mobile or otp not provided")

      return res.status(400).json({ success: false, message: 'Mobile and OTP required' });
     
    }
  
    try {
      const storedOtp = otpStorage[mobile];
      console.log("storedOtp", storedOtp, "otp", otp);
      
      if (!storedOtp || storedOtp.expires < Date.now() || storedOtp.otp !== otp) {
        console.log("otp not valid or expired")
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid or expired OTP' 
        });
      }
   console.log("otp success")
      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { phone: mobile }
      });
     
      // Create new user if doesn't exist
      if (!user) {
        user = await prisma.user.create({
          data: {
            phone: mobile,
            name: `User_${mobile.slice(-4)}`, // Default name
            email: `${mobile}@pizzapp.com`, // Temporary email
            password: crypto.randomBytes(16).toString('hex'), // Random password
            address: 'Address not specified' // Default address
          }
        });
      }
  
      // Generate JWT token
      const token = generateToken(user.id, user.phone);
      console.log('Generated token:', token);
  
      // Set cookie with token
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Changed from 'strict'
        maxAge: 24 * 60 * 60 * 1000,
        domain: 'localhost' // Add this for local development
      });
      
      delete otpStorage[mobile];
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