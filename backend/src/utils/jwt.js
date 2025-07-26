const jwt = require('jsonwebtoken');

const generateAccessToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d',
      issuer: 'ecommerce-api'
    }
  );
};

const generateRefreshToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
      issuer: 'ecommerce-api'
    }
  );
};

const verifyToken = (token, isRefreshToken = false) => {
  const secret = isRefreshToken 
    ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
    : process.env.JWT_SECRET;
    
  return jwt.verify(token, secret, {
    issuer: 'ecommerce-api'
  });
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken
};