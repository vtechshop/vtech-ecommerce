# Communication Hub - Complete Guide

## Overview

The Communication Hub is a centralized admin dashboard section that displays all customer interactions and communications from multiple channels (WhatsApp, Email, SMS, Marketing) in one unified interface.

## Features Implemented

### 1. Multi-Channel Support
- **WhatsApp** - Customer queries and responses
- **Email** - Email communications
- **SMS** - Text message notifications
- **Marketing** - Campaign messages
- **Support** - Support ticket communications
- **Notifications** - System notifications

### 2. Message Tracking
- **Direction**: Track incoming and outgoing messages
- **Status**: Monitor message lifecycle (pending → sent → delivered → read/failed)
- **Timestamps**: Track when messages are sent, delivered, and read
- **User Association**: Link messages to user accounts

### 3. Admin Dashboard Features
- **Statistics Cards**:
  - Total communications count
  - Last 24 hours activity
  - Breakdown by message type
  - Failed messages count

- **Advanced Filtering**:
  - Filter by type (WhatsApp, Email, SMS, etc.)
  - Filter by status (pending, sent, delivered, failed, read)
  - Filter by direction (incoming/outgoing)
  - Search by content, from, to fields
  - Date range filtering

- **Message Management**:
  - View full message details in modal
  - Delete messages
  - See message metadata (campaign ID, order ID, etc.)
  - View attachments

### 4. Visual Design
- Color-coded icons for each channel type
- Status badges with color indicators
- Responsive table layout
- Pagination support
- Modal for detailed message view

## Database Schema

### Communication Model
Location: `E:\Project-4\Ecommerce_patched_v2\shop\apps\api\src\models\Communication.js`

```javascript
{
  type: String, // 'whatsapp', 'email', 'sms', 'marketing', 'notification', 'support'
  direction: String, // 'incoming', 'outgoing'
  status: String, // 'pending', 'sent', 'delivered', 'failed', 'read'
  from: String, // Sender identifier (email, phone, etc.)
  fromName: String,
  to: String, // Recipient identifier
  toName: String,
  userId: ObjectId, // Reference to User model
  subject: String,
  message: String, // Plain text message
  htmlContent: String, // HTML version for emails

  metadata: {
    channel: String,
    messageId: String,
    threadId: String,
    campaignId: String,
    orderId: ObjectId,
    templateId: String
  },

  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  failedAt: Date,
  errorMessage: String,

  attachments: [{
    filename: String,
    url: String,
    type: String,
    size: Number
  }],

  tags: [String],
  priority: String, // 'low', 'normal', 'high', 'urgent'
  notes: String,
  replyTo: ObjectId // Reference to parent message
}
```

## API Endpoints

### Base URL: `/api/communications`
All endpoints require admin authentication.

### 1. Get All Communications
```
GET /api/communications
```

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `type` - Filter by type (whatsapp, email, sms, marketing, etc.)
- `status` - Filter by status
- `direction` - Filter by direction (incoming/outgoing)
- `search` - Search in message, from, to fields
- `startDate` - Filter from date
- `endDate` - Filter to date

**Response**:
```json
{
  "success": true,
  "data": {
    "communications": [...],
    "total": 150,
    "page": 1,
    "pages": 8
  }
}
```

### 2. Get Statistics
```
GET /api/communications/stats
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 150,
    "last24h": 23,
    "failed": 5,
    "byType": {
      "email": 80,
      "whatsapp": 40,
      "sms": 20,
      "marketing": 10
    },
    "byStatus": {
      "sent": 100,
      "delivered": 80,
      "failed": 5,
      "pending": 15
    }
  }
}
```

### 3. Get Communication by ID
```
GET /api/communications/:id
```

### 4. Update Communication
```
PUT /api/communications/:id
```

**Body**:
```json
{
  "status": "delivered",
  "deliveredAt": "2025-01-15T10:30:00Z",
  "notes": "Delivered successfully"
}
```

### 5. Delete Communication
```
DELETE /api/communications/:id
```

### 6. Send Messages

#### Send WhatsApp
```
POST /api/communications/send/whatsapp
```

**Body**:
```json
{
  "to": "+1234567890",
  "toName": "John Doe",
  "message": "Your order has been shipped!",
  "userId": "user_id_here",
  "metadata": {
    "orderId": "order_id_here"
  }
}
```

#### Send Email
```
POST /api/communications/send/email
```

**Body**:
```json
{
  "to": "customer@example.com",
  "toName": "John Doe",
  "subject": "Order Confirmation",
  "message": "Plain text version",
  "htmlContent": "<h1>Order Confirmed</h1>",
  "userId": "user_id_here",
  "attachments": [...]
}
```

#### Send SMS
```
POST /api/communications/send/sms
```

**Body**:
```json
{
  "to": "+1234567890",
  "toName": "John Doe",
  "message": "Your OTP is 123456",
  "userId": "user_id_here"
}
```

#### Send Marketing Campaign
```
POST /api/communications/send/campaign
```

**Body**:
```json
{
  "recipients": ["email1@example.com", "email2@example.com"],
  "subject": "Special Offer!",
  "message": "Plain text",
  "htmlContent": "<html>...</html>",
  "metadata": {
    "campaignId": "campaign_id_here"
  }
}
```

## Frontend Implementation

### Admin Page
Location: `E:\Project-4\Ecommerce_patched_v2\shop\apps\web\src\assets\pages\dashboard\admin\Communications.jsx`

**Features**:
- Statistics dashboard
- Filter controls
- Paginated table
- Message details modal
- Delete functionality

**Usage**:
1. Navigate to `/admin-dashboard/communications` (admin only)
2. View statistics at the top
3. Use filters to narrow down messages
4. Click on any row to view full message details
5. Delete messages as needed

