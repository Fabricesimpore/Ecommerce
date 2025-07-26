# E-Commerce Platform - Burkina Faso

![CI](https://github.com/Fabricesimpore/Ecommerce/actions/workflows/backend-ci.yml/badge.svg)

A modern, production-grade e-commerce platform tailored for the Burkina Faso market, featuring multi-vendor support, mobile money integration, and local delivery management.

## 🚀 Features

- **Multi-vendor marketplace** - Support for multiple sellers
- **Mobile money integration** - Orange Money payment support
- **Delivery management** - Local driver assignment and tracking
- **Real-time updates** - Order tracking and notifications
- **Admin dashboard** - Complete platform management
- **Mobile-first design** - Optimized for mobile users

## 📁 Project Structure

```
ecommerce-platform/
├── backend/          # Node.js/Express API
├── frontend/         # React/Next.js application
├── docs/            # Documentation
└── .github/         # CI/CD workflows
```

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, PostgreSQL
- **Frontend**: React.js, Next.js
- **Authentication**: JWT
- **Payment**: Orange Money API
- **CI/CD**: GitHub Actions
- **Testing**: Jest, Supertest

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Git

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration

5. Run development server:
```bash
npm run dev
```

6. Run tests:
```bash
npm test
```

### Frontend Setup

(Coming soon)

## 📖 Documentation

- [API Documentation](docs/API.md)
- [Setup Guide](docs/SETUP.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## 🧪 Testing

✅ **Current Status: 160/160 tests passing (100% success rate)**

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## 📊 CI/CD

This project uses GitHub Actions for continuous integration. All commits to `main` and `develop` branches trigger:

- Linting
- Unit tests
- Integration tests
- Coverage reports

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- Your Name - Initial work

## 🙏 Acknowledgments

- Orange Money for payment integration
- Local delivery partners
- The open source community
