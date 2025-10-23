# PCC Auto Registration

Automate course registration at Portland Community College.

## Overview

This tool automatically registers for PCC courses at your specified registration time. Configure multiple accounts, set your desired courses, and let the script handle registration when your time slot opens.

## Features

- **Automated Registration** – Registers for courses automatically at your specified time
- **Multi-Account Support** – Manage registration for multiple PCC accounts
- **Precise Timing** – Handles registration timing down to the second
- **Simple Configuration** – Easy setup with CRNs and registration dates

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- npm (comes with Node.js)
- Valid PCC account credentials

### Installation

1. **Clone the repository**
```bash
   git clone <repo-url>
   cd pcc-auto-registration
```

2. **Install dependencies**
```bash
   npm install
```

3. **Configure your accounts**
   
   Open the configuration file and add your account details:
```javascript
   const accounts = {
     user1: {
       u: "your-username",           // PCC username
       p: "your-password",            // PCC password
       term: "202503",                // Term code (e.g., 202503 for Spring 2025)
       crns: [12345, 67890],          // Course Reference Numbers
       registrationDate: new Date("2025-11-07T08:00:00-07:00"), // Your registration time
     },
     user2: {
       // Add additional accounts as needed
     },
   };
```

4. **Run the script**
```bash
   npm start
```

## Configuration

### Example Configuration
```javascript
const accounts = {
  johnDoe: {
    u: "jdoe123",
    p: "securePassword123",
    term: "202503",
    crns: [12345, 67890, 11111],
    registrationDate: new Date("2025-11-07T08:00:00-07:00"),
  },
};
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is licensed under the MIT License

---

**Disclaimer**: This tool is for educational purposes. Users are responsible for ensuring their use complies with PCC's policies and terms of service.