### Integration Points

#### 1. App Routes
File: `E:\Project-4\Ecommerce_patched_v2\shop\apps\web\src\App.jsx`
```javascript
import AdminCommunications from './assets/pages/dashboard/admin/Communications';
// ...
<Route path="communications" element={<AdminCommunications />} />
```

#### 2. Sidebar Menu
File: `E:\Project-4\Ecommerce_patched_v2\shop\apps\web\src\assets\components\layout\DashboardLayout.jsx`
```javascript
{ path: '/admin-dashboard/communications', label: 'Communications', icon: 'message' }
```

#### 3. API Routes
File: `E:\Project-4\Ecommerce_patched_v2\shop\apps\api\src\app.js`
```javascript
app.use('/api/communications', require('./routes/communication'));
```

## How It Works

### 1. Message Flow

#### Outgoing Message (Admin sends to customer):
1. Admin clicks "Send Message" in dashboard
2. Frontend calls POST `/api/communications/send/{type}`
3. Backend creates Communication record with status "pending"
4. Integration service (WhatsApp API, SendGrid, Twilio) sends message
5. Status updates to "sent" → "delivered" → "read"
6. Timestamps are recorded at each stage

#### Incoming Message (Customer sends to admin):
1. Webhook receives message from external service (WhatsApp, Email server, etc.)
2. Webhook handler creates Communication record with direction "incoming"
3. Message appears in admin dashboard immediately
4. Admin can view and respond

### 2. Real-World Integration Example

#### WhatsApp Business API Integration
```javascript
// In communicationController.js
const sendWhatsAppMessage = async (to, message) => {
  const response = await axios.post(
    'https://graph.facebook.com/v18.0/YOUR_PHONE_ID/messages',
    {
      messaging_product: 'whatsapp',
      to: to,
      text: { body: message }
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.messages[0].id; // messageId
};
```

#### Email Integration (SendGrid)
```javascript
const sendEmail = async (to, subject, htmlContent) => {
  const msg = {
    to: to,
    from: 'noreply@yourstore.com',
    subject: subject,
    html: htmlContent,
  };

  await sgMail.send(msg);
};
```

#### SMS Integration (Twilio)
```javascript
const sendSMS = async (to, message) => {
  const twilioMessage = await twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: to
  });

  return twilioMessage.sid;
};
```

## Future Enhancements

### Phase 1 (Immediate)
- [ ] Integrate WhatsApp Business API
- [ ] Integrate SendGrid for emails
- [ ] Integrate Twilio for SMS
- [ ] Set up webhooks for incoming messages

### Phase 2 (Short-term)
- [ ] Real-time updates using WebSockets
- [ ] Message templates library
- [ ] Bulk message sending
- [ ] Export communications (CSV/PDF)
- [ ] Advanced search and filtering

### Phase 3 (Long-term)
- [ ] AI-powered message categorization
- [ ] Automated responses
- [ ] Customer sentiment analysis
- [ ] Performance analytics and reports
- [ ] Integration with CRM systems

## Testing the Feature

### 1. Create Sample Communications
Use MongoDB Compass or a test script:

```javascript
// Insert sample communications
db.communications.insertMany([
  {
    type: 'email',
    direction: 'outgoing',
    status: 'delivered',
    from: 'noreply@yourstore.com',
    fromName: 'YourStore',
    to: 'customer@example.com',
    toName: 'John Doe',
    subject: 'Order Confirmation',
    message: 'Your order #12345 has been confirmed.',
    sentAt: new Date(),
    deliveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    type: 'whatsapp',
    direction: 'incoming',
    status: 'read',
    from: '+1234567890',
    fromName: 'Jane Smith',
    to: '+0987654321',
    toName: 'Support',
    message: 'Where is my order?',
    sentAt: new Date(),
    readAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);
```

### 2. Test the Admin Dashboard
1. Login as admin
2. Navigate to `/admin-dashboard/communications`
3. Verify statistics are displayed
4. Test filters
5. Click on a message to view details
6. Test delete functionality

### 3. Test API Endpoints
```bash
# Get all communications
curl -X GET http://localhost:5000/api/communications \
  -H "Cookie: token=your_admin_token"

# Get statistics
curl -X GET http://localhost:5000/api/communications/stats \
  -H "Cookie: token=your_admin_token"

# Send test email
curl -X POST http://localhost:5000/api/communications/send/email \
  -H "Content-Type: application/json" \
  -H "Cookie: token=your_admin_token" \
  -d '{
    "to": "test@example.com",
    "subject": "Test",
    "message": "This is a test message"
  }'
```

## Troubleshooting

### Issue: Communications not showing
- Check if backend is running
- Verify admin authentication
- Check browser console for errors
- Verify API endpoint is accessible

### Issue: Statistics not updating
- Refresh the page
- Check MongoDB connection
- Verify data exists in database

### Issue: Send message fails
- Check API integration credentials (WhatsApp token, SendGrid key, etc.)
- Verify recipient information is correct
- Check backend logs for errors

## Security Considerations

1. **Admin Only Access**: All endpoints require admin role
2. **Input Validation**: All inputs are validated and sanitized
3. **Rate Limiting**: API endpoints are rate-limited
4. **Data Privacy**: Customer data is protected and encrypted
5. **Audit Trail**: All communications are logged with timestamps

## Conclusion

The Communication Hub provides a complete solution for managing all customer communications from a single dashboard. It's designed to be extensible and can integrate with any third-party communication service.

The current implementation provides the foundation and UI, with placeholders for actual API integrations. Once you integrate with WhatsApp Business API, SendGrid, and Twilio, the system will be fully functional for production use.
