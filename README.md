# Collaborative Spreadsheet

A lightweight real-time collaborative spreadsheet web application built with Next.js 14, TypeScript, Tailwind CSS, and Firebase.

## Features

- **Document Dashboard**: List, create, and open spreadsheet documents
- **Spreadsheet Editor**: Grid layout with numbered rows and lettered columns
- **Real-time Collaboration**: Multiple users can edit simultaneously with instant updates
- **Formula Support**: Basic formulas including SUM, addition, subtraction, multiplication, and division
- **Write State Indicator**: Shows saving/saved status
- **Presence System**: Displays active users with their names and colors
- **Google Authentication**: Secure sign-in with Firebase Auth
- **CSV Export**: Download spreadsheets as CSV files

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Firebase** (Firestore + Firebase Auth)
- **Vercel** for deployment

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd collaborative-spreadsheet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication with Google provider
   - Create a Firestore database
   - Copy your Firebase configuration

4. **Create environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Architectural Decisions

### 1. Formula Parser Depth
The formula parser (found in `src/app/utils/formulas.ts`) is designed to be lightweight and performant. 
- **Decisions**: I implemented support for `=SUM`, basic arithmetic (`+`, `-`, `*`, `/`), and cell references.
- **Justification**: For a "stripped to its bones" collaborative tool, a custom recursive descent parser would be overkill. I used a combination of regular expressions and the `Function` constructor (safely wrapped) to evaluate expressions. This approach provides the flexibility needed for the requested features without adding unnecessary complexity or large third-party dependencies.

### 2. State and Conflict Handling
- **State Location**: The source of truth for all document data resides in **Cloud Firestore**. 
- **Conflict Handling**: Leveraging Firestore's `onSnapshot` for real-time listeners ensures that clients are always in sync. Conflicts are handled via the **Last-Write-Wins (LWW)** model. For a spreadsheet of this scale, LWW provides a sufficiently predictable user experience while keeping the implementation simple and robust compared to complex Operational Transformation (OT) or CRDT implementations.

### 3. Hydration and Performance
- **Hydration**: Next.js hydration mismatches (common with dates/times) were resolved by ensuring that locale-specific strings are only rendered after the component has mounted on the client.
- **Strict TypeScript**: The project maintains 100% TypeScript compliance with no ignored errors, ensuring stability during Vercel deployments.

## Usage
... (existing content) ...

## Project Structure

```
src/
├── app/
│   ├── components/          # React components
│   │   ├── Dashboard.tsx
│   │   ├── SpreadsheetGrid.tsx
│   │   ├── Toolbar.tsx
│   │   └── PresenceList.tsx
│   ├── context/            # React context
│   │   └── AuthContext.tsx
│   ├── firebase/           # Firebase configuration
│   │   ├── config.ts
│   │   ├── auth.ts
│   │   ├── firestore.ts
│   │   └── types.ts
│   ├── utils/              # Utility functions
│   │   └── formulas.ts
│   ├── spreadsheet/[id]/   # Dynamic spreadsheet pages
│   └── page.tsx           # Dashboard page
└── layout.tsx             # Root layout
```

## Deployment

Deploy to Vercel:

1. **Connect your repository** to Vercel
2. **Add environment variables** in Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy your app

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).
