#!/bin/bash

echo "🚀 Setting up Online Evaluation Tools..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB is not detected. Please ensure MongoDB is installed and running."
    echo "   Visit: https://docs.mongodb.com/manual/installation/"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd client
npm install
cd ..

# Create environment file from example
if [ ! -f .env ]; then
    echo "🔧 Creating environment file..."
    cp .env.example .env
    echo "✅ Environment file created. Please update .env with your configuration."
else
    echo "✅ Environment file already exists."
fi

# Create uploads directory
mkdir -p uploads

# Create logs directory
mkdir -p logs

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update the .env file with your configuration"
echo "   2. Ensure MongoDB is running"
echo "   3. Run 'npm run dev' to start the development server"
echo "   4. Run 'cd client && npm start' to start the React development server"
echo ""
echo "🔗 API will be available at: http://localhost:5000"
echo "🔗 Client will be available at: http://localhost:3000"
echo ""

# Create a default admin user (optional)
read -p "🔐 Create a default admin user? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📝 Creating default admin user..."
    node -e "
    require('dotenv').config();
    const mongoose = require('mongoose');
    const User = require('./models/User');
    
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/evaluation-tools')
      .then(async () => {
        const adminUser = new User({
          email: process.env.ADMIN_EMAIL || 'admin@example.com',
          name: process.env.ADMIN_NAME || 'System Administrator',
          password: 'admin123',
          role: 'admin',
          provider: 'local'
        });
        
        try {
          await adminUser.save();
          console.log('✅ Admin user created successfully!');
          console.log('   Email:', adminUser.email);
          console.log('   Password: admin123');
          console.log('   ⚠️  Please change the password after first login!');
        } catch (error) {
          if (error.code === 11000) {
            console.log('ℹ️  Admin user already exists.');
          } else {
            console.log('❌ Error creating admin user:', error.message);
          }
        }
        
        process.exit(0);
      })
      .catch(err => {
        console.log('❌ Database connection error:', err.message);
        process.exit(1);
      });
    "
fi

echo ""
echo "🎉 All done! Happy coding!"