import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Site from '../models/Site.js';
import Invoice from '../models/Invoice.js';
import Branch from '../models/Branch.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedAccountantData = async () => {
  try {
    await connectDB();

    // 1. Create Accountant User
    console.log('👤 Creating accountant user...');
    // Check if already exists to avoid unique constraint error if run multiple times
    await User.deleteOne({ email: 'accountant@tilal.com' });
    const accountant = await User.create({
      name: 'Accountant User',
      email: 'accountant@tilal.com',
      password: 'accountant123', // This will be hashed by the pre-save hook
      role: 'accountant',
      phone: '+966500000001',
      isActive: true
    });

    // 3. Clear previous Accountant-related demo data if necessary
    console.log('🗑️ Clearing previous invoices...');
    await Invoice.deleteMany({});
    
    // 3. Ensure we have a Branch
    let branch = await Branch.findOne();
    if (!branch) {
      console.log('🏢 Creating a default branch...');
      branch = await Branch.create({
        name: 'Main Tilal Branch',
        code: 'T001',
        address: { city: 'Riyadh' }
      });
    }

    // 4. Create a Client if none exists
    let client = await Client.findOne();
    if (!client) {
      console.log('🧑 Creating a default client...');
      client = await Client.create({
        name: 'VIP Real Estate Co.',
        email: 'info@vip-realestate.com',
        username: 'vip_client',
        password: 'password123',
        phone: '+966501112223',
        branch: branch._id,
        status: 'active'
      });
    }

    // 5. Create Sites with Payment Cycles
    console.log('🏗️ Creating sites with payment cycles...');
    const sitesData = [
      {
        name: 'Al-Nakheel Garden',
        client: client._id,
        siteType: 'commercial',
        paymentCycle: 'monthly',
        lastPaymentDate: new Date('2023-11-15'),
        nextPaymentDate: new Date('2023-12-15'),
        location: { city: 'Riyadh', address: 'Al-Nakheel District' }
      },
      {
        name: 'Diplomatic Quarter Greenery',
        client: client._id,
        siteType: 'commercial',
        paymentCycle: 'quarterly',
        lastPaymentDate: new Date('2023-09-01'),
        nextPaymentDate: new Date('2023-12-01'), // Should trigger alert if today is after Dec 1st
        location: { city: 'Riyadh', address: 'DQ Area' }
      },
      {
        name: 'Private Villa 404',
        client: client._id,
        siteType: 'residential',
        paymentCycle: 'annually',
        lastPaymentDate: new Date('2022-12-20'),
        nextPaymentDate: new Date('2023-12-20'),
        location: { city: 'Jeddah', address: 'Obhur' }
      }
    ];

    const sites = await Site.insertMany(sitesData);

    // 6. Create Historical Invoices
    console.log('📄 Creating historical invoices...');
    const invoicesData = [
      {
        invoiceNumber: 'INV-2023-001',
        client: client._id,
        site: sites[0]._id,
        total: 2500,
        subtotal: 2174,
        paymentStatus: 'paid',
        pdfUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample_pdf.pdf',
        pdfFile: { url: 'https://res.cloudinary.com/demo/image/upload/v1/sample_pdf.pdf' },
        createdAt: new Date('2023-10-15')
      },
      {
        invoiceNumber: 'INV-2023-002',
        client: client._id,
        site: sites[0]._id,
        total: 2500,
        subtotal: 2174,
        paymentStatus: 'paid',
        pdfUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample_pdf.pdf',
        pdfFile: { url: 'https://res.cloudinary.com/demo/image/upload/v1/sample_pdf.pdf' },
        createdAt: new Date('2023-11-15')
      },
      {
        invoiceNumber: 'INV-2023-003',
        client: client._id,
        site: sites[1]._id,
        total: 7500,
        subtotal: 6521,
        paymentStatus: 'pending',
        pdfUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample_pdf.pdf',
        pdfFile: { url: 'https://res.cloudinary.com/demo/image/upload/v1/sample_pdf.pdf' },
        createdAt: new Date('2023-12-01')
      },
      {
        invoiceNumber: 'INV-2023-004',
        client: client._id,
        site: sites[2]._id,
        total: 15000,
        subtotal: 13043,
        paymentStatus: 'overdue',
        pdfUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample_pdf.pdf',
        pdfFile: { url: 'https://res.cloudinary.com/demo/image/upload/v1/sample_pdf.pdf' },
        createdAt: new Date('2023-01-10')
      }
    ];

    await Invoice.insertMany(invoicesData);

    console.log('✅ Accountant demo data seeded successfully!');
    console.log(`
📊 Seeded:
  - 1 Accountant User
  - 3 Sites with cycles
  - 4 Invoices

🔑 Login Credentials:
  Email: accountant@tilal.com
  Password: accountant123
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedAccountantData();
