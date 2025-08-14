# Veyro - Billing. Tracking. Done Right.

Veyro is a comprehensive business management system designed for the transport industry. It simplifies client management, bill generation, and payment tracking to help you run your business more efficiently.

## Features

- **Dashboard**: Get a real-time overview of your business with key stats on bills, payments, and clients.
- **Client Management**: Keep all your client information in one place for easy access and management.
- **Bill Generation**: Create and manage detailed bills for your services.
- **Payment Tracking**: Track the status of all payments and manage outstanding balances.
- **Reporting**: Generate insightful reports to understand your business performance.

## Tech Stack

This project is built with a modern and robust tech stack:

- **Vite**: A next-generation frontend tooling that provides a faster and leaner development experience.
- **React**: A JavaScript library for building user interfaces.
- **TypeScript**: A strongly typed programming language that builds on JavaScript.
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
- **shadcn/ui**: A collection of beautifully designed, accessible UI components.
- **Supabase**: An open-source Firebase alternative for building secure and scalable backends.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or later)
- npm

### Installation

1.  **Clone the repo**
    ```sh
    git clone [https://github.com/your_username_/veyro.git](https://github.com/jaiswalism/veyro.git)
    ```
2.  **Install NPM packages**
    ```sh
    npm install
    ```
3.  **Set up your environment variables**

    Create a `.env.local` file in the root of your project and add your Supabase credentials:

    ```
    VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
    VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_SUPABASE_PUBLISHABLE_KEY"
    ```

4.  **Run the development server**
    ```sh
    npm run dev
    ```

    Open [http://localhost:8080](http://localhost:8080) to view it in the browser.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request