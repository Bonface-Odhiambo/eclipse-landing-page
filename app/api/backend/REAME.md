# Eclipse Writers Backend

Eclipse Writers is a platform that connects employers with skilled writers and provides editorial services for academic and professional writing projects.

## Features

- User authentication (local and Auth0)
- Role-based access control (Admin, Employer, Writer, Editor)
- Order management system
- Wallet and payment integration with IntaSend
- Real-time chat and notifications
- Dispute resolution system
- Analytics and reporting

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v14.x or later)
- npm (v6.x or later)
- MongoDB (v4.x or later)
- IntaSend account for payment processing

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/eclipse-writers-backend.git
   cd eclipse-writers-backend
   ```

2. Install the dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add the necessary environment variables (refer to the Configuration section below).

4. Start the MongoDB service on your machine.

5. Run the development server:
   ```
   npm run dev
   ```

## Configuration

Create a `.env` file in the root directory with the following variables:

```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/eclipse-writers
JWT_SECRET=your_jwt_secret
Auth0_CLIENT_ID=your_auth0_client_id
Auth0_CLIENT_SECRET=your_auth0_client_secret
INTASEND_PUBLISHABLE_KEY=your_intasend_publishable_key
INTASEND_SECRET_KEY=your_intasend_secret_key
EMAIL_USER=seclipsewriters@gmail.com
EMAIL_PASS=your_email_password
FRONTEND_URL=http://localhost:3000
```

Replace the placeholder values with your actual configuration details.

## Usage

To start the server, run:

```
npm start
```

The API will be available at `http://localhost:5000` (or the port you specified in the .env file).

## API Endpoints

- `/api/auth`: Authentication routes (register, login, Auth0)
- `/api/user`: User profile management
- `/api/order`: Order creation, management, and bidding
- `/api/payment`: Payment processing and wallet management
- `/api/admin`: Admin dashboard and site management

For detailed API documentation, please refer to the [API Documentation](link-to-your-api-docs).

## Testing

To run the test suite, use the following command:

```
npm test
```

## Deployment

Instructions for deploying the application to a production environment:

1. Set up a MongoDB database (e.g., MongoDB Atlas)
2. Configure environment variables for production
3. Build the application: `npm run build`
4. Start the server: `npm start`

## Contributing

Contributions to the Eclipse Writers project are welcome. Please follow these steps:

1. Fork the repository
2. Create a new branch: `git checkout -b feature-branch-name`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-branch-name`
5. Create a pull request

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

If you have any questions or feedback, please contact us at support@eclipsewriters.com.