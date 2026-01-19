# Copilot SDK Samples - Frontend Showcase

A React + TypeScript frontend showcasing the Copilot SDK samples catalog, built with the Foundry NextGen design system.

## Getting Started

```bash
cd frontend
pnpm install
pnpm dev
```

The application will be available at http://localhost:5173

## Features

- **Demo Catalog**: Browse all Copilot SDK samples from `samples/catalog.json`
- **Tier Filtering**: Filter demos by category (Mandatory, ISV Tier 1, ISV Tier 2)
- **Status Badges**: Visual indicators for implemented vs. planned demos
- **Connector Badges**: Shows which services each demo integrates with
- **Responsive Design**: Mobile-friendly layout

## Design System

This frontend follows the Microsoft Foundry NextGen design language:

- **Dark Theme**: Neutral dark greys (#0A0A0A, #141414, #1C1C1C)
- **Purple Accents**: Used sparingly for primary actions and active states only
- **Typography**: System fonts with clear hierarchy
- **Components**: Cards, badges, and sidebar navigation

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Badge.tsx       # Status and feature badges
│   │   ├── DemoCard.tsx    # Individual demo card
│   │   ├── Header.tsx      # App header
│   │   └── Sidebar.tsx     # Navigation and filtering
│   ├── types.ts            # TypeScript types
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css          # Foundry NextGen design tokens
├── public/
│   └── catalog.json       # Demo catalog data
└── package.json
```

## Build

```bash
pnpm build
```

## Preview Production Build

```bash
pnpm preview
```
