#!/usr/bin/env node

/**
 * Script to generate realistic placeholder images for the ScreenPad prototype
 * These images simulate what actual website screenshots would look like
 */

const fs = require('fs');
const path = require('path');

// Create a simple HTML template for each website
const templates = {
  'apple-store': `
    <div style="background: #000; color: #fff; padding: 20px; font-family: -apple-system, sans-serif;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; margin: 0;">Apple Store</h1>
        <p style="margin: 10px 0;">Shop online. Get free delivery.</p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
        <div style="background: #333; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="width: 60px; height: 60px; background: #666; border-radius: 50%; margin: 0 auto 10px;"></div>
          <p style="margin: 0; font-size: 14px;">iPhone</p>
        </div>
        <div style="background: #333; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="width: 60px; height: 60px; background: #666; border-radius: 50%; margin: 0 auto 10px;"></div>
          <p style="margin: 0; font-size: 14px;">Mac</p>
        </div>
        <div style="background: #333; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="width: 60px; height: 60px; background: #666; border-radius: 50%; margin: 0 auto 10px;"></div>
          <p style="margin: 0; font-size: 14px;">iPad</p>
        </div>
      </div>
    </div>
  `,
  'ticketmaster-event': `
    <div style="background: #fff; color: #333; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; margin: 0; color: #d4145a;">Ticketmaster</h1>
        <p style="margin: 10px 0; color: #666;">Event Details</p>
      </div>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
        <h2 style="margin: 0 0 15px 0; font-size: 20px;">Concert Name</h2>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span>Date: Dec 15, 2024</span>
          <span>Time: 8:00 PM</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span>Venue: Arena</span>
          <span>City: New York</span>
        </div>
        <button style="background: #d4145a; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer;">
          Buy Tickets
        </button>
      </div>
    </div>
  `,
  'airbnb-room': `
    <div style="background: #fff; color: #333; padding: 20px; font-family: -apple-system, sans-serif;">
      <div style="margin-bottom: 20px;">
        <h1 style="font-size: 20px; margin: 0 0 10px 0;">Cozy Downtown Apartment</h1>
        <p style="margin: 0; color: #666;">2 guests • 1 bedroom • 1 bath</p>
      </div>
      <div style="background: #f7f7f7; height: 120px; border-radius: 8px; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; color: #999;">
        [Room Image]
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-weight: bold; font-size: 18px;">$150</span>
          <span style="color: #666;"> / night</span>
        </div>
        <button style="background: #ff5a5f; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px;">
          Reserve
        </button>
      </div>
    </div>
  `,
  'stubhub-checkout': `
    <div style="background: #fff; color: #333; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; margin: 0; color: #e31c25;">StubHub</h1>
        <p style="margin: 10px 0; color: #666;">Checkout</p>
      </div>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <h3 style="margin: 0 0 10px 0;">Order Summary</h3>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Ticket Price:</span>
          <span>$89.00</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Service Fee:</span>
          <span>$12.50</span>
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 10px 0;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>Total:</span>
          <span>$101.50</span>
        </div>
      </div>
      <button style="background: #e31c25; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; width: 100%; cursor: pointer;">
        Complete Purchase
      </button>
    </div>
  `,
  'seatgeek-event': `
    <div style="background: #fff; color: #333; padding: 20px; font-family: -apple-system, sans-serif;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; margin: 0; color: #00c73c;">SeatGeek</h1>
        <p style="margin: 10px 0; color: #666;">Event Information</p>
      </div>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="margin: 0 0 15px 0; font-size: 20px;">Sports Game</h2>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span>Date: Jan 20, 2024</span>
          <span>Time: 7:30 PM</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span>Stadium: Arena</span>
          <span>City: Los Angeles</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span>Starting at:</span>
          <span style="font-weight: bold; color: #00c73c;">$45</span>
        </div>
        <button style="background: #00c73c; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer;">
          Find Tickets
        </button>
      </div>
    </div>
  `,
  'gametime-transfer': `
    <div style="background: #fff; color: #333; padding: 20px; font-family: -apple-system, sans-serif;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; margin: 0; color: #ff6b35;">GameTime</h1>
        <p style="margin: 10px 0; color: #666;">Transfer Tickets</p>
      </div>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h3 style="margin: 0 0 15px 0;">Transfer Details</h3>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Recipient Email:</label>
          <input type="email" placeholder="friend@example.com" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Message (optional):</label>
          <textarea placeholder="Enjoy the game!" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 60px;"></textarea>
        </div>
        <button style="background: #ff6b35; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer;">
          Transfer Tickets
        </button>
      </div>
    </div>
  `
};

// Generate HTML files for each template
const publicDir = path.join(__dirname, '..', 'public', 'playground');

// Ensure the directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating placeholder HTML files...');

Object.entries(templates).forEach(([name, html]) => {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name.replace('-', ' ').toUpperCase()}</title>
</head>
<body style="margin: 0; padding: 0;">
  ${html}
</body>
</html>
  `;
  
  const filePath = path.join(publicDir, `${name}-placeholder.html`);
  fs.writeFileSync(filePath, htmlContent);
  console.log(`Created: ${filePath}`);
});

console.log('\nPlaceholder HTML files generated successfully!');
console.log('\nNote: These are HTML templates that represent what the actual screenshots would look like.');
console.log('In a real implementation, these would be actual screenshots captured from the live websites.');
