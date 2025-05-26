#!/usr/bin/env node

import { DatabaseService } from './api/services/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugAPI() {
    console.log('🔍 Debugging API connectivity...\n');
    
    // Check environment variables
    console.log('📋 Environment Check:');
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Missing'}`);
    console.log(`PORT: ${process.env.PORT || '3000'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}\n`);
    
    // Check database connection
    console.log('🗄️  Database Connection Test:');
    try {
        const db = new DatabaseService();
        const healthResult = await db.healthCheck();
        console.log('✅ Database connection successful');
        console.log(`   Current time: ${healthResult.current_time}\n`);
        
        // Test event insertion
        console.log('📝 Event Insertion Test:');
        const testEvent = {
            event_type: 'debug_test',
            session_id: 'sess_debug_' + Date.now(),
            user_id: 'user_debug_' + Date.now(),
            tracking_mode: 'cookie',
            timestamp: Date.now(),
            server_timestamp: Date.now(),
            page_url: 'http://localhost:3000/debug',
            client_ip: '127.0.0.1',
            user_agent: 'Debug Script',
            request_id: 'req_debug_' + Date.now()
        };
        
        const result = await db.insertEvent(testEvent);
        console.log('✅ Event insertion successful');
        console.log(`   Event ID: ${result.id}\n`);
        
        await db.close();
        
    } catch (error) {
        console.log('❌ Database error:');
        console.log(`   Error: ${error.message}`);
        console.log(`   Code: ${error.code || 'N/A'}`);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Solution: Start PostgreSQL database:');
            console.log('   cd database && docker compose up -d');
        } else if (error.code === '28P01') {
            console.log('\n💡 Solution: Check database credentials in .env');
        }
        console.log('');
    }
    
    // Check API server endpoint
    console.log('🌐 API Server Test:');
    try {
        const response = await fetch('http://localhost:3000/api/health');
        if (response.ok) {
            const health = await response.json();
            console.log('✅ API server is running');
            console.log(`   Status: ${health.status}`);
            console.log(`   Uptime: ${Math.round(health.uptime)}s\n`);
        } else {
            console.log(`❌ API server responded with: ${response.status}`);
        }
    } catch (error) {
        console.log('❌ API server error:');
        console.log(`   Error: ${error.message}`);
        console.log('\n💡 Solution: Start the development server:');
        console.log('   npm run dev');
        console.log('');
    }
    
    // Test event posting
    console.log('📤 Event POST Test:');
    try {
        const testPayload = {
            event_type: 'api_test',
            session_id: 'sess_api_test_' + Date.now(),
            user_id: 'user_api_test_' + Date.now(),
            tracking_mode: 'cookie',
            timestamp: Date.now(),
            page_url: 'http://localhost:3000/debug'
        };
        
        const response = await fetch('http://localhost:3000/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testPayload)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Event POST successful');
            console.log(`   Event ID: ${result.eventId}`);
        } else {
            const error = await response.json();
            console.log(`❌ Event POST failed: ${response.status}`);
            console.log(`   Error: ${error.error}`);
            if (error.details) {
                console.log(`   Details: ${JSON.stringify(error.details, null, 2)}`);
            }
        }
    } catch (error) {
        console.log('❌ Event POST error:');
        console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n🎯 Summary:');
    console.log('If you see any ❌ errors above, those are likely causing the POST errors in your browser.');
    console.log('Fix the issues and restart your development server with: npm run dev');
}

debugAPI().catch(console.error);