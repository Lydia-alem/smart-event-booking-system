require('dotenv').config();
const mongoose = require('mongoose');
const { User, USER_ROLES, USER_STATUS } = require('./src/models/User');
const { Event, EVENT_STATUS, EVENT_CATEGORIES } = require('./src/models/Event');

const seedDB = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sebs');
        console.log('Connected!');

        console.log('Clearing existing data...');
        await User.deleteMany({});
        await Event.deleteMany({});

        console.log('Creating users...');
        const user1 = await User.create({
            firstName: 'John',
            lastName: 'Doe',
            email: 'user@example.com',
            password: 'password123',
            role: USER_ROLES.USER,
            status: USER_STATUS.ACTIVE
        });

        const organizer1 = await User.create({
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'organizer@example.com',
            password: 'password123',
            role: USER_ROLES.ORGANIZER,
            status: USER_STATUS.ACTIVE,
            organizationName: 'VisionX Events Co'
        });

        console.log('Creating events...');
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await Event.create({
            title: 'VisionX Tech Conference',
            description: 'Join the biggest tech conference of the year. Featuring top speakers from around the world.',
            category: EVENT_CATEGORIES.CONFERENCE,
            startDate: nextWeek,
            endDate: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
            location: {
                venue: 'Tech Plaza',
                address: { city: 'San Francisco', country: 'USA' }
            },
            capacity: 500,
            availableTickets: 500,
            price: 199.99,
            organizer: organizer1._id,
            status: EVENT_STATUS.APPROVED
        });

        await Event.create({
            title: 'React Native Workshop',
            description: 'Learn how to build cross-platform mobile apps with React Native in this intensive 1-day workshop.',
            category: EVENT_CATEGORIES.WORKSHOP,
            startDate: nextMonth,
            endDate: new Date(nextMonth.getTime() + 1 * 24 * 60 * 60 * 1000),
            location: {
                venue: 'Code Hub',
                address: { city: 'New York', country: 'USA' },
                isOnline: true
            },
            capacity: 50,
            availableTickets: 50,
            price: 49.99,
            organizer: organizer1._id,
            status: EVENT_STATUS.APPROVED
        });

        await Event.create({
            title: 'Music Festival 2026',
            description: 'An outdoor music festival featuring various indie and rock bands.',
            category: EVENT_CATEGORIES.CONCERT,
            startDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 62 * 24 * 60 * 60 * 1000),
            location: {
                venue: 'Central Park',
                address: { city: 'Chicago', country: 'USA' }
            },
            capacity: 2000,
            availableTickets: 2000,
            price: 0, // Free event
            organizer: organizer1._id,
            status: EVENT_STATUS.APPROVED
        });

        console.log('Database seeded successfully!');
        console.log('\n--- Test Credentials ---');
        console.log('User Login: user@example.com / password123');
        console.log('Organizer Login: organizer@example.com / password123');
        console.log('------------------------\n');

        process.exit(0);
    } catch (err) {
        console.error('Error seeding DB:', err);
        process.exit(1);
    }
};

seedDB();
