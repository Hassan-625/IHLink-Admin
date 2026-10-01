# IHLink Administration / Command Center

Central administrative control plane for the IHLink ecosystem.

## Platform role

- **Platform key:** `admin`
- **Frontend:** standalone repository
- **Backend:** shared IHLink Supabase project
- **Administration:** IHLink Command Center
- **Deployment:** Vercel

## Core capabilities

- Cross-platform operational oversight
- User, role and platform-access administration
- Platform-specific administration surfaces
- Pricing, service and workflow controls
- Account-deletion review and governance workflows
- Central visibility into specialist business operations

## Architecture

This repository is for authorized IHLink administration. It is not a customer-facing service site and should never be used as a fallback destination for a platform's Open Site action.

The frontend uses the shared IHLink authentication and application backend while retaining platform-specific routes, authorization and customer experience.

## Technology

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Supabase
- Vercel

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Where available, run type checking and linting before release:

```bash
npm run typecheck
npm run lint
```

## Environment and secrets

Client configuration is supplied through environment variables such as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, together with platform-origin variables where required for cross-platform handoff.

Never commit service-role keys, payment/provider credentials, webhook secrets, private API keys or production credentials to this repository.

## IHLink ecosystem integration

This platform participates in the shared IHLink account and backend architecture. Access to one platform does not automatically grant access to every IHLink platform. The Command Center provides authorized central oversight while customer-facing applications remain standalone.

## Security

Protected data is governed by Supabase Row Level Security and server-side workflows. Sensitive operations such as payment settlement, privileged administration and account lifecycle actions must be verified server-side.

## Deployment

Production is deployed through the IHLink Vercel team. Production environment variables must be configured in Vercel and releases should be verified after deployment before being treated as live.

## Ownership

**IHLink Co. Ltd.**  
Copyright © 2026 IHLink Co. Ltd. All rights reserved.